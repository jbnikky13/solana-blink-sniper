import { useState, useCallback, useRef } from 'react';
import { QUICKNODE_PROXY } from '../config';

// Known program IDs relevant for sniping
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const RAYDIUM_AMM = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
const ORCA_WHIRLPOOL = 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc';
const JUPITER_V6 = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';

const NEW_TOKEN_PROGRAMS = new Set([TOKEN_PROGRAM, TOKEN_2022_PROGRAM]);

async function rpc(method, params = []) {
  const res = await fetch(QUICKNODE_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${method} failed: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || 'RPC error');
  return json.result;
}

function classifyTx(tx) {
  if (!tx?.transaction?.message?.accountKeys) return { type: 'unknown', programs: [] };

  const accounts = tx.transaction.message.accountKeys.map(k =>
    typeof k === 'string' ? k : k.pubkey
  );

  const programs = [];
  if (accounts.some(a => a === RAYDIUM_AMM)) programs.push('Raydium');
  if (accounts.some(a => a === ORCA_WHIRLPOOL)) programs.push('Orca');
  if (accounts.some(a => a === JUPITER_V6)) programs.push('Jupiter');
  if (accounts.some(a => NEW_TOKEN_PROGRAMS.has(a))) programs.push('Token');

  let type = 'transfer';
  if (programs.includes('Raydium') || programs.includes('Orca')) type = 'swap';
  if (programs.includes('Jupiter')) type = 'swap';
  if (programs.includes('Token') && !programs.includes('Raydium') && !programs.includes('Orca')) type = 'token_op';

  return { type, programs };
}

export function useSolanaScanner() {
  const [blocks, setBlocks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [networkStats, setNetworkStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const abortRef = useRef(false);

  const scan = useCallback(async () => {
    setLoading(true);
    setError(null);
    abortRef.current = false;

    try {
      // Fetch current slot and performance samples in parallel
      const [currentSlot, perfSamples, epochInfo] = await Promise.all([
        rpc('getSlot'),
        rpc('getRecentPerformanceSamples', [4]),
        rpc('getEpochInfo'),
      ]);

      if (abortRef.current) return;

      // Calculate TPS from perf samples
      const avgTps = perfSamples.length > 0
        ? Math.round(perfSamples.reduce((sum, s) => sum + (s.numTransactions / s.samplePeriodSecs), 0) / perfSamples.length)
        : 0;

      setNetworkStats({
        slot: currentSlot,
        tps: avgTps,
        epoch: epochInfo?.epoch,
        slotIndex: epochInfo?.slotIndex,
        slotsInEpoch: epochInfo?.slotsInEpoch,
      });

      // Fetch 10 most recent blocks
      const slots = Array.from({ length: 10 }, (_, i) => currentSlot - i);

      // Get block info for each slot
      const blockResults = await Promise.allSettled(
        slots.map(slot =>
          rpc('getBlock', [slot, {
            encoding: 'json',
            transactionDetails: 'signatures',
            rewards: false,
            maxSupportedTransactionVersion: 0,
          }])
        )
      );

      if (abortRef.current) return;

      const validBlocks = blockResults
        .map((r, i) => ({ slot: slots[i], result: r }))
        .filter(b => b.result.status === 'fulfilled' && b.result.value)
        .map(b => ({
          slot: b.slot,
          blockTime: b.result.value.blockTime,
          txCount: b.result.value.transactions?.length ?? 0,
          signatures: (b.result.value.transactions || []).slice(0, 5).map(t =>
            typeof t === 'string' ? t : t.transaction?.signatures?.[0]
          ).filter(Boolean),
          blockhash: b.result.value.blockhash,
          parentSlot: b.result.value.parentSlot,
        }));

      setBlocks(validBlocks);

      // Pick top signatures from first 3 blocks and fetch transaction details
      const sigPool = validBlocks.slice(0, 3).flatMap(b => b.signatures).slice(0, 15);

      if (sigPool.length === 0) {
        setTransactions([]);
        setLastScan(new Date());
        return;
      }

      const txDetails = await Promise.allSettled(
        sigPool.map(sig =>
          rpc('getTransaction', [sig, {
            encoding: 'json',
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          }])
        )
      );

      if (abortRef.current) return;

      const parsedTxs = txDetails
        .map((r, i) => ({ sig: sigPool[i], result: r }))
        .filter(t => t.result.status === 'fulfilled' && t.result.value)
        .map(t => {
          const tx = t.result.value;
          const { type, programs } = classifyTx(tx);
          const accounts = tx?.transaction?.message?.accountKeys || [];
          const signerPubkey = typeof accounts[0] === 'string' ? accounts[0] : accounts[0]?.pubkey;
          const fee = tx?.meta?.fee ?? 0;
          const err = tx?.meta?.err;

          // Extract token balances for swap/token ops
          const preBalances = tx?.meta?.preTokenBalances || [];
          const postBalances = tx?.meta?.postTokenBalances || [];
          const involvedMints = [
            ...preBalances.map(b => b.mint),
            ...postBalances.map(b => b.mint),
          ].filter(Boolean);
          const uniqueMints = [...new Set(involvedMints)];

          return {
            sig: t.sig,
            slot: tx.slot,
            blockTime: tx.blockTime,
            type,
            programs,
            signer: signerPubkey,
            fee,
            err,
            mints: uniqueMints,
            preTokenBalances: preBalances,
            postTokenBalances: postBalances,
          };
        });

      setTransactions(parsedTxs);
      setLastScan(new Date());
    } catch (err) {
      if (!abortRef.current) {
        setError(err.message || 'Scan failed. Check your QuickNode endpoint.');
      }
    } finally {
      if (!abortRef.current) setLoading(false);
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current = true;
    setLoading(false);
  }, []);

  return { blocks, transactions, networkStats, loading, error, lastScan, scan, abort };
}

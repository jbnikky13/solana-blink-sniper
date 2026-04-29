import { useState, useCallback, useRef } from 'react';
import { QUICKNODE_PROXY } from '../config';

const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const RAYDIUM_AMM = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
const ORCA_WHIRLPOOL = 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc';
const JUPITER_V6 = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';

const NEW_TOKEN_PROGRAMS = new Set([TOKEN_PROGRAM, TOKEN_2022_PROGRAM]);

async function rpc(method, params) {
  if (params === undefined) params = [];
  var res = await fetch(QUICKNODE_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: method, params: params }),
  });
  if (!res.ok) throw new Error('RPC ' + method + ' failed: ' + res.status);
  var json = await res.json();
  if (json.error) throw new Error(json.error.message || 'RPC error');
  return json.result;
}

function classifyTx(tx) {
  if (!tx || !tx.transaction || !tx.transaction.message || !tx.transaction.message.accountKeys) {
    return { type: 'unknown', programs: [] };
  }

  var accounts = tx.transaction.message.accountKeys.map(function(k) {
    return typeof k === 'string' ? k : k.pubkey;
  });

  var programs = [];
  if (accounts.some(function(a) { return a === RAYDIUM_AMM; })) programs.push('Raydium');
  if (accounts.some(function(a) { return a === ORCA_WHIRLPOOL; })) programs.push('Orca');
  if (accounts.some(function(a) { return a === JUPITER_V6; })) programs.push('Jupiter');
  if (accounts.some(function(a) { return NEW_TOKEN_PROGRAMS.has(a); })) programs.push('Token');

  var type = 'transfer';
  if (programs.includes('Raydium') || programs.includes('Orca')) type = 'swap';
  if (programs.includes('Jupiter')) type = 'swap';
  if (programs.includes('Token') && !programs.includes('Raydium') && !programs.includes('Orca')) type = 'token_op';

  return { type: type, programs: programs };
}

export function useSolanaScanner() {
  var blocksState = useState([]);
  var blocks = blocksState[0];
  var setBlocks = blocksState[1];

  var txState = useState([]);
  var transactions = txState[0];
  var setTransactions = txState[1];

  var statsState = useState(null);
  var networkStats = statsState[0];
  var setNetworkStats = statsState[1];

  var loadingState = useState(false);
  var loading = loadingState[0];
  var setLoading = loadingState[1];

  var errorState = useState(null);
  var error = errorState[0];
  var setError = errorState[1];

  var lastScanState = useState(null);
  var lastScan = lastScanState[0];
  var setLastScan = lastScanState[1];

  var abortRef = useRef(false);

  var scan = useCallback(async function() {
    setLoading(true);
    setError(null);
    abortRef.current = false;

    try {
      var results = await Promise.all([
        rpc('getSlot'),
        rpc('getRecentPerformanceSamples', [4]),
        rpc('getEpochInfo'),
      ]);

      var currentSlot = results[0];
      var perfSamples = results[1];
      var epochInfo = results[2];

      if (abortRef.current) return;

      var avgTps = perfSamples.length > 0
        ? Math.round(perfSamples.reduce(function(sum, s) {
            return sum + (s.numTransactions / s.samplePeriodSecs);
          }, 0) / perfSamples.length)
        : 0;

      setNetworkStats({
        slot: currentSlot,
        tps: avgTps,
        epoch: epochInfo ? epochInfo.epoch : null,
        slotIndex: epochInfo ? epochInfo.slotIndex : null,
        slotsInEpoch: epochInfo ? epochInfo.slotsInEpoch : null,
      });

      // Fetch 10 most recent blocks
      var slots = [];
      for (var i = 0; i < 10; i++) {
        slots.push(currentSlot - i);
      }

      var blockResults = await Promise.allSettled(
        slots.map(function(slot) {
          return rpc('getBlock', [slot, {
            encoding: 'json',
            transactionDetails: 'signatures',
            rewards: false,
            maxSupportedTransactionVersion: 0,
          }]);
        })
      );

      if (abortRef.current) return;

      var validBlocks = blockResults
        .map(function(r, i) { return { slot: slots[i], result: r }; })
        .filter(function(b) { return b.result.status === 'fulfilled' && b.result.value; })
        .map(function(b) {
          var val = b.result.value;
          // When transactionDetails='signatures', transactions is an array of signature strings
          var sigs = [];
          if (val.signatures) {
            // Some RPC nodes return a top-level signatures array
            sigs = val.signatures.slice(0, 5);
          } else if (val.transactions) {
            // Others return transactions array where each item may be a string sig or object
            sigs = val.transactions.slice(0, 5).map(function(t) {
              if (typeof t === 'string') return t;
              if (Array.isArray(t)) return t[0];
              if (t && t.transaction && Array.isArray(t.transaction)) return t.transaction[0];
              if (t && typeof t.transaction === 'string') return t.transaction;
              return null;
            }).filter(Boolean);
          }
          return {
            slot: b.slot,
            blockTime: val.blockTime,
            txCount: val.transactions ? val.transactions.length : (val.signatures ? val.signatures.length : 0),
            signatures: sigs,
            blockhash: val.blockhash,
            parentSlot: val.parentSlot,
          };
        });

      setBlocks(validBlocks);

      // Collect signatures from first 3 blocks
      var sigPool = [];
      validBlocks.slice(0, 3).forEach(function(b) {
        b.signatures.forEach(function(s) {
          if (sigPool.length < 15) sigPool.push(s);
        });
      });

      console.log('sigPool length:', sigPool.length, sigPool.slice(0, 3));

      if (sigPool.length === 0) {
        setTransactions([]);
        setLastScan(new Date());
        return;
      }

      var txDetails = await Promise.allSettled(
        sigPool.map(function(sig) {
          return rpc('getTransaction', [sig, {
            encoding: 'json',
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          }]);
        })
      );

      if (abortRef.current) return;

      var parsedTxs = txDetails
        .map(function(r, i) { return { sig: sigPool[i], result: r }; })
        .filter(function(t) { return t.result.status === 'fulfilled' && t.result.value; })
        .map(function(t) {
          var tx = t.result.value;
          var classified = classifyTx(tx);
          var type = classified.type;
          var programs = classified.programs;
          var accounts = (tx && tx.transaction && tx.transaction.message && tx.transaction.message.accountKeys) || [];
          var signerPubkey = typeof accounts[0] === 'string' ? accounts[0] : (accounts[0] ? accounts[0].pubkey : null);
          var fee = (tx && tx.meta && tx.meta.fee) ? tx.meta.fee : 0;
          var err = tx && tx.meta ? tx.meta.err : null;

          var preBalances = (tx && tx.meta && tx.meta.preTokenBalances) || [];
          var postBalances = (tx && tx.meta && tx.meta.postTokenBalances) || [];
          var involvedMints = preBalances.map(function(b) { return b.mint; })
            .concat(postBalances.map(function(b) { return b.mint; }))
            .filter(Boolean);
          var uniqueMints = involvedMints.filter(function(v, i, a) { return a.indexOf(v) === i; });

          return {
            sig: t.sig,
            slot: tx.slot,
            blockTime: tx.blockTime,
            type: type,
            programs: programs,
            signer: signerPubkey,
            fee: fee,
            err: err,
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

  var abort = useCallback(function() {
    abortRef.current = true;
    setLoading(false);
  }, []);

  return {
    blocks: blocks,
    transactions: transactions,
    networkStats: networkStats,
    loading: loading,
    error: error,
    lastScan: lastScan,
    scan: scan,
    abort: abort,
  };
}

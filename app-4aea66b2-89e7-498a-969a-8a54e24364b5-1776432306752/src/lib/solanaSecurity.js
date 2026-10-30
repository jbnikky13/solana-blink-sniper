const TOKEN_PROGRAMS = new Set([
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
]);

function rpcError(method, payload) {
  if (!payload || payload.error || !Object.prototype.hasOwnProperty.call(payload, 'result')) {
    throw new Error(payload?.error?.message || `Solana RPC ${method} returned no result`);
  }
  return payload.result;
}

async function callRpc(endpoint, method, params, fetchImpl) {
  if (!endpoint || endpoint.includes('YOUR_BACKUP_URL_HERE')) {
    throw new Error('VITE_QUICKNODE_URL is not configured');
  }
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: method, method, params }),
  });
  if (!response.ok) throw new Error(`Solana RPC ${method} failed: HTTP ${response.status}`);
  return rpcError(method, await response.json());
}

export function summarizeLargestAccounts(accounts, accountDetails, supplyRaw) {
  if (!Array.isArray(accounts) || !accounts.length || !Array.isArray(accountDetails)) {
    return { status: 'unavailable', top10HolderPct: null, observedAccounts: 0, uniqueOwners: 0 };
  }

  let supply;
  try { supply = BigInt(supplyRaw); } catch (_) {
    return { status: 'unavailable', top10HolderPct: null, observedAccounts: 0, uniqueOwners: 0 };
  }
  if (supply <= 0n || accountDetails.length !== accounts.length) {
    return { status: 'unavailable', top10HolderPct: null, observedAccounts: accounts.length, uniqueOwners: 0 };
  }

  const byOwner = new Map();
  for (let i = 0; i < accounts.length; i += 1) {
    const owner = accountDetails[i]?.data?.parsed?.info?.owner;
    const raw = accounts[i]?.amount;
    if (!owner || raw == null) {
      return { status: 'unavailable', top10HolderPct: null, observedAccounts: accounts.length, uniqueOwners: byOwner.size };
    }
    let amount;
    try { amount = BigInt(raw); } catch (_) {
      return { status: 'unavailable', top10HolderPct: null, observedAccounts: accounts.length, uniqueOwners: byOwner.size };
    }
    byOwner.set(owner, (byOwner.get(owner) || 0n) + amount);
  }

  const topOwners = [...byOwner.values()].sort((a, b) => a > b ? -1 : a < b ? 1 : 0).slice(0, 10);
  const top10 = topOwners.reduce((sum, value) => sum + value, 0n);
  const pct = Number((top10 * 1000000n) / supply) / 10000;

  return {
    // getTokenLargestAccounts is capped at 20 accounts, so this is an estimate,
    // not a complete wallet-level holder census.
    status: 'estimated',
    top10HolderPct: Math.min(100, pct),
    observedAccounts: accounts.length,
    uniqueOwners: byOwner.size,
  };
}

export async function fetchSolanaSecurity(mint, endpoint, fetchImpl = fetch) {
  const [mintResult, largestResult, supplyResult] = await Promise.all([
    callRpc(endpoint, 'getAccountInfo', [mint, { encoding: 'jsonParsed', commitment: 'confirmed' }], fetchImpl),
    callRpc(endpoint, 'getTokenLargestAccounts', [mint, { commitment: 'confirmed' }], fetchImpl),
    callRpc(endpoint, 'getTokenSupply', [mint, { commitment: 'confirmed' }], fetchImpl),
  ]);

  const mintInfo = mintResult?.value?.data?.parsed?.info;
  const mintProgram = mintResult?.value?.owner;
  if (!mintResult?.value || !mintInfo || !TOKEN_PROGRAMS.has(mintProgram) || mintResult.value.data?.parsed?.type !== 'mint') {
    return {
      status: 'unavailable',
      source: 'Solana RPC',
      error: 'Mint account could not be parsed as a supported SPL mint',
      mintAuthority: undefined,
      freezeAuthority: undefined,
      holderConcentrationStatus: 'unavailable',
      top10HolderPct: null,
    };
  }

  const accounts = largestResult?.value || [];
  let holderSummary = { status: 'unavailable', top10HolderPct: null, observedAccounts: accounts.length, uniqueOwners: 0 };
  if (accounts.length) {
    try {
      const details = await callRpc(endpoint, 'getMultipleAccounts', [
        accounts.map((account) => account.address),
        { encoding: 'jsonParsed', commitment: 'confirmed' },
      ], fetchImpl);
      holderSummary = summarizeLargestAccounts(accounts, details?.value || [], supplyResult?.value?.amount);
    } catch (_) {
      // Keep the holder metric unavailable. A failed secondary check must not
      // be interpreted as a safe concentration result.
    }
  }

  const authoritiesKnown = Object.prototype.hasOwnProperty.call(mintInfo, 'mintAuthority')
    && Object.prototype.hasOwnProperty.call(mintInfo, 'freezeAuthority');
  return {
    status: authoritiesKnown && holderSummary.status === 'estimated' ? 'partial' : 'unavailable',
    source: 'Solana RPC',
    mintAuthority: mintInfo.mintAuthority,
    freezeAuthority: mintInfo.freezeAuthority,
    mintAuthorityRevoked: authoritiesKnown ? mintInfo.mintAuthority === null : null,
    freezeAuthorityRevoked: authoritiesKnown ? mintInfo.freezeAuthority === null : null,
    holderConcentrationStatus: holderSummary.status,
    top10HolderPct: holderSummary.top10HolderPct,
    observedTokenAccounts: holderSummary.observedAccounts,
    observedUniqueOwners: holderSummary.uniqueOwners,
    holderMetricNote: 'Estimate from at most 20 largest token accounts; not a complete wallet-level holder census.',
  };
}

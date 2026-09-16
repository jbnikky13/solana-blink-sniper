import {
  CHAINS,
  PROXY_API,
  DEX_LATEST_PROFILES,
  DEX_LATEST_BOOSTS,
  DEX_TRENDING_META,
  RUGCHECK_REPORT,
  GOPLUS_TOKEN_SECURITY,
  HONEYPOT_CHECK,
} from '../config';

const ERC20 = {
  name: '0x06fdde03',
  symbol: '0x95d89b41',
  decimals: '0x313ce567',
  totalSupply: '0x18160ddd',
};

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function evmRpc(rpc, method, params = []) {
  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${method}: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || 'RPC error');
  return json.result;
}

function decodeAbiString(hex) {
  if (!hex || hex === '0x') return null;
  try {
    const body = hex.slice(2);
    const offset = parseInt(body.slice(0, 64), 16);
    const len = parseInt(body.slice(offset * 2, offset * 2 + 64), 16);
    const bytes = body.slice(offset * 2 + 64, offset * 2 + 64 + len * 2).match(/.{1,2}/g) || [];
    return new TextDecoder().decode(new Uint8Array(bytes.map((x) => parseInt(x, 16))));
  } catch (_) { return null; }
}

function decodeUint(hex) {
  if (!hex || hex === '0x') return null;
  try { return Number(BigInt(hex)); } catch (_) { return null; }
}

async function readErc20(rpc, address) {
  const [code, name, symbol, decimals, totalSupply] = await Promise.all([
    evmRpc(rpc, 'eth_getCode', [address, 'latest']),
    evmRpc(rpc, 'eth_call', [{ to: address, data: ERC20.name }, 'latest']).catch(() => null),
    evmRpc(rpc, 'eth_call', [{ to: address, data: ERC20.symbol }, 'latest']).catch(() => null),
    evmRpc(rpc, 'eth_call', [{ to: address, data: ERC20.decimals }, 'latest']).catch(() => null),
    evmRpc(rpc, 'eth_call', [{ to: address, data: ERC20.totalSupply }, 'latest']).catch(() => null),
  ]);

  if (!code || code === '0x' || code.length < 20) return null;
  const tokenName = decodeAbiString(name) || 'Unknown token';
  const tokenSymbol = decodeAbiString(symbol) || 'UNKNOWN';
  const tokenDecimals = decodeUint(decimals);
  const supplyRaw = totalSupply && totalSupply !== '0x' ? BigInt(totalSupply) : null;

  // A contract that exposes the core ERC-20 methods is treated as a token candidate.
  const looksLikeToken = Boolean(symbol || decimals || totalSupply);
  if (!looksLikeToken) return null;
  return {
    address,
    name: tokenName,
    symbol: tokenSymbol,
    decimals: tokenDecimals,
    totalSupply: supplyRaw ? supplyRaw.toString() : null,
    contractBytes: Math.max(0, (code.length - 2) / 2),
  };
}

async function scanEvmContracts(chain) {
  const blockHex = await evmRpc(chain.rpc, 'eth_blockNumber');
  const latest = Number(BigInt(blockHex));
  const blockNumbers = Array.from({ length: 6 }, (_, i) => latest - i);
  const blocks = await Promise.all(blockNumbers.map((n) =>
    evmRpc(chain.rpc, 'eth_getBlockByNumber', [`0x${n.toString(16)}`, true]).catch(() => null)
  ));

  const creations = [];
  for (const block of blocks) {
    for (const tx of (block?.transactions || [])) {
      if (!tx.to && tx.creates) creations.push(tx.creates);
      // Some RPCs do not expose `creates`; contract creation can still be resolved from the receipt.
      if (!tx.to && tx.hash && !tx.creates) {
        const receipt = await evmRpc(chain.rpc, 'eth_getTransactionReceipt', [tx.hash]).catch(() => null);
        if (receipt?.contractAddress) creations.push(receipt.contractAddress);
      }
      if (creations.length >= 40) break;
    }
    if (creations.length >= 40) break;
  }

  const unique = [...new Set(creations.map((x) => x.toLowerCase()))].slice(0, 30);
  const tokens = [];
  for (const address of unique) {
    try {
      const token = await readErc20(chain.rpc, address);
      if (token) tokens.push({ ...token, chain: chain.id, chainName: chain.name, discoveredBy: 'new-contract' });
    } catch (_) { /* one bad contract must not stop the scanner */ }
  }
  return tokens;
}

function normalizeProfile(item) {
  if (!item?.tokenAddress || !item?.chainId) return null;
  const chain = item.chainId === 'solana' ? CHAINS.solana
    : item.chainId === 'arc' ? CHAINS.arc
    : (item.chainId === 'robin' || item.chainId === 'robinhood') ? CHAINS.robinhood
    : null;
  if (!chain) return null;
  return {
    address: item.tokenAddress,
    chain: chain.id,
    chainName: chain.name,
    name: item.description?.split(/\n| - | — /)[0] || 'New token',
    symbol: '',
    description: item.description || '',
    icon: item.icon,
    profileUrl: item.url,
    discoveredBy: 'dex-profile',
  };
}

export async function discoverEarlyTokens() {
  const [profiles, boosts, trending] = await Promise.all([
    getJson(DEX_LATEST_PROFILES()).catch(() => []),
    getJson(DEX_LATEST_BOOSTS()).catch(() => []),
    getJson(DEX_TRENDING_META()).catch(() => []),
  ]);

  const profileTokens = (Array.isArray(profiles) ? profiles : []).map(normalizeProfile).filter(Boolean);
  const boostTokens = (Array.isArray(boosts) ? boosts : []).map((item) => ({
    ...normalizeProfile(item),
    boostAmount: Number(item.totalAmount || item.amount || 0),
    discoveredBy: 'dex-boost',
  })).filter(Boolean);

  const evmTokens = [];
  for (const chain of [CHAINS.arc, CHAINS.robinhood]) {
    try { evmTokens.push(...await scanEvmContracts(chain)); } catch (_) { /* keep other chains alive */ }
  }

  const merged = new Map();
  [...profileTokens, ...boostTokens, ...evmTokens].forEach((token) => {
    const key = `${token.chain}:${token.address.toLowerCase()}`;
    merged.set(key, { ...merged.get(key), ...token });
  });

  return {
    tokens: [...merged.values()],
    trending: Array.isArray(trending) ? trending : [],
  };
}

export async function enrichToken(token) {
  const chain = CHAINS[token.chain];
  if (!chain) return token;

  const dex = await getJson(`https://api.dexscreener.com/latest/dex/tokens/${token.address}`).catch(() => ({ pairs: [] }));
  const pairs = (dex?.pairs || []).filter((p) => p.chainId === chain.dexChainId || (chain.id === 'solana' && p.chainId === 'solana'));
  const pair = pairs.sort((a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0))[0] || null;

  let security = { status: 'not_checked', source: null, isHoneypot: null, risk: null, flags: [] };
  if (chain.type === 'solana') {
    const report = await getJson(RUGCHECK_REPORT(token.address)).catch(() => null);
    if (report) {
      const risks = report.risks || report.risk || [];
      security = {
        status: 'checked',
        source: 'RugCheck',
        isHoneypot: Boolean(report.rugged),
        risk: report.score ?? report.riskScore ?? null,
        flags: Array.isArray(risks) ? risks.map((r) => r.name || r.description || r).slice(0, 8) : [],
        mintAuthority: report.token?.mintAuthority || report.mintAuthority || null,
        freezeAuthority: report.token?.freezeAuthority || report.freezeAuthority || null,
      };
    }
  } else if (chain.chainId === 4663) {
    const gp = await getJson(GOPLUS_TOKEN_SECURITY(chain.chainId, token.address)).catch(() => null);
    const data = gp?.result?.[token.address.toLowerCase()] || gp?.result?.[token.address] || null;
    if (data) {
      const risky = [
        ['is_honeypot', data.is_honeypot], ['is_blacklisted', data.is_blacklisted],
        ['is_mintable', data.is_mintable], ['owner_change_balance', data.owner_change_balance],
      ];
      security = {
        status: 'checked', source: 'GoPlus', isHoneypot: data.is_honeypot === '1',
        risk: null,
        flags: risky.filter(([, v]) => v === '1').map(([k]) => k),
        buyTax: data.buy_tax, sellTax: data.sell_tax,
        openSource: data.is_open_source,
        holderCount: data.holder_count,
      };
    }
  } else if (chain.chainId) {
    // Honeypot.is currently covers Ethereum/BSC/Base, not Arc. Keep this explicit
    // rather than pretending an unsupported checker is a real verification.
    if ([1, 56, 8453].includes(chain.chainId)) {
      const hp = await getJson(HONEYPOT_CHECK(chain.chainId, token.address)).catch(() => null);
      if (hp) security = {
        status: 'checked', source: 'Honeypot.is', isHoneypot: hp.honeypotResult?.isHoneypot ?? null,
        risk: hp.summary?.riskLevel ?? null,
        flags: (hp.summary?.flags || []).map((x) => x.flag || x.description || x).slice(0, 8),
        buyTax: hp.simulationResult?.buyTax, sellTax: hp.simulationResult?.sellTax,
      };
    }
  }

  return {
    ...token,
    market: pair ? {
      pairAddress: pair.pairAddress,
      dex: pair.dexId,
      priceUsd: Number(pair.priceUsd || 0),
      liquidityUsd: Number(pair.liquidity?.usd || 0),
      volume5m: Number(pair.volume?.m5 || 0),
      volume1h: Number(pair.volume?.h1 || 0),
      buys5m: Number(pair.txns?.m5?.buys || 0),
      sells5m: Number(pair.txns?.m5?.sells || 0),
      priceChange5m: Number(pair.priceChange?.m5 || 0),
      priceChange1h: Number(pair.priceChange?.h1 || 0),
      fdv: Number(pair.fdv || 0),
      pairCreatedAt: pair.pairCreatedAt || null,
      url: pair.url,
      socials: pair.info?.socials || [],
    } : null,
    security,
  };
}

export function rankEarlyToken(token, trendingWords = []) {
  const market = token.market || {};
  const security = token.security || {};
  const text = `${token.name || ''} ${token.symbol || ''} ${token.description || ''}`.toLowerCase();
  const narrativeHits = trendingWords.filter((word) => text.includes(String(word).toLowerCase()));
  const liquidity = market.liquidityUsd || 0;
  const volume = market.volume1h || 0;
  const flow = (market.buys5m || 0) - (market.sells5m || 0);
  const ageHours = market.pairCreatedAt ? Math.max(0.05, (Date.now() - market.pairCreatedAt) / 3600000) : 999;

  let score = 0;
  score += Math.min(25, narrativeHits.length * 8);
  score += Math.min(20, Math.log10(Math.max(1, liquidity)) * 4);
  score += Math.min(20, Math.log10(Math.max(1, volume)) * 4);
  score += Math.max(-10, Math.min(10, flow));
  if (ageHours < 6) score += 15;
  else if (ageHours < 24) score += 8;
  if (token.discoveredBy === 'dex-boost') score += 5;
  if (security.isHoneypot === true) score -= 60;
  if (security.flags?.length) score -= Math.min(20, security.flags.length * 4);

  return {
    ...token,
    score: Math.max(0, Math.min(100, Math.round(score))),
    narrativeHits,
    verdict: security.isHoneypot === true ? 'BLOCKED' : security.status === 'checked' ? 'SECURITY CHECKED' : 'VERIFY BEFORE ENTRY',
  };
}

export function extractTrendingWords(trending, tokens = []) {
  const stop = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'token', 'coin', 'chain', 'crypto', 'new']);
  const counts = new Map();
  const add = (value) => String(value || '').toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g)?.forEach((w) => {
    if (!stop.has(w) && !/^\d+$/.test(w)) counts.set(w, (counts.get(w) || 0) + 1);
  });
  (Array.isArray(trending) ? trending : []).forEach((x) => add(x.name || x.title || x.slug || x.description));
  tokens.forEach((x) => { add(x.name); add(x.symbol); add(x.description); });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([w]) => w);
}

export async function runEarlyGemScan() {
  const discovered = await discoverEarlyTokens();
  const words = extractTrendingWords(discovered.trending, discovered.tokens);
  const enriched = [];
  for (const token of discovered.tokens.slice(0, 50)) {
    try { enriched.push(rankEarlyToken(await enrichToken(token), words)); }
    catch (_) { enriched.push(rankEarlyToken(token, words)); }
  }
  enriched.sort((a, b) => b.score - a.score);
  return { tokens: enriched, trendingWords: words };
}

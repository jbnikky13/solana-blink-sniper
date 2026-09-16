const STORAGE_KEY = 'blink-sniper:birth-watch:v1';
const MAX_HISTORY = 250;

function key(token) {
  return `${token.chain}:${String(token.address || '').toLowerCase()}`;
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function marketSnapshot(token) {
  const m = token.market || {};
  return {
    liquidity: num(m.liquidityUsd),
    volume1h: num(m.volume1h),
    buys5m: num(m.buys5m),
    sells5m: num(m.sells5m),
    priceChange5m: num(m.priceChange5m),
    priceChange1h: num(m.priceChange1h),
    score: num(token.score),
    momentum: num(token.narrativeIntelligence?.momentum),
  };
}

function readHistory() {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (_) { return {}; }
}

function writeHistory(history) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history)); } catch (_) {}
}

export function observeTokenBirths(tokens = []) {
  const previous = readHistory();
  const now = Date.now();
  const next = { ...previous };
  const observed = tokens.map((token) => {
    const id = key(token);
    const before = previous[id];
    const current = marketSnapshot(token);
    const ageMs = token.market?.pairCreatedAt ? Math.max(0, now - Number(token.market.pairCreatedAt)) : null;
    const delta = before ? {
      liquidity: current.liquidity - before.snapshot.liquidity,
      volume1h: current.volume1h - before.snapshot.volume1h,
      buys5m: current.buys5m - before.snapshot.buys5m,
      sells5m: current.sells5m - before.snapshot.sells5m,
      score: current.score - before.snapshot.score,
      momentum: current.momentum - before.snapshot.momentum,
    } : { liquidity: 0, volume1h: 0, buys5m: 0, sells5m: 0, score: 0, momentum: 0 };
    const isNew = !before;
    const liquidityArrived = !before ? current.liquidity > 0 : before.snapshot.liquidity <= 0 && current.liquidity > 0;
    const flowAccelerating = delta.buys5m > 0 && delta.buys5m > delta.sells5m;
    const volumeAccelerating = delta.volume1h > 0;
    const narrativeAccelerating = delta.momentum > 0;
    const birthScore = Math.max(0, Math.min(100,
      (isNew ? 35 : 0) +
      (liquidityArrived ? 20 : 0) +
      (flowAccelerating ? 15 : 0) +
      (volumeAccelerating ? 10 : 0) +
      (narrativeAccelerating ? 10 : 0) +
      (ageMs !== null && ageMs < 6 * 3600000 ? 10 : 0)
    ));
    next[id] = { token: { name: token.name, symbol: token.symbol, chain: token.chain, chainName: token.chainName, address: token.address }, snapshot: current, firstSeenAt: before?.firstSeenAt || now, lastSeenAt: now };
    return { ...token, birthWatch: { isNew, firstSeenAt: next[id].firstSeenAt, lastSeenAt: now, ageMs, delta, liquidityArrived, flowAccelerating, volumeAccelerating, narrativeAccelerating, birthScore } };
  });

  const entries = Object.entries(next).sort((a,b) => b[1].lastSeenAt - a[1].lastSeenAt).slice(0, MAX_HISTORY);
  writeHistory(Object.fromEntries(entries));
  return observed;
}

export function getBirthWatchSummary(tokens = []) {
  const watched = tokens.filter((t) => t.birthWatch);
  return {
    newTokens: watched.filter((t) => t.birthWatch.isNew).length,
    liquidityArrivals: watched.filter((t) => t.birthWatch.liquidityArrived).length,
    accelerating: watched.filter((t) => t.birthWatch.flowAccelerating || t.birthWatch.volumeAccelerating || t.birthWatch.narrativeAccelerating).length,
    highAttention: watched.filter((t) => t.birthWatch.birthScore >= 60).length,
  };
}

export function clearBirthWatchHistory() {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
}

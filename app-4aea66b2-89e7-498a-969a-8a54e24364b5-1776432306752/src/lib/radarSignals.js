const BLOCK_FLAGS = new Set(['is_honeypot', 'is_blacklisted', 'owner_change_balance']);

export function getRadarSignal(token) {
  const market = token.market || {};
  const security = token.security || {};
  const liquidity = Number(market.liquidityUsd || 0);
  const buys = Number(market.buys5m || 0);
  const sells = Number(market.sells5m || 0);
  const flowRatio = buys / Math.max(1, sells);
  const flags = Array.isArray(security.flags) ? security.flags.map(String) : [];
  const blocked = security.isHoneypot === true || flags.some((flag) => BLOCK_FLAGS.has(flag));
  const verified = security.status === 'checked' && security.isHoneypot !== true;

  if (blocked) return { signal: 'BLOCKED', reason: 'Security risk detected', flowRatio };
  if (!verified) return { signal: 'VERIFY', reason: 'Security verification is incomplete', flowRatio };
  if (liquidity >= 5000 && flowRatio >= 1.2 && Number(token.score || 0) >= 70) return { signal: 'HOT', reason: 'Strong early momentum with security checks', flowRatio };
  if (Number(token.score || 0) >= 45) return { signal: 'WATCH', reason: 'Interesting early-stage signals', flowRatio };
  return { signal: 'EARLY', reason: 'New candidate; more confirmation needed', flowRatio };
}

export function buildRadarSummary(tokens = []) {
  return tokens.reduce((summary, token) => {
    const signal = getRadarSignal(token).signal;
    summary[signal] = (summary[signal] || 0) + 1;
    return summary;
  }, { HOT: 0, WATCH: 0, EARLY: 0, VERIFY: 0, BLOCKED: 0 });
}

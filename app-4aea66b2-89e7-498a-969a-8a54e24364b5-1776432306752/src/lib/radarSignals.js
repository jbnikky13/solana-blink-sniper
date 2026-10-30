const BLOCK_FLAGS = new Set([
  'is_honeypot',
  'is_blacklisted',
  'owner_change_balance',
  'mint_authority_active',
  'freeze_authority_active',
]);

export function getRadarSignal(token) {
  const market = token.market || {};
  const security = token.security || {};
  const liquidity = Number(market.liquidityUsd || 0);
  const buys = Number(market.buys5m || 0);
  const sells = Number(market.sells5m || 0);
  const flowRatio = buys / Math.max(1, sells);
  const flags = Array.isArray(security.flags) ? security.flags.map(String) : [];
  const blocked = security.isHoneypot === true
    || (token.chain === 'solana' && (security.mintAuthorityRevoked === false
      || security.freezeAuthorityRevoked === false
      || (Number.isFinite(security.top10HolderPct) && security.top10HolderPct > 25)))
    || flags.some((flag) => BLOCK_FLAGS.has(flag));

  if (blocked) return { signal: 'BLOCKED', reason: 'A configured hard security limit was breached', flowRatio };

  if (token.chain === 'solana') {
    const securityVerified = security.status === 'verified'
      && security.isHoneypot === false
      && security.mintAuthorityRevoked === true
      && security.freezeAuthorityRevoked === true
      && security.holderConcentrationStatus === 'verified'
      && Number.isFinite(security.top10HolderPct)
      && security.top10HolderPct <= 25;

    if (!securityVerified) {
      return { signal: 'VERIFY', reason: 'Authority or complete holder-concentration verification is missing', flowRatio };
    }
    if (liquidity < 40000) {
      return { signal: 'WATCH', reason: 'Liquidity is below the $40,000 discovery threshold', flowRatio };
    }
  } else if (security.status !== 'checked' || security.isHoneypot === true) {
    return { signal: 'VERIFY', reason: 'Security verification is incomplete', flowRatio };
  }

  if (flowRatio >= 1.2 && Number(token.score || 0) >= 70) {
    return { signal: 'HOT', reason: 'Security gates passed with strong early momentum', flowRatio };
  }
  if (Number(token.score || 0) >= 45) {
    return { signal: 'WATCH', reason: 'Security gates passed; momentum needs confirmation', flowRatio };
  }
  return { signal: 'EARLY', reason: 'Candidate needs more market confirmation', flowRatio };
}

export function buildRadarSummary(tokens = []) {
  return tokens.reduce((summary, token) => {
    const signal = getRadarSignal(token).signal;
    summary[signal] = (summary[signal] || 0) + 1;
    return summary;
  }, { HOT: 0, WATCH: 0, EARLY: 0, VERIFY: 0, BLOCKED: 0 });
}

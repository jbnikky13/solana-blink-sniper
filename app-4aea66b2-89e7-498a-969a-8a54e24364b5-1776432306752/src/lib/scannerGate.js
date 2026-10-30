export function evaluateSolanaScannerGate(token, {
  minLiquidityUsd = 40000,
  maxTop10HolderPct = 25,
} = {}) {
  const market = token?.market || {};
  const security = token?.security || {};
  const reasons = [];
  const liquidity = Number(market.liquidityUsd);

  if (!Number.isFinite(liquidity)) {
    reasons.push('Liquidity data unavailable');
  } else if (liquidity < minLiquidityUsd) {
    reasons.push(`Liquidity below $${minLiquidityUsd.toLocaleString('en-US')}`);
    return { decision: 'REJECT', reasons, liquidityUsd: liquidity };
  }

  if (security.isHoneypot === true) reasons.push('Honeypot reported');
  if (security.mintAuthorityRevoked === false) reasons.push('Mint authority is still active');
  if (security.freezeAuthorityRevoked === false) reasons.push('Freeze authority is still active');
  if (Number.isFinite(security.top10HolderPct) && security.top10HolderPct > maxTop10HolderPct) {
    reasons.push(`Top-holder concentration exceeds ${maxTop10HolderPct}%`);
  }
  if (reasons.some((reason) => reason !== 'Liquidity data unavailable')) {
    return { decision: 'REJECT', reasons, liquidityUsd: Number.isFinite(liquidity) ? liquidity : null };
  }

  const completeSecurity = security.status === 'verified'
    && security.isHoneypot === false
    && security.mintAuthorityRevoked === true
    && security.freezeAuthorityRevoked === true
    && security.holderConcentrationStatus === 'verified'
    && Number.isFinite(security.top10HolderPct)
    && security.top10HolderPct <= maxTop10HolderPct;

  if (!completeSecurity || !Number.isFinite(liquidity)) {
    if (!completeSecurity) reasons.push('Complete security and wallet-level holder verification unavailable');
    return { decision: 'REVIEW', reasons, liquidityUsd: Number.isFinite(liquidity) ? liquidity : null };
  }

  return { decision: 'PASS', reasons: ['Liquidity and all configured security gates passed'], liquidityUsd: liquidity };
}

export function isValidPaperTrade(t) {
  if (!t || typeof t !== 'object' || Array.isArray(t)) return false;
  const positive = v => Number.isFinite(Number(v)) && Number(v) > 0;
  const numeric = v => Number.isFinite(Number(v));
  if (t.chain !== 'solana' || t.status !== 'OPEN' || t.strategy !== 'solana-paper-v1') return false;
  if (typeof t.idempotencyKey !== 'string' || !t.idempotencyKey.length || t.idempotencyKey.length > 160) return false;
  if (typeof t.tokenAddress !== 'string' || !t.tokenAddress.length || t.tokenAddress.length > 128) return false;
  if (typeof t.openedAt !== 'string' || !Number.isFinite(Date.parse(t.openedAt))) return false;
  if (![t.quantity,t.entryPrice,t.entryReferenceBid,t.entryReferenceAsk,t.stopPrice,t.highWaterPrice,t.notionalUsd,t.riskBudgetUsd].every(positive)) return false;
  if (Number(t.entryReferenceBid) > Number(t.entryReferenceAsk) || Number(t.stopPrice) >= Number(t.entryPrice)) return false;
  if (!numeric(t.entryFeeUsd) || Number(t.entryFeeUsd) < 0) return false;
  if (!Number.isInteger(Number(t.feeBps)) || Number(t.feeBps) < 0 || Number(t.feeBps) > 10000) return false;
  if (!Number.isInteger(Number(t.slippageBps)) || Number(t.slippageBps) < 0 || Number(t.slippageBps) > 5000) return false;
  // Position sizing cap used by the paper executor: notional cannot exceed 20x risk budget.
  if (Number(t.notionalUsd) > Number(t.riskBudgetUsd) * 20.000001) return false;
  return true;
}

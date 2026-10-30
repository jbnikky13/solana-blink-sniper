const STOP_LOSS_PCT = 0.06;
const TRAILING_STOP_PCT = 0.12;
const MIN_LIQUIDITY_USD = 40000;
const MIN_ANALYST_SCORE = 70;
const positive = v => Number.isFinite(Number(v)) && Number(v) > 0;
const round = (v, p=8) => Number(Number(v).toFixed(p));

export function scannerAgent(token) {
  const m=token?.market||{}, s=token?.security||{}, reasons=[];
  if(token?.chain!=='solana') reasons.push('Solana only');
  if(!positive(m.liquidityUsd)||Number(m.liquidityUsd)<MIN_LIQUIDITY_USD) reasons.push('Liquidity unavailable or below $40,000');
  if(s.status!=='verified') reasons.push('Security not fully verified');
  if(s.isHoneypot!==false) reasons.push('Honeypot not explicitly false');
  if(s.mintAuthorityRevoked!==true) reasons.push('Mint authority not confirmed revoked');
  if(s.freezeAuthorityRevoked!==true) reasons.push('Freeze authority not confirmed revoked');
  if(s.holderConcentrationStatus!=='verified'||!Number.isFinite(Number(s.top10HolderPct))||Number(s.top10HolderPct)>25) reasons.push('Complete top-holder verification missing or above 25%');
  if(token?.scannerGate?.decision!=='PASS') reasons.push('Existing scanner gate did not return PASS');
  return {agent:'scanner',decision:reasons.length?'REJECT':'PASS',reasons};
}

export function analystAgent(token) {
  const m=token?.market||{}, reasons=[], score=Number(token?.score);
  if(!Number.isFinite(score)||score<MIN_ANALYST_SCORE) reasons.push('Heuristic discovery score below 70');
  if(!positive(m.priceUsd)) reasons.push('Reference price unavailable');
  if(!positive(m.volume1h)) reasons.push('One-hour volume unavailable');
  if(Number(m.buys5m||0)<=Number(m.sells5m||0)) reasons.push('Recent buys do not exceed sells');
  return {agent:'analyst',decision:reasons.length?'REJECT':'APPROVE',reasons,scoreModel:token?.scoreModel||'unknown',note:'Deterministic research rules, not an AI model or validated predictor.'};
}

export function riskManager({equityUsd,dailyRealizedPnlUsd=0,openPositions=0,riskFraction=0.01,maxDailyLossFraction=0.03,maxOpenPositions=3}={}) {
  const reasons=[];
  if(!positive(equityUsd)) reasons.push('Paper equity unavailable');
  if(openPositions>=maxOpenPositions) reasons.push('Maximum concurrent positions reached');
  if(positive(equityUsd)&&Number(dailyRealizedPnlUsd)<=-Math.abs(equityUsd*maxDailyLossFraction)) reasons.push('Daily loss limit reached');
  if(!positive(riskFraction)||riskFraction>0.01) reasons.push('Risk per trade must be at most 1%');
  return {agent:'risk-manager',decision:reasons.length?'HALT':'ALLOW',reasons,riskBudgetUsd:positive(equityUsd)?round(equityUsd*riskFraction,2):0,maxDailyLossUsd:positive(equityUsd)?round(equityUsd*maxDailyLossFraction,2):0,maxOpenPositions};
}

function fillPrice(price,side,slippageBps){const slip=Number(slippageBps)/10000;return price*(side==='buy'?1+slip:1-slip);}

export function paperExecutor({token,quote,risk,now=new Date().toISOString(),feeBps=100,slippageBps=100,idempotencyKey}) {
  if(risk?.decision!=='ALLOW') return {agent:'executor',decision:'NO_ORDER',reasons:risk?.reasons||['Risk approval missing']};
  if(!idempotencyKey) return {agent:'executor',decision:'NO_ORDER',reasons:['Idempotency key required']};
  if(!positive(quote?.ask)||!positive(quote?.bid)||Number(quote.bid)>Number(quote.ask)) return {agent:'executor',decision:'NO_ORDER',reasons:['Valid bid/ask quote required']};
  if(!Number.isFinite(feeBps)||feeBps<0||!Number.isFinite(slippageBps)||slippageBps<0) return {agent:'executor',decision:'NO_ORDER',reasons:['Invalid execution cost assumptions']};
  const entry=fillPrice(Number(quote.ask),'buy',slippageBps), budget=Number(risk.riskBudgetUsd);
  const quantity=Math.min(budget/(entry*STOP_LOSS_PCT),(budget*20)/entry);
  if(!positive(quantity)) return {agent:'executor',decision:'NO_ORDER',reasons:['Calculated quantity invalid']};
  const notional=quantity*entry;
  return {agent:'executor',decision:'PAPER_OPENED',mode:'PAPER_ONLY',reasons:['Simulated at ask plus slippage; no transaction sent'],trade:{
    idempotencyKey,chain:token.chain,tokenAddress:token.address,tokenSymbol:token.symbol||null,status:'OPEN',openedAt:now,
    quantity:round(quantity,12),entryPrice:round(entry,12),entryReferenceBid:Number(quote.bid),entryReferenceAsk:Number(quote.ask),
    stopPrice:round(entry*(1-STOP_LOSS_PCT),12),highWaterPrice:round(entry,12),trailingStopPrice:null,
    feeBps,slippageBps,entryFeeUsd:round(notional*feeBps/10000,8),notionalUsd:round(notional,8),
    riskBudgetUsd:round(budget,8),strategy:'solana-paper-v1'
  }};
}

export function evaluatePaperEntry({token,quote,account,now,idempotencyKey,feeBps=100,slippageBps=100}) {
  const scanner=scannerAgent(token), analyst=analystAgent(token), risk=riskManager(account||{});
  const decisions={scanner,analyst,risk};
  if(scanner.decision!=='PASS'||analyst.decision!=='APPROVE'||risk.decision!=='ALLOW')
    return {decision:'REJECT',mode:'PAPER_ONLY',decisions,reasons:[...scanner.reasons,...analyst.reasons,...risk.reasons]};
  const execution=paperExecutor({token,quote,risk,now,feeBps,slippageBps,idempotencyKey});
  decisions.executor=execution;
  return {decision:execution.decision==='PAPER_OPENED'?'PAPER_OPENED':'REJECT',mode:'PAPER_ONLY',decisions,trade:execution.trade||null,reasons:execution.reasons};
}

export function managePaperPosition(position,quote,{now=new Date().toISOString(),feeBps=position?.feeBps??100,slippageBps=position?.slippageBps??100}={}) {
  if(position?.status!=='OPEN') return {decision:'NOOP',reason:'Position is not open'};
  if(!positive(quote?.bid)||!positive(quote?.ask)||Number(quote.bid)>Number(quote.ask)) return {decision:'NOOP',reason:'Valid bid/ask quote unavailable'};
  const bid=Number(quote.bid), high=Math.max(Number(position.highWaterPrice||position.entryPrice),bid);
  const trail=high>=Number(position.entryPrice)*1.07?high*(1-TRAILING_STOP_PCT):null;
  const stop=Math.max(Number(position.stopPrice),trail||0);
  const updated={...position,highWaterPrice:round(high,12),trailingStopPrice:trail===null?null:round(trail,12),lastMarkedAt:now};
  if(bid>stop) return {decision:'HOLD',position:updated,unrealizedPnlUsd:round((bid-Number(position.entryPrice))*Number(position.quantity)-Number(position.entryFeeUsd||0),8)};
  const exit=fillPrice(bid,'sell',slippageBps), proceeds=exit*Number(position.quantity), exitFee=proceeds*feeBps/10000;
  const pnl=proceeds-Number(position.notionalUsd)-Number(position.entryFeeUsd||0)-exitFee;
  return {decision:'PAPER_CLOSED',position:{...updated,status:'CLOSED',closedAt:now,exitPrice:round(exit,12),exitFeeUsd:round(exitFee,8),realizedPnlUsd:round(pnl,8),exitReason:bid<=Number(position.stopPrice)?'STOP_LOSS_6_PERCENT':'TRAILING_STOP_12_PERCENT'},reasons:['Simulated at bid less slippage; no transaction sent']};
}

export const PAPER_TRADING_POLICY=Object.freeze({mode:'PAPER_ONLY',stopLossPct:STOP_LOSS_PCT,trailingStopPct:TRAILING_STOP_PCT,minLiquidityUsd:MIN_LIQUIDITY_USD,minAnalystScore:MIN_ANALYST_SCORE,maxRiskPerTradePct:1,maxDailyLossPct:3,maxOpenPositions:3});

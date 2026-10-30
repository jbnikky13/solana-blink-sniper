import { createClient } from '@supabase/supabase-js';

const json = (res, status, body) => res.status(status).setHeader('Cache-Control','no-store').json(body);
const requiredEnv = ['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'];

function validTrade(t) {
  if (!t || typeof t !== 'object' || Array.isArray(t)) return false;
  const positive = v => Number.isFinite(Number(v)) && Number(v) > 0;
  return t.chain === 'solana' &&
    t.status === 'OPEN' &&
    t.strategy === 'solana-paper-v1' &&
    typeof t.idempotencyKey === 'string' && t.idempotencyKey.length > 0 && t.idempotencyKey.length <= 160 &&
    typeof t.tokenAddress === 'string' && t.tokenAddress.length > 0 && t.tokenAddress.length <= 128 &&
    typeof t.openedAt === 'string' && Number.isFinite(Date.parse(t.openedAt)) &&
    positive(t.quantity) && positive(t.entryPrice) &&
    positive(t.entryReferenceBid) && positive(t.entryReferenceAsk) &&
    Number(t.entryReferenceBid) <= Number(t.entryReferenceAsk) &&
    positive(t.stopPrice) && Number(t.stopPrice) < Number(t.entryPrice) &&
    positive(t.highWaterPrice) && positive(t.notionalUsd) &&
    positive(t.riskBudgetUsd) &&
    Number.isFinite(Number(t.entryFeeUsd)) && Number(t.entryFeeUsd) >= 0 &&
    Number.isInteger(Number(t.feeBps)) && Number(t.feeBps) >= 0 && Number(t.feeBps) <= 10000 &&
    Number.isInteger(Number(t.slippageBps)) && Number(t.slippageBps) >= 0 && Number(t.slippageBps) <= 5000;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow','GET, POST');
    return json(res,405,{error:'Method not allowed'});
  }
  if (requiredEnv.some(k => !process.env[k])) {
    return json(res,503,{error:'Paper-trading persistence is not configured'});
  }

  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return json(res,401,{error:'A valid Supabase access token is required'});

  const supabaseUrl=process.env.SUPABASE_URL;
  const authClient=createClient(supabaseUrl,process.env.SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:authData,error:authError}=await authClient.auth.getUser(match[1]);
  if (authError || !authData?.user?.id) return json(res,401,{error:'Invalid or expired session'});

  const admin=createClient(supabaseUrl,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const userId=authData.user.id;

  if (req.method === 'GET') {
    const {data,error}=await admin.from('paper_trades')
      .select('id,chain,token_address,token_symbol,strategy,status,opened_at,closed_at,quantity,entry_price,stop_price,high_water_price,trailing_stop_price,notional_usd,risk_budget_usd,entry_fee_usd,exit_fee_usd,realized_pnl_usd,fee_bps,slippage_bps,exit_price,exit_reason,created_at,updated_at')
      .eq('user_id',userId).order('opened_at',{ascending:false}).limit(100);
    if(error) return json(res,500,{error:'Could not load paper trades'});
    return json(res,200,{mode:'PAPER_ONLY',trades:data||[]});
  }

  const trade=req.body?.trade;
  if (!validTrade(trade)) return json(res,400,{error:'Invalid paper trade payload'});
  // This endpoint validates and persists a simulation submitted by the signed-in
  // client. It does not independently verify token security or market execution.
  const {data,error}=await admin.rpc('create_paper_trade',{p_user_id:userId,p_trade:trade});
  if(error) {
    const status=error.code==='23505'?409:400;
    return json(res,status,{error:'Paper trade could not be recorded',code:error.code||'DATABASE_ERROR'});
  }
  return json(res,200,{mode:'PAPER_ONLY',trade:data,idempotentReplay:data?.idempotency_key===trade.idempotencyKey});
}

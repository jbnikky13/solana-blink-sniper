import { createClient } from '@supabase/supabase-js';
import { isValidPaperTrade } from '../src/lib/paperTradeValidation.js';

const json = (res, status, body) => res.status(status).setHeader('Cache-Control','no-store').json(body);
const requiredEnv = ['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'];

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.setHeader('Allow','GET, POST');
      return json(res,405,{error:'Method not allowed'});
    }
    if (requiredEnv.some(k => !process.env[k])) {
      return json(res,503,{error:'Paper-trading persistence is not configured'});
    }

    const authorization = req.headers.authorization || '';
    const match = authorization.match(/^Bearer\\s+(.+)$/i);
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
    if (!isValidPaperTrade(trade)) return json(res,400,{error:'Invalid paper trade payload'});
    // Authenticated persistence only: client-submitted security checks and fills
    // are not independently verified by this endpoint.
    const {data,error}=await admin.rpc('create_paper_trade',{p_user_id:userId,p_trade:trade});
    if(error) {
      const status=error.code==='23505'?409:400;
      return json(res,status,{error:'Paper trade could not be recorded',code:error.code||'DATABASE_ERROR'});
    }
    return json(res,200,{mode:'PAPER_ONLY',trade:data,idempotentReplay:data?.idempotency_key===trade.idempotencyKey});
  } catch (error) {
    // Avoid returning tokens, database details, or stack traces to clients.
    return json(res,500,{error:'Unexpected paper-trading API error'});
  }
}

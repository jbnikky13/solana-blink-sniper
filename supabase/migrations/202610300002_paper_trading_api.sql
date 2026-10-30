-- Server-side paper trade persistence. Apply after 202610300001_paper_trading.sql.
-- The API verifies the user's Supabase access token before calling this function
-- with the server-only service_role key. Never expose that key to the browser.

create or replace function public.create_paper_trade(
  p_user_id uuid,
  p_trade jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_trade public.paper_trades%rowtype;
  v_key text;
begin
  if p_user_id is null or p_trade is null or jsonb_typeof(p_trade) <> 'object' then
    raise exception 'Invalid trade payload' using errcode = '22023';
  end if;

  v_key := nullif(p_trade->>'idempotencyKey', '');
  if v_key is null or length(v_key) > 160 then
    raise exception 'A valid idempotency key is required' using errcode = '22023';
  end if;

  if p_trade->>'chain' <> 'solana'
     or coalesce(p_trade->>'status','') <> 'OPEN'
     or coalesce(p_trade->>'strategy','') <> 'solana-paper-v1' then
    raise exception 'Only open Solana paper trades are accepted' using errcode = '22023';
  end if;

  insert into public.paper_trades (
    user_id,idempotency_key,chain,token_address,token_symbol,strategy,status,
    opened_at,quantity,entry_price,entry_reference_bid,entry_reference_ask,
    stop_price,high_water_price,trailing_stop_price,notional_usd,risk_budget_usd,
    entry_fee_usd,fee_bps,slippage_bps
  ) values (
    p_user_id,v_key,'solana',p_trade->>'tokenAddress',nullif(p_trade->>'tokenSymbol',''),
    'solana-paper-v1','OPEN',(p_trade->>'openedAt')::timestamptz,
    (p_trade->>'quantity')::numeric,(p_trade->>'entryPrice')::numeric,
    (p_trade->>'entryReferenceBid')::numeric,(p_trade->>'entryReferenceAsk')::numeric,
    (p_trade->>'stopPrice')::numeric,(p_trade->>'highWaterPrice')::numeric,
    nullif(p_trade->>'trailingStopPrice','')::numeric,(p_trade->>'notionalUsd')::numeric,
    (p_trade->>'riskBudgetUsd')::numeric,(p_trade->>'entryFeeUsd')::numeric,
    (p_trade->>'feeBps')::integer,(p_trade->>'slippageBps')::integer
  )
  on conflict (user_id,idempotency_key) do nothing
  returning * into v_trade;

  if v_trade.id is null then
    select * into v_trade from public.paper_trades
    where user_id=p_user_id and idempotency_key=v_key;
  else
    insert into public.paper_trade_events(trade_id,user_id,event_key,event_type,payload)
    values (
      v_trade.id,p_user_id,'created:'||v_key,'PAPER_TRADE_CREATED',
      jsonb_build_object('mode','PAPER_ONLY','source','authenticated_api')
    )
    on conflict (trade_id,event_key) do nothing;
  end if;

  return to_jsonb(v_trade);
end;
$$;

revoke all on function public.create_paper_trade(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.create_paper_trade(uuid,jsonb) to service_role;

create or replace function public.reject_paper_event_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'Paper trade events are append-only' using errcode = '55000';
end;
$$;

drop trigger if exists paper_trade_events_append_only on public.paper_trade_events;
create trigger paper_trade_events_append_only
before update or delete on public.paper_trade_events
for each row execute function public.reject_paper_event_mutation();

comment on function public.create_paper_trade(uuid,jsonb) is
'Server-only, idempotent paper trade insert. Caller must verify user JWT before invoking with service_role.';

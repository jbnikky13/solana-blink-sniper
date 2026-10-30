-- Apply manually to the intended Supabase project. No wallet keys or live execution.
create extension if not exists pgcrypto;
create table if not exists public.paper_trades (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 idempotency_key text not null,
 chain text not null check(chain='solana'),
 token_address text not null, token_symbol text,
 strategy text not null default 'solana-paper-v1',
 status text not null check(status in ('OPEN','CLOSED','CANCELLED')),
 opened_at timestamptz not null, closed_at timestamptz,
 quantity numeric(38,12) not null check(quantity>0),
 entry_price numeric(38,12) not null check(entry_price>0),
 entry_reference_bid numeric(38,12) not null, entry_reference_ask numeric(38,12) not null,
 stop_price numeric(38,12) not null, high_water_price numeric(38,12) not null,
 trailing_stop_price numeric(38,12), exit_price numeric(38,12),
 notional_usd numeric(24,8) not null, risk_budget_usd numeric(24,8) not null,
 entry_fee_usd numeric(24,8) not null default 0, exit_fee_usd numeric(24,8), realized_pnl_usd numeric(24,8),
 fee_bps integer not null, slippage_bps integer not null, exit_reason text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,idempotency_key)
);
create index if not exists paper_trades_user_status_idx on public.paper_trades(user_id,status,opened_at desc);
create table if not exists public.paper_trade_events (
 id uuid primary key default gen_random_uuid(),
 trade_id uuid not null references public.paper_trades(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 event_key text not null, event_type text not null,
 occurred_at timestamptz not null default now(), payload jsonb not null default '{}'::jsonb,
 unique(trade_id,event_key)
);
create index if not exists paper_trade_events_trade_time_idx on public.paper_trade_events(trade_id,occurred_at);
alter table public.paper_trades enable row level security;
alter table public.paper_trade_events enable row level security;
drop policy if exists paper_trades_read_own on public.paper_trades;
create policy paper_trades_read_own on public.paper_trades for select to authenticated using(auth.uid()=user_id);
drop policy if exists paper_trade_events_read_own on public.paper_trade_events;
create policy paper_trade_events_read_own on public.paper_trade_events for select to authenticated using(auth.uid()=user_id);
comment on table public.paper_trades is 'Paper-only trade ledger. No live execution capability.';
comment on table public.paper_trade_events is 'Audit events for paper trades. Writes are server-only by application policy.';

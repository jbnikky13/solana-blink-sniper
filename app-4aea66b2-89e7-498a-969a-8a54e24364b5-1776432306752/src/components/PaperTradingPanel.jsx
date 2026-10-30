import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, RefreshCw, ShieldCheck, ShieldX, Wallet, History, LockKeyhole } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { analystAgent, scannerAgent } from '../lib/paperTrading';

const money = (value) => Number.isFinite(Number(value)) ? Number(value).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }) : '—';
const short = (value) => value ? `${String(value).slice(0, 6)}…${String(value).slice(-4)}` : '—';

export default function PaperTradingPanel({ tokens = [] }) {
  const [trades, setTrades] = useState([]);
  const [sessionState, setSessionState] = useState('checking');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadTrades = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const accessToken = data?.session?.access_token;
      if (!accessToken) {
        setTrades([]);
        setSessionState('signed-out');
        return;
      }
      setSessionState('signed-in');
      const response = await fetch('/api/paper-trades', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Trade history request failed (${response.status})`);
      setTrades(Array.isArray(payload.trades) ? payload.trades : []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err?.message || 'Could not load paper-trading history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTrades(); }, [loadTrades]);

  const candidates = useMemo(() => tokens
    .filter((token) => token?.chain === 'solana')
    .map((token) => ({ token, scanner: scannerAgent(token), analyst: analystAgent(token) }))
    .slice(0, 20), [tokens]);

  const openTrades = trades.filter((trade) => trade.status === 'OPEN');
  const closedTrades = trades.filter((trade) => trade.status === 'CLOSED');
  const realizedPnl = closedTrades.reduce((sum, trade) => sum + Number(trade.realized_pnl_usd || 0), 0);
  const positiveTrades = closedTrades.filter((trade) => Number(trade.realized_pnl_usd || 0) > 0).length;

  return <section className="space-y-4">
    <div className="rounded-2xl border border-brand-accent/30 bg-brand-accent/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-white font-semibold"><Activity size={17} className="text-brand-accent"/> Paper Trading</div>
          <p className="text-xs text-brand-subtext mt-1">Research ledger · simulated positions only · no wallet connection or on-chain transactions</p>
        </div>
        <span className="rounded-full border border-brand-accent/30 bg-brand-accent/10 px-2.5 py-1 text-[10px] font-bold tracking-wide text-brand-accent">PAPER ONLY</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
        <Metric icon={<Wallet size={14}/>} label="Open positions" value={openTrades.length}/>
        <Metric icon={<History size={14}/>} label="Closed trades" value={closedTrades.length}/>
        <Metric label="Realized P&L" value={money(realizedPnl)} positive={realizedPnl >= 0}/>
        <Metric label="Winning trades" value={closedTrades.length ? `${positiveTrades}/${closedTrades.length}` : '—'}/>
      </div>
    </div>

    <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle size={17} className="text-yellow-300 mt-0.5 shrink-0"/>
        <div>
          <h3 className="text-sm font-semibold text-white">Paper entries are not enabled yet</h3>
          <p className="text-xs leading-relaxed text-brand-subtext mt-1">The current discovery feed supplies reference prices, not an independently verified executable bid/ask quote. The entry engine requires both sides of a valid quote and realistic execution costs. This dashboard will not invent a fill price or create a misleading trade record.</p>
        </div>
      </div>
    </div>

    <div className="rounded-2xl border border-brand-border bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-sm font-semibold text-white">Scanner decisions</h3><p className="text-[11px] text-brand-subtext mt-1">Latest Solana candidates · deterministic gates, not predictive AI</p></div>
        <span className="text-[10px] text-brand-subtext">{candidates.length} candidates</span>
      </div>
      {candidates.length === 0 ? <p className="py-8 text-center text-xs text-brand-subtext">No Solana candidates in the latest radar scan. Refresh Early Radar first.</p> :
        <div className="mt-3 space-y-2">{candidates.map(({ token, scanner, analyst }) => <article key={token.address} className="rounded-xl border border-brand-border bg-brand-surface/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0"><div className="text-sm font-semibold text-white truncate">{token.name || 'Unknown token'} <span className="text-brand-subtext font-normal">${token.symbol || '—'}</span></div><div className="text-[10px] text-brand-subtext font-mono">{short(token.address)}</div></div>
            <span className={`text-[10px] font-bold rounded-full px-2 py-1 ${scanner.decision === 'PASS' ? 'bg-brand-green/10 text-brand-green' : 'bg-brand-red/10 text-brand-red'}`}>{scanner.decision}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
            <div className="text-brand-subtext">Liquidity <span className="block text-white font-semibold">{money(token.market?.liquidityUsd)}</span></div>
            <div className="text-brand-subtext">Analyst gate <span className={`block font-semibold ${analyst.decision === 'APPROVE' ? 'text-brand-green' : 'text-yellow-300'}`}>{analyst.decision} · score {Number(token.score || 0)}</span></div>
          </div>
          {scanner.reasons.length > 0 && <p className="text-[10px] text-brand-subtext mt-2 leading-relaxed">Review: {scanner.reasons.join(' · ')}</p>}
          {scanner.decision === 'PASS' && analyst.decision === 'APPROVE' && <p className="text-[10px] text-brand-accent mt-2">Gates passed; awaiting a validated executable quote and risk approval.</p>}
        </article>)}</div>}
    </div>

    <div className="rounded-2xl border border-brand-border bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-sm font-semibold text-white">Your paper-trade ledger</h3><p className="text-[11px] text-brand-subtext mt-1">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'User-scoped records from the secure API'}</p></div>
        <button onClick={loadTrades} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-brand-border px-3 py-2 text-xs text-white disabled:opacity-50"><RefreshCw size={13} className={loading ? 'animate-spin' : ''}/>{loading ? 'Loading…' : 'Refresh history'}</button>
      </div>
      {sessionState === 'signed-out' && <div className="mt-3 flex gap-2 rounded-lg bg-brand-border/50 p-3 text-xs text-brand-subtext"><LockKeyhole size={15} className="shrink-0"/> Sign in to the app to view your private paper-trade history. No public or cross-user records are shown.</div>}
      {error && <p className="mt-3 rounded-lg bg-brand-red/10 p-3 text-xs text-brand-red">{error}</p>}
      {sessionState === 'signed-in' && !error && trades.length === 0 && <p className="py-8 text-center text-xs text-brand-subtext">No paper trades recorded for this account yet.</p>}
      {trades.length > 0 && <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs">
        <thead className="text-brand-subtext"><tr><th className="py-2 pr-3">Token</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Entry</th><th className="py-2 pr-3">Exit</th><th className="py-2 pr-3">Realized P&L</th><th className="py-2">Opened</th></tr></thead>
        <tbody>{trades.map((trade) => <tr key={trade.id} className="border-t border-brand-border/70">
          <td className="py-3 pr-3 text-white font-medium">{trade.token_symbol || short(trade.token_address)}</td>
          <td className="py-3 pr-3"><span className={trade.status === 'OPEN' ? 'text-brand-accent' : 'text-brand-subtext'}>{trade.status}</span></td>
          <td className="py-3 pr-3 text-white">{money(trade.entry_price)}</td><td className="py-3 pr-3 text-white">{trade.exit_price ? money(trade.exit_price) : '—'}</td>
          <td className={`py-3 pr-3 font-semibold ${Number(trade.realized_pnl_usd || 0) >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>{trade.realized_pnl_usd == null ? '—' : money(trade.realized_pnl_usd)}</td>
          <td className="py-3 text-brand-subtext">{trade.opened_at ? new Date(trade.opened_at).toLocaleString() : '—'}</td>
        </tr>)}</tbody>
      </table></div>}
      {sessionState === 'checking' && <p className="py-5 text-center text-xs text-brand-subtext">Checking account session…</p>}
    </div>
    <p className="text-[10px] text-brand-subtext flex items-center gap-1"><ShieldCheck size={12}/> No live trading, wallet signing, or swaps are available in this panel.</p>
  </section>;
}

function Metric({ icon, label, value, positive }) {
  return <div className="rounded-xl border border-brand-border bg-black/20 p-3">
    <div className="flex items-center gap-1.5 text-[10px] text-brand-subtext">{icon}{label}</div>
    <div className={`mt-1 text-lg font-bold tabular-nums ${positive === undefined ? 'text-white' : positive ? 'text-brand-green' : 'text-brand-red'}`}>{value}</div>
  </div>;
}

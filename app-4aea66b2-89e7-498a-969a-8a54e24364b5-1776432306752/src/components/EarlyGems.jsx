import React from 'react';
import { ShieldCheck, ShieldAlert, Search, TrendingUp, ExternalLink } from 'lucide-react';

function shortAddress(value) { return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : '—'; }
function riskClass(token) {
  if (token.security?.isHoneypot === true) return 'text-brand-red';
  if (token.security?.status === 'checked') return 'text-brand-green';
  return 'text-yellow-300';
}

export default function EarlyGems({ tokens, trendingWords, loading, onRefresh }) {
  return <section className="space-y-4">
    <div className="rounded-2xl border border-brand-border bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-white font-semibold flex items-center gap-2"><Search size={17}/> Early Token Radar</h2><p className="text-brand-subtext text-xs mt-1">New contracts + fresh DEX profiles, filtered through market-flow and security signals.</p></div>
        <button onClick={onRefresh} disabled={loading} className="px-3 py-2 rounded-lg bg-brand-accent text-black text-xs font-semibold disabled:opacity-50">{loading ? 'Scanning…' : 'Scan again'}</button>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">{(trendingWords || []).slice(0, 12).map(word => <span key={word} className="px-2 py-1 rounded-full bg-brand-border/70 text-brand-subtext text-[11px]">#{word}</span>)}</div>
    </div>

    {tokens.length === 0 && !loading && <div className="rounded-2xl border border-brand-border p-10 text-center text-brand-subtext text-sm">No early-token candidates found yet.</div>}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {tokens.slice(0, 30).map(token => {
        const market = token.market || {}; const security = token.security || {};
        return <article key={`${token.chain}-${token.address}`} className="rounded-2xl border border-brand-border bg-black/20 p-4 hover:border-brand-accent/40 transition-colors">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2">
            {token.icon ? <img src={token.icon} alt="" className="w-8 h-8 rounded-full"/> : <div className="w-8 h-8 rounded-full bg-brand-border"/>}
            <div className="min-w-0"><h3 className="text-white font-semibold truncate">{token.name || 'Unknown token'} {token.symbol && <span className="text-brand-subtext">${token.symbol}</span>}</h3><p className="text-[10px] text-brand-subtext">{token.chainName} · {shortAddress(token.address)}</p></div>
          </div></div><div className="text-right shrink-0"><div className="text-lg font-bold text-white">{token.score ?? 0}</div><div className="text-[9px] text-brand-subtext uppercase tracking-wide">radar score</div></div></div>

          <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
            <div className="rounded-lg bg-brand-border/40 p-2"><div className="text-brand-subtext">Liquidity</div><div className="text-white font-semibold">${(market.liquidityUsd || 0).toLocaleString(undefined,{maximumFractionDigits:0})}</div></div>
            <div className="rounded-lg bg-brand-border/40 p-2"><div className="text-brand-subtext">1h volume</div><div className="text-white font-semibold">${(market.volume1h || 0).toLocaleString(undefined,{maximumFractionDigits:0})}</div></div>
            <div className="rounded-lg bg-brand-border/40 p-2"><div className="text-brand-subtext">5m flow</div><div className={market.buys5m >= market.sells5m ? 'text-brand-green font-semibold' : 'text-brand-red font-semibold'}>{market.buys5m || 0}/{market.sells5m || 0}</div></div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-[11px]">
            <span className={`flex items-center gap-1 ${riskClass(token)}`}>{security.isHoneypot === true ? <ShieldAlert size={13}/> : <ShieldCheck size={13}/>} {security.status === 'checked' ? `${security.source}: ${security.isHoneypot ? 'HONEYPOT' : 'passed checks'}` : 'Security not verified'}</span>
            <span className="text-brand-subtext flex items-center gap-1"><TrendingUp size={12}/> {(token.narrativeHits || []).slice(0,3).join(', ') || 'no narrative match'}</span>
          </div>
          {security.flags?.length > 0 && <div className="mt-2 text-[10px] text-brand-red">Flags: {security.flags.slice(0,4).join(' · ')}</div>}
          <div className="flex gap-2 mt-3">{market.url && <a href={market.url} target="_blank" rel="noreferrer" className="text-[11px] px-2.5 py-1.5 rounded-lg bg-brand-border text-brand-subtext hover:text-white">DEX</a>}{token.profileUrl && <a href={token.profileUrl} target="_blank" rel="noreferrer" className="text-[11px] px-2.5 py-1.5 rounded-lg bg-brand-border text-brand-subtext hover:text-white flex items-center gap-1">Profile <ExternalLink size={11}/></a>}</div>
        </article>;
      })}
    </div>
    <p className="text-[10px] text-brand-subtext">Radar score is a discovery heuristic, not a prediction or guarantee. A token marked “passed checks” can still be malicious or lose liquidity.</p>
  </section>;
}

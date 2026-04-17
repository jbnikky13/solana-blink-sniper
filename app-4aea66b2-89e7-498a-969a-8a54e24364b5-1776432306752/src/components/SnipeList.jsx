import React, { useState } from 'react';
import { Crosshair, Trash2, ExternalLink, CheckCircle, XCircle, Eye, Copy, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const STATUS_STYLES = {
  watching: { label: 'Watching', cls: 'bg-brand-accent/15 text-brand-accent border-brand-accent/30', Icon: Eye },
  sniped:   { label: 'Sniped',   cls: 'bg-brand-green/15 text-brand-green border-brand-green/30',   Icon: CheckCircle },
  dismissed:{ label: 'Dismissed',cls: 'bg-brand-red/15 text-brand-red border-brand-red/30',         Icon: XCircle },
};

function shortAddr(addr) {
  if (!addr) return '—';
  return `${addr.slice(0, 5)}…${addr.slice(-4)}`;
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1400); }}
      className="text-brand-muted hover:text-brand-accent transition-colors"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

export default function SnipeList({ targets, onUpdateStatus, onDelete }) {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? targets : targets.filter(t => t.status === filter);

  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-brand-border flex items-center gap-2 flex-wrap">
        <Crosshair size={15} className="text-brand-accent" />
        <span className="text-sm font-semibold text-white">Snipe Targets</span>

        {/* Filter tabs */}
        <div className="ml-auto flex items-center gap-1">
          {['all', 'watching', 'sniped', 'dismissed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all capitalize ${
                filter === f
                  ? 'bg-brand-accent text-black'
                  : 'text-brand-subtext hover:text-white hover:bg-white/5'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <span className="text-xs text-brand-subtext">{filtered.length}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center">
          <Crosshair size={28} className="text-brand-muted mx-auto mb-2" />
          <p className="text-brand-subtext text-sm">No targets yet.</p>
          <p className="text-brand-muted text-xs mt-1">Click the snipe icon on a transaction with token activity.</p>
        </div>
      ) : (
        <div className="divide-y divide-brand-border">
          {filtered.map(target => (
            <SnipeRow
              key={target.id}
              target={target}
              onUpdateStatus={onUpdateStatus}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SnipeRow({ target, onUpdateStatus, onDelete }) {
  const style = STATUS_STYLES[target.status] || STATUS_STYLES.watching;
  const StatusIcon = style.Icon;
  const age = target.created_at
    ? formatDistanceToNow(new Date(target.created_at), { addSuffix: true })
    : '—';

  return (
    <div className="px-4 py-3 flex items-center gap-3 flex-wrap hover:bg-white/5 transition-colors text-xs group">
      {/* Token address */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <a
            href={`https://explorer.solana.com/address/${target.token_address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-brand-accent hover:underline flex items-center gap-1"
          >
            {shortAddr(target.token_address)}
            <ExternalLink size={9} />
          </a>
          <CopyBtn text={target.token_address} />
          <a
            href={`https://dexscreener.com/solana/${target.token_address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-subtext hover:text-brand-green text-[10px] border border-brand-border rounded px-1.5 py-0.5 hover:border-brand-green/40 transition-colors"
          >
            DEX
          </a>
          <a
            href={`https://birdeye.so/token/${target.token_address}?chain=solana`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-subtext hover:text-brand-yellow text-[10px] border border-brand-border rounded px-1.5 py-0.5 hover:border-brand-yellow/40 transition-colors"
          >
            Birdeye
          </a>
        </div>
        {target.token_name && (
          <p className="text-brand-subtext mt-0.5">{target.token_name} {target.token_symbol && `(${target.token_symbol})`}</p>
        )}
        <p className="text-brand-muted mt-0.5">Slot {target.slot?.toLocaleString() || '—'} · {age}</p>
      </div>

      {/* Status badge */}
      <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold tracking-wide flex items-center gap-1 ${style.cls}`}>
        <StatusIcon size={9} />
        {style.label}
      </span>

      {/* Status actions */}
      <div className="flex items-center gap-1">
        {target.status !== 'watching' && (
          <button
            onClick={() => onUpdateStatus(target.id, 'watching')}
            className="px-2 py-1 rounded text-[10px] border border-brand-border text-brand-subtext hover:border-brand-accent hover:text-brand-accent transition-colors"
          >
            Watch
          </button>
        )}
        {target.status !== 'sniped' && (
          <button
            onClick={() => onUpdateStatus(target.id, 'sniped')}
            className="px-2 py-1 rounded text-[10px] border border-brand-border text-brand-subtext hover:border-brand-green hover:text-brand-green transition-colors"
          >
            Sniped
          </button>
        )}
        {target.status !== 'dismissed' && (
          <button
            onClick={() => onUpdateStatus(target.id, 'dismissed')}
            className="px-2 py-1 rounded text-[10px] border border-brand-border text-brand-subtext hover:border-brand-red hover:text-brand-red transition-colors"
          >
            Dismiss
          </button>
        )}
        <button
          onClick={() => onDelete(target.id)}
          className="p-1 rounded text-brand-muted hover:text-brand-red hover:bg-brand-red/10 transition-colors ml-1"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

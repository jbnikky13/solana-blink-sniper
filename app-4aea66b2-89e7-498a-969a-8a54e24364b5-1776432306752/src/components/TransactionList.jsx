import React, { useState } from 'react';
import { Activity, ExternalLink, Copy, Check, Crosshair } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const TYPE_STYLES = {
  swap:     { label: 'SWAP',     cls: 'bg-brand-green/15 text-brand-green border-brand-green/30' },
  token_op: { label: 'TOKEN',    cls: 'bg-brand-purple/15 text-brand-purple border-brand-purple/30' },
  transfer: { label: 'TRANSFER', cls: 'bg-brand-accent/15 text-brand-accent border-brand-accent/30' },
  unknown:  { label: 'OTHER',    cls: 'bg-brand-muted/20 text-brand-subtext border-brand-muted/20' },
};

function shortAddr(addr) {
  if (!addr) return '—';
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="text-brand-muted hover:text-brand-accent transition-colors">
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

export default function TransactionList({ transactions, onSnipe }) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-brand-surface border border-brand-border rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[200px]">
        <Activity size={28} className="text-brand-muted mb-2" />
        <p className="text-brand-subtext text-sm">No transactions loaded.</p>
        <p className="text-brand-muted text-xs mt-1">Scan to fetch recent on-chain activity.</p>
      </div>
    );
  }

  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-brand-border flex items-center gap-2">
        <Activity size={15} className="text-brand-accent" />
        <span className="text-sm font-semibold text-white">Recent Transactions</span>
        <span className="ml-auto text-xs text-brand-subtext">{transactions.length} txs</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-brand-border text-brand-muted uppercase tracking-wider">
              <th className="px-4 py-2 text-left font-medium">Signature</th>
              <th className="px-4 py-2 text-left font-medium">Type</th>
              <th className="px-4 py-2 text-left font-medium">Programs</th>
              <th className="px-4 py-2 text-left font-medium">Signer</th>
              <th className="px-4 py-2 text-left font-medium">Tokens</th>
              <th className="px-4 py-2 text-left font-medium">Fee (SOL)</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-left font-medium">Age</th>
              <th className="px-4 py-2 text-center font-medium">Snipe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {transactions.map((tx) => (
              <TxRow key={tx.sig} tx={tx} onSnipe={onSnipe} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TxRow({ tx, onSnipe }) {
  const typeStyle = TYPE_STYLES[tx.type] || TYPE_STYLES.unknown;
  const age = tx.blockTime ? formatDistanceToNow(new Date(tx.blockTime * 1000), { addSuffix: true }) : '—';
  const feeSOL = (tx.fee / 1e9).toFixed(6);
  const hasMints = tx.mints && tx.mints.length > 0;

  return (
    <tr className="hover:bg-white/5 transition-colors group">
      {/* Signature */}
      <td className="px-4 py-2.5 font-mono">
        <div className="flex items-center gap-1">
          <a
            href={`https://explorer.solana.com/tx/${tx.sig}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-accent hover:underline flex items-center gap-1"
          >
            {shortAddr(tx.sig)}
            <ExternalLink size={9} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
          <CopyButton text={tx.sig} />
        </div>
      </td>

      {/* Type badge */}
      <td className="px-4 py-2.5">
        <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold tracking-wide ${typeStyle.cls}`}>
          {typeStyle.label}
        </span>
      </td>

      {/* Programs */}
      <td className="px-4 py-2.5 text-brand-subtext">
        {tx.programs.length > 0 ? tx.programs.join(', ') : '—'}
      </td>

      {/* Signer */}
      <td className="px-4 py-2.5 font-mono text-brand-subtext">
        <div className="flex items-center gap-1">
          {shortAddr(tx.signer)}
          {tx.signer && <CopyButton text={tx.signer} />}
        </div>
      </td>

      {/* Tokens */}
      <td className="px-4 py-2.5">
        {true ? (
          <div className="flex flex-wrap gap-1">
            {tx.mints.slice(0, 2).map((mint) => (
              <a
                key={mint}
                href={`https://explorer.solana.com/address/${mint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-brand-purple hover:underline"
              >
                {shortAddr(mint)}
              </a>
            ))}
            {tx.mints.length > 2 && (
              <span className="text-brand-muted">+{tx.mints.length - 2}</span>
            )}
          </div>
        ) : (
          <span className="text-brand-muted">—</span>
        )}
      </td>

      {/* Fee */}
      <td className="px-4 py-2.5 font-mono text-brand-subtext">{feeSOL}</td>

      {/* Status */}
      <td className="px-4 py-2.5">
        {tx.err ? (
          <span className="text-brand-red font-semibold">FAILED</span>
        ) : (
          <span className="text-brand-green font-semibold">OK</span>
        )}
      </td>

      {/* Age */}
      <td className="px-4 py-2.5 text-brand-subtext whitespace-nowrap">{age}</td>

      {/* Snipe button */}
      <td className="px-4 py-2.5 text-center">
        {true ? (
          <button
            onClick={() => onSnipe(tx)}
            className="text-brand-muted hover:text-brand-accent transition-colors p-1 rounded hover:bg-brand-accent/10"
            title="Add to snipe list"
          >
            <Crosshair size={14} />
          </button>
        ) : (
          <span className="text-brand-border">—</span>
        )}
      </td>
    </tr>
  );
}

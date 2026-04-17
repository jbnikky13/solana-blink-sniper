import React from 'react';
import { Activity, Layers, Crosshair, TrendingUp } from 'lucide-react';

export default function StatsBar({ blocks, transactions, targets }) {
  const totalTxs = blocks.reduce((s, b) => s + b.txCount, 0);
  const swaps = transactions.filter(t => t.type === 'swap').length;
  const tokenOps = transactions.filter(t => t.type === 'token_op').length;
  const watching = targets.filter(t => t.status === 'watching').length;
  const sniped = targets.filter(t => t.status === 'sniped').length;

  const stats = [
    { icon: Layers,    label: 'Blocks Scanned',   value: blocks.length,     color: 'text-brand-accent' },
    { icon: Activity,  label: 'Total Block TXs',   value: totalTxs.toLocaleString(), color: 'text-white' },
    { icon: TrendingUp,label: 'Swaps Detected',    value: swaps,             color: 'text-brand-green' },
    { icon: Activity,  label: 'Token Operations',  value: tokenOps,          color: 'text-brand-purple' },
    { icon: Crosshair, label: 'Watching Targets',  value: watching,          color: 'text-brand-yellow' },
    { icon: Crosshair, label: 'Sniped',            value: sniped,            color: 'text-brand-green' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="bg-brand-surface border border-brand-border rounded-xl px-4 py-3 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-brand-muted">
            <Icon size={12} />
            <span className="text-[11px]">{label}</span>
          </div>
          <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
        </div>
      ))}
    </div>
  );
}

import React from 'react';
import { Layers, ExternalLink, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function BlockList({ blocks }) {
  if (!blocks || blocks.length === 0) {
    return (
      <div className="bg-brand-surface border border-brand-border rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[200px]">
        <Layers size={28} className="text-brand-muted mb-2" />
        <p className="text-brand-subtext text-sm">No blocks scanned yet.</p>
        <p className="text-brand-muted text-xs mt-1">Click "Scan Now" to fetch the 10 most recent blocks.</p>
      </div>
    );
  }

  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-brand-border flex items-center gap-2">
        <Layers size={15} className="text-brand-accent" />
        <span className="text-sm font-semibold text-white">Recent Blocks</span>
        <span className="ml-auto text-xs text-brand-subtext">{blocks.length} blocks</span>
      </div>
      <div className="divide-y divide-brand-border">
        {blocks.map((block) => (
          <BlockRow key={block.slot} block={block} />
        ))}
      </div>
    </div>
  );
}

function BlockRow({ block }) {
  const blockTime = block.blockTime ? new Date(block.blockTime * 1000) : null;

  const txVolume = block.txCount;
  const volumeColor =
    txVolume > 1500 ? 'text-brand-green' :
    txVolume > 800 ? 'text-brand-yellow' :
    'text-brand-subtext';

  return (
    <div className="px-4 py-2.5 flex items-center gap-4 hover:bg-white/5 transition-colors group text-xs">
      {/* Slot */}
      <div className="w-28 flex-shrink-0">
        <a
          href={`https://explorer.solana.com/block/${block.slot}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-brand-accent hover:underline flex items-center gap-1"
        >
          {block.slot.toLocaleString()}
          <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      </div>

      {/* Time */}
      <div className="w-32 flex-shrink-0 flex items-center gap-1 text-brand-subtext">
        <Clock size={10} />
        <span>{blockTime ? format(blockTime, 'HH:mm:ss') : '—'}</span>
      </div>

      {/* TX Count */}
      <div className={`w-20 flex-shrink-0 font-mono font-semibold ${volumeColor}`}>
        {txVolume.toLocaleString()} txs
      </div>

      {/* Blockhash */}
      <div className="flex-1 min-w-0 font-mono text-brand-muted truncate">
        {block.blockhash}
      </div>

      {/* Volume bar */}
      <div className="w-20 flex-shrink-0">
        <div className="h-1.5 rounded-full bg-brand-border overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-accent to-brand-purple transition-all"
            style={{ width: `${Math.min((block.txCount / 2500) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

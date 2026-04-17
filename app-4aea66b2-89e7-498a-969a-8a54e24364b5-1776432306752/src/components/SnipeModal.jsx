import React, { useState } from 'react';
import { X, Crosshair, ExternalLink } from 'lucide-react';

function shortAddr(addr) {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

export default function SnipeModal({ tx, onConfirm, onClose }) {
  const [selectedMint, setSelectedMint] = useState(tx?.mints?.[0] || '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!tx) return null;

  const handleConfirm = async () => {
    if (!selectedMint) return;
    setSubmitting(true);
    await onConfirm({ tx, mint: selectedMint, notes });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-brand-surface border border-brand-border rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crosshair size={18} className="text-brand-accent" />
            <span className="font-semibold text-white">Add Snipe Target</span>
          </div>
          <button onClick={onClose} className="text-brand-muted hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* TX reference */}
          <div>
            <label className="text-xs text-brand-subtext mb-1 block">Source Transaction</label>
            <a
              href={`https://explorer.solana.com/tx/${tx.sig}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-brand-accent hover:underline flex items-center gap-1"
            >
              {shortAddr(tx.sig)} <ExternalLink size={10} />
            </a>
          </div>

          {/* Mint selection */}
          <div>
            <label className="text-xs text-brand-subtext mb-1 block">Token Mint Address</label>
            {tx.mints.length > 1 ? (
              <select
                value={selectedMint}
                onChange={e => setSelectedMint(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand-accent"
              >
                {tx.mints.map(mint => (
                  <option key={mint} value={mint}>{mint}</option>
                ))}
              </select>
            ) : (
              <div className="font-mono text-xs text-white bg-brand-bg border border-brand-border rounded-lg px-3 py-2 break-all">
                {selectedMint}
              </div>
            )}
          </div>

          {/* Programs */}
          {tx.programs.length > 0 && (
            <div>
              <label className="text-xs text-brand-subtext mb-1 block">Programs Involved</label>
              <div className="flex flex-wrap gap-1">
                {tx.programs.map(p => (
                  <span key={p} className="px-2 py-0.5 rounded bg-brand-purple/20 text-brand-purple text-[10px] border border-brand-purple/30 font-semibold">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs text-brand-subtext mb-1 block">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Why are you watching this token?"
              className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-xs text-white placeholder-brand-muted focus:outline-none focus:border-brand-accent resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-brand-border flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-brand-subtext hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedMint || submitting}
            className="px-4 py-2 rounded-lg text-sm bg-brand-accent text-black font-semibold hover:bg-cyan-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Crosshair size={14} />
            {submitting ? 'Saving…' : 'Add Target'}
          </button>
        </div>
      </div>
    </div>
  );
}

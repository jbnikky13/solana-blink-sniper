import React from 'react';
import { Crosshair, Wifi, WifiOff, RefreshCw, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Header({ networkStats, loading, lastScan, onScan }) {
  return (
    <header className="border-b border-brand-border bg-brand-surface">
      <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-accent to-brand-purple flex items-center justify-center">
              <Crosshair size={20} className="text-black" />
            </div>
            {loading && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-brand-accent animate-ping" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-none">
              Blink-N-Snipe
            </h1>
            <p className="text-xs text-brand-subtext leading-none mt-0.5">Solana Block Scanner</p>
          </div>
        </div>

        {/* Network Stats */}
        <div className="flex items-center gap-6 flex-wrap">
          {networkStats ? (
            <>
              <Stat label="Slot" value={networkStats.slot?.toLocaleString()} color="text-brand-accent" />
              <Stat label="TPS" value={networkStats.tps?.toLocaleString()} color="text-brand-green" />
              <Stat label="Epoch" value={networkStats.epoch} color="text-brand-purple" />
              <div className="flex items-center gap-1.5 text-xs text-brand-green">
                <Wifi size={13} />
                <span>Live</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-brand-subtext">
              <WifiOff size={13} />
              <span>Not connected</span>
            </div>
          )}

          {lastScan && (
            <div className="flex items-center gap-1 text-xs text-brand-subtext">
              <Clock size={11} />
              <span>{formatDistanceToNow(lastScan, { addSuffix: true })}</span>
            </div>
          )}
        </div>

        {/* Scan Button */}
        <button
          onClick={onScan}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent text-black font-semibold text-sm hover:bg-cyan-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Scanning…' : 'Scan Now'}
        </button>
      </div>
    </header>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="text-center">
      <div className={`text-sm font-mono font-bold ${color}`}>{value ?? '—'}</div>
      <div className="text-xs text-brand-subtext">{label}</div>
    </div>
  );
}

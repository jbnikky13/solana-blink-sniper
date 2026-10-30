import test from 'node:test';
import assert from 'node:assert/strict';
import { getRadarSignal } from './radarSignals.js';

test('Solana candidates with estimated holder data stay in VERIFY', () => {
  const result = getRadarSignal({
    chain: 'solana',
    score: 92,
    market: { liquidityUsd: 90000, buys5m: 20, sells5m: 5 },
    security: {
      status: 'partial',
      isHoneypot: false,
      mintAuthorityRevoked: true,
      freezeAuthorityRevoked: true,
      holderConcentrationStatus: 'estimated',
      top10HolderPct: 12,
    },
  });
  assert.equal(result.signal, 'VERIFY');
});

test('Solana candidates below $40k liquidity cannot become HOT', () => {
  const result = getRadarSignal({
    chain: 'solana',
    score: 90,
    market: { liquidityUsd: 39999, buys5m: 20, sells5m: 5 },
    security: {
      status: 'verified',
      isHoneypot: false,
      mintAuthorityRevoked: true,
      freezeAuthorityRevoked: true,
      holderConcentrationStatus: 'verified',
      top10HolderPct: 12,
    },
  });
  assert.equal(result.signal, 'WATCH');
});

test('existing EVM radar behavior remains available', () => {
  const result = getRadarSignal({
    chain: 'arc',
    score: 75,
    market: { liquidityUsd: 10000, buys5m: 12, sells5m: 5 },
    security: { status: 'checked', isHoneypot: false },
  });
  assert.equal(result.signal, 'HOT');
});

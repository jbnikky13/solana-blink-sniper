import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSolanaScannerGate } from './scannerGate.js';

const verifiedSecurity = {
  status: 'verified',
  isHoneypot: false,
  mintAuthorityRevoked: true,
  freezeAuthorityRevoked: true,
  holderConcentrationStatus: 'verified',
  top10HolderPct: 18.4,
};

test('rejects tokens below the configured liquidity threshold', () => {
  const result = evaluateSolanaScannerGate({ market: { liquidityUsd: 39999 }, security: verifiedSecurity });
  assert.equal(result.decision, 'REJECT');
  assert.match(result.reasons[0], /Liquidity below/);
});

test('rejects active mint or freeze authorities', () => {
  const mint = evaluateSolanaScannerGate({ market: { liquidityUsd: 50000 }, security: { ...verifiedSecurity, mintAuthorityRevoked: false } });
  const freeze = evaluateSolanaScannerGate({ market: { liquidityUsd: 50000 }, security: { ...verifiedSecurity, freezeAuthorityRevoked: false } });
  assert.equal(mint.decision, 'REJECT');
  assert.equal(freeze.decision, 'REJECT');
});

test('rejects top-holder concentration above 25 percent', () => {
  const result = evaluateSolanaScannerGate({ market: { liquidityUsd: 50000 }, security: { ...verifiedSecurity, top10HolderPct: 25.01 } });
  assert.equal(result.decision, 'REJECT');
});

test('keeps estimated or incomplete holder data in review, never pass', () => {
  const result = evaluateSolanaScannerGate({
    market: { liquidityUsd: 50000 },
    security: { ...verifiedSecurity, status: 'partial', holderConcentrationStatus: 'estimated' },
  });
  assert.equal(result.decision, 'REVIEW');
});

test('passes only when all gates are explicitly verified', () => {
  const result = evaluateSolanaScannerGate({ market: { liquidityUsd: 50000 }, security: verifiedSecurity });
  assert.equal(result.decision, 'PASS');
});

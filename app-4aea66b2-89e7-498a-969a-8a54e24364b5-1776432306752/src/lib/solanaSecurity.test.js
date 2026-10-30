import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeLargestAccounts } from './solanaSecurity.js';

test('aggregates multiple large token accounts belonging to the same wallet', () => {
  const accounts = [
    { amount: '400' }, { amount: '300' }, { amount: '200' }, { amount: '100' },
  ];
  const details = [
    { data: { parsed: { info: { owner: 'wallet-a' } } } },
    { data: { parsed: { info: { owner: 'wallet-a' } } } },
    { data: { parsed: { info: { owner: 'wallet-b' } } } },
    { data: { parsed: { info: { owner: 'wallet-c' } } } },
  ];
  const result = summarizeLargestAccounts(accounts, details, '1000');
  assert.equal(result.status, 'estimated');
  assert.equal(result.top10HolderPct, 100);
  assert.equal(result.uniqueOwners, 3);
});

test('fails closed when owner data is incomplete', () => {
  const result = summarizeLargestAccounts(
    [{ amount: '500' }],
    [{ data: { parsed: { info: {} } } }],
    '1000',
  );
  assert.equal(result.status, 'unavailable');
  assert.equal(result.top10HolderPct, null);
});

test('fails closed when supply is invalid or zero', () => {
  const accounts = [{ amount: '500' }];
  const details = [{ data: { parsed: { info: { owner: 'wallet-a' } } } }];
  assert.equal(summarizeLargestAccounts(accounts, details, '0').status, 'unavailable');
  assert.equal(summarizeLargestAccounts(accounts, details, 'not-a-number').status, 'unavailable');
});

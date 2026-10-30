import test from 'node:test';
import assert from 'node:assert/strict';
import {isValidPaperTrade} from './paperTradeValidation.js';

const valid={
 idempotencyKey:'paper-1',chain:'solana',tokenAddress:'mint',tokenSymbol:'TEST',
 status:'OPEN',openedAt:'2026-10-30T10:00:00.000Z',strategy:'solana-paper-v1',
 quantity:100,entryPrice:1,entryReferenceBid:.999,entryReferenceAsk:1.001,
 stopPrice:.94,highWaterPrice:1,trailingStopPrice:null,notionalUsd:100,
 riskBudgetUsd:10,entryFeeUsd:1,feeBps:100,slippageBps:100
};

test('accepts a structurally valid paper trade',()=>assert.equal(isValidPaperTrade(valid),true));
test('rejects missing idempotency key',()=>assert.equal(isValidPaperTrade({...valid,idempotencyKey:''}),false));
test('rejects non-Solana or non-open trade',()=>{assert.equal(isValidPaperTrade({...valid,chain:'ethereum'}),false);assert.equal(isValidPaperTrade({...valid,status:'CLOSED'}),false);});
test('rejects inverted bid ask and invalid stop',()=>{assert.equal(isValidPaperTrade({...valid,entryReferenceBid:1.1,entryReferenceAsk:1}),false);assert.equal(isValidPaperTrade({...valid,stopPrice:1}),false);});
test('rejects position size above 20x risk budget',()=>assert.equal(isValidPaperTrade({...valid,notionalUsd:201}),false));
test('rejects excessive fees and slippage',()=>{assert.equal(isValidPaperTrade({...valid,feeBps:10001}),false);assert.equal(isValidPaperTrade({...valid,slippageBps:5001}),false);});

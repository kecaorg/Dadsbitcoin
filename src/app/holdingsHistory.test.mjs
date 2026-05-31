import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getBtcAmountAt, getCurrentBtcAmount, makeHoldingEvent } from './holdingsHistory.mjs';

test('uses the starting BTC amount for historical dates before later updates', () => {
  const events = [
    makeHoldingEvent('2025-05-31T00:00:00.000Z', 0.042),
    makeHoldingEvent('2026-06-15T00:00:00.000Z', 0.05),
  ];

  assert.equal(getBtcAmountAt(events, Date.parse('2025-12-01T00:00:00.000Z')), 0.042);
  assert.equal(getBtcAmountAt(events, Date.parse('2026-06-14T23:59:59.000Z')), 0.042);
});

test('uses a later BTC amount only from its effective date forward', () => {
  const events = [
    makeHoldingEvent('2025-05-31T00:00:00.000Z', 0.042),
    makeHoldingEvent('2026-06-15T00:00:00.000Z', 0.05),
  ];

  assert.equal(getBtcAmountAt(events, Date.parse('2026-06-15T00:00:00.000Z')), 0.05);
  assert.equal(getBtcAmountAt(events, Date.parse('2026-07-01T00:00:00.000Z')), 0.05);
});

test('current BTC amount is the most recent effective holding', () => {
  const events = [
    makeHoldingEvent('2025-05-31T00:00:00.000Z', 0.042),
    makeHoldingEvent('2026-06-15T00:00:00.000Z', 0.05),
  ];

  assert.equal(getCurrentBtcAmount(events), 0.05);
});

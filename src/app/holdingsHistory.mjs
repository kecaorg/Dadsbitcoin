export const DAD_BTC_HOLDING_EVENTS = [
  // Starting point for the chart history. Future BTC changes should be added
  // as new dated entries here instead of editing this one, so old chart values
  // keep using the amount Dad had at that time.
  makeHoldingEvent('2025-05-31T00:00:00.000Z', 0.042),
];

export function makeHoldingEvent(effectiveAt, amount) {
  const timestamp = Date.parse(effectiveAt);
  const btcAmount = Number(amount);

  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid holding effective date: ${effectiveAt}`);
  }

  if (!Number.isFinite(btcAmount) || btcAmount < 0) {
    throw new Error(`Invalid BTC amount: ${amount}`);
  }

  return { effectiveAt, timestamp, btcAmount };
}

export function sortHoldingEvents(events) {
  return [...events].sort((a, b) => a.timestamp - b.timestamp);
}

export function getBtcAmountAt(events, timestamp) {
  const sorted = sortHoldingEvents(events);

  if (!sorted.length) {
    return 0;
  }

  let active = sorted[0];
  for (const event of sorted) {
    if (event.timestamp > timestamp) {
      break;
    }
    active = event;
  }

  return active.btcAmount;
}

export function getCurrentBtcAmount(events) {
  const sorted = sortHoldingEvents(events);
  return sorted.at(-1)?.btcAmount ?? 0;
}

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BASELINE_PEAK_W, BATTERY_CAPACITY_WH, DAY_TICKS, EV_TARGET_WH, initialGridState, isGridState, stepGrid,
} from '../play/microgrid.mjs';
import {gridDatabase, openGridSession, PROGRESS_DATABASE, STEP_MS} from '../play/session.mjs';

function memoryStore() {
  let record = null;
  return {
    read: async () => structuredClone(record),
    async commit(expected, next) {
      if ((record?.revision ?? null) !== expected) return 'conflict';
      record = structuredClone(next);
      return 'committed';
    },
  };
}

const schedule = {type: 'schedule-ev', startTick: 44, endTick: 64};
const battery = {type: 'battery-mode', mode: 'auto'};

test('quarter-hour energy balances, charging power, capacity and baseline remain consistent through day end', () => {
  let state = initialGridState();
  for (let tick = 0; tick < DAY_TICKS; tick++) {
    state = stepGrid(state);
    assert.ok(isGridState(state), 'tick ' + state.tick);
  }
  assert.equal(state.evWh, EV_TARGET_WH);
  assert.equal(state.totals.peakW, BASELINE_PEAK_W);
  assert.equal(stepGrid(state), state);
  assert.equal(isGridState({...state, totals: {...state.totals, lossWh: state.totals.lossWh + 1}}), false);
});

test('manual and autoplay match through 96 ticks with the same actions at ticks 24 and 48', async () => {
  const manual = await openGridSession(memoryStore());
  const auto = await openGridSession(memoryStore());
  let time = 0;
  const autoplay = steps => {
    assert.equal(auto.frame(time), 0, 're-anchor after a committed action');
    for (let i = 0; i < steps; i++) assert.equal(auto.frame(time += STEP_MS), 1);
  };

  manual.advanceSteps(24);
  autoplay(24);
  for (const session of [manual, auto]) {
    const result = await session.dispatch('ev-at-24', schedule);
    assert.equal(result.status, 'applied');
    assert.equal(result.receipt.result.tick, 24);
  }
  manual.advanceSteps(24);
  autoplay(24);
  for (const session of [manual, auto]) {
    const result = await session.dispatch('battery-at-48', battery);
    assert.equal(result.status, 'applied');
    assert.equal(result.receipt.result.tick, 48);
  }
  manual.advanceSteps(48);
  autoplay(48);

  const state = manual.snapshot();
  assert.deepEqual(state, auto.snapshot());
  assert.equal(state.tick, DAY_TICKS);
  assert.ok(isGridState(state));
  assert.equal(state.evWh, EV_TARGET_WH);
  assert.ok(state.totals.peakW < BASELINE_PEAK_W);
  const deltas = state.batteryHistory.slice(1).map((stored, i) => stored - state.batteryHistory[i]);
  assert.ok(deltas.some(delta => delta > 0) && deltas.some(delta => delta < 0));
  assert.ok(deltas.every(delta => delta <= 900 && delta >= -1_112));
  assert.ok(state.batteryHistory.every(stored => stored >= 0 && stored <= BATTERY_CAPACITY_WH));
});

test('checkpoint halfway through the day reopens at exactly the same time and rejects a stale schedule', async () => {
  const store = memoryStore();
  const first = await openGridSession(store);
  first.advanceSteps(48);
  assert.equal((await first.checkpoint()).status, 'saved');
  const restored = await openGridSession(store);
  assert.deepEqual(restored.snapshot(), first.snapshot());
  assert.equal(restored.frame(100_000), 0);
  assert.deepEqual(await restored.dispatch('elapsed', {type: 'schedule-ev', startTick: 2, endTick: 20}),
    {status: 'rejected', reason: 'invalid-schedule'});
  assert.equal(restored.inspect().revision, 1);
  assert.equal(restored.snapshot().tick, 48);
});

test('the ordinary route and named QA sessions use separate database names', () => {
  assert.equal(gridDatabase(new URL('https://smartgridtwin.com/play/')), PROGRESS_DATABASE);
  assert.equal(gridDatabase(new URL('http://127.0.0.1:4192/play/')), PROGRESS_DATABASE);
  for (const origin of ['http://127.0.0.1:4192', 'https://test-run.smartgridtwin-com.pages.dev']) {
    assert.equal(gridDatabase(new URL('/play/?qa-session=manual-clock', origin)),
      'smartgridtwin.qa.microgrid.v1-manual-clock');
  }
  for (const url of [
    'https://smartgridtwin.com/play/?qa-session=manual-clock',
    'https://www.smartgridtwin.com/play/?qa-session=manual-clock',
    'https://smartgridtwin-com.pages.dev/play/?qa-session=manual-clock',
    'https://test-run.smartgridtwin-com.pages.dev.invalid/play/?qa-session=manual-clock',
    'http://127.0.0.1:4192/play/?qa-session=bad',
    'http://127.0.0.1:4192/play/?qa-session=manual-clock&qa-session=other-slot',
  ]) assert.equal(gridDatabase(new URL(url)), null);
});

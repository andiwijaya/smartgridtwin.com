export const DAY_TICKS = 96;
export const BATTERY_CAPACITY_WH = 10_000;
export const EV_TARGET_WH = 12_000;
const INITIAL_BATTERY_WH = 2_000;
const BATTERY_LIMIT_WH = 1_000;
const EV_LIMIT_WH = 1_800;

// One tick is a quarter hour. Profiles hold constant within each scenario hour.
const HOUSE_W = [
  900, 820, 760, 720, 720, 880, 1_600, 2_400, 2_000, 1_300, 1_100, 1_200,
  1_400, 1_300, 1_100, 1_200, 1_640, 2_300, 4_200, 4_400, 4_100, 3_100, 1_800, 1_200,
];
const SOLAR_W = [
  0, 0, 0, 0, 0, 0, 400, 1_200, 2_200, 3_700, 5_000, 6_200,
  6_500, 6_000, 4_700, 3_100, 1_500, 400, 0, 0, 0, 0, 0, 0,
];

export function initialGridState() {
  return {
    schemaVersion: 1,
    scenario: 'rooftop-day-v1',
    tick: 0,
    plan: {startTick: 72, endTick: 88, batteryMode: 'hold'},
    batteryWh: INITIAL_BATTERY_WH,
    evWh: 0,
    totals: {solarWh: 0, houseWh: 0, gridWh: 0, spillWh: 0, lossWh: 0, peakW: 0},
    batteryHistory: [INITIAL_BATTERY_WH],
    last: null,
  };
}

export function stepGrid(state) {
  if (state.tick >= DAY_TICKS) return state;
  const {tick, plan} = state;
  const hour = Math.floor(tick / 4);
  const solarWh = SOLAR_W[hour] / 4;
  const houseWh = HOUSE_W[hour] / 4;
  const evWh = tick >= plan.startTick && tick < plan.endTick
    ? Math.min(EV_LIMIT_WH, EV_TARGET_WH - state.evWh) : 0;
  let balanceWh = solarWh - houseWh - evWh;
  let batteryWh = state.batteryWh;
  let lossWh = 0;

  if (plan.batteryMode === 'auto' && balanceWh > 0 && batteryWh < BATTERY_CAPACITY_WH) {
    const inputWh = Math.min(balanceWh, BATTERY_LIMIT_WH,
      Math.ceil((BATTERY_CAPACITY_WH - batteryWh) * 10 / 9));
    const storedWh = Math.floor(inputWh * 9 / 10);
    batteryWh += storedWh;
    balanceWh -= inputWh;
    lossWh = inputWh - storedWh;
  } else if (plan.batteryMode === 'auto' && balanceWh < 0 && batteryWh > 0) {
    const outputWh = Math.min(-balanceWh, BATTERY_LIMIT_WH, Math.floor(batteryWh * 9 / 10));
    const withdrawnWh = Math.ceil(outputWh * 10 / 9);
    batteryWh -= withdrawnWh;
    balanceWh += outputWh;
    lossWh = withdrawnWh - outputWh;
  }

  const gridWh = Math.max(0, -balanceWh);
  const spillWh = Math.max(0, balanceWh);
  return {
    ...state,
    tick: tick + 1,
    batteryWh,
    evWh: state.evWh + evWh,
    totals: {
      solarWh: state.totals.solarWh + solarWh,
      houseWh: state.totals.houseWh + houseWh,
      gridWh: state.totals.gridWh + gridWh,
      spillWh: state.totals.spillWh + spillWh,
      lossWh: state.totals.lossWh + lossWh,
      peakW: Math.max(state.totals.peakW, gridWh * 4),
    },
    batteryHistory: [...state.batteryHistory, batteryWh],
    last: {tick, solarWh, houseWh, evWh, gridWh, spillWh, lossWh, batteryDeltaWh: batteryWh - state.batteryWh},
  };
}

const validInteger = (value, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  Number.isSafeInteger(value) && value >= min && value <= max;
const validMode = value => value === 'hold' || value === 'auto';
const totalFields = ['solarWh', 'houseWh', 'gridWh', 'spillWh', 'lossWh', 'peakW'];
const flowFields = ['solarWh', 'houseWh', 'evWh', 'gridWh', 'spillWh', 'lossWh'];
const isInterval = ({startTick, endTick}) =>
  validInteger(startTick, 0, DAY_TICKS - 1) && validInteger(endTick, startTick + 1, DAY_TICKS);

export function isGridState(state) {
  if (!state || state.schemaVersion !== 1 || state.scenario !== 'rooftop-day-v1'
    || !validInteger(state.tick, 0, DAY_TICKS) || !state.plan || !isInterval(state.plan)
    || !validMode(state.plan.batteryMode) || !validInteger(state.evWh, 0, EV_TARGET_WH)
    || !validInteger(state.batteryWh, 0, BATTERY_CAPACITY_WH)
    || !state.totals || !totalFields.every(key => validInteger(state.totals[key]))
    || !Array.isArray(state.batteryHistory) || state.batteryHistory.length !== state.tick + 1
    || !state.batteryHistory.every(value => validInteger(value, 0, BATTERY_CAPACITY_WH))
    || state.batteryHistory[0] !== INITIAL_BATTERY_WH || state.batteryHistory.at(-1) !== state.batteryWh) return false;

  const {solarWh, houseWh, gridWh, spillWh, lossWh, peakW} = state.totals;
  if (solarWh + gridWh + INITIAL_BATTERY_WH !== houseWh + state.evWh + state.batteryWh + spillWh + lossWh) {
    return false;
  }

  if (state.tick === 0) return state.last === null && state.evWh === 0 && totalFields.every(key => state.totals[key] === 0);
  const flow = state.last;
  return !!flow && flow.tick === state.tick - 1 && flowFields.every(key => validInteger(flow[key]))
    && state.batteryWh - state.batteryHistory.at(-2) === flow.batteryDeltaWh && flow.gridWh * 4 <= peakW
    && flow.solarWh + flow.gridWh === flow.houseWh + flow.evWh + flow.spillWh + flow.lossWh + flow.batteryDeltaWh;
}

export function actionKey(action) {
  if (!action || typeof action !== 'object') return '';
  if (action.type === 'schedule-ev' && Object.keys(action).length === 3
    && Number.isSafeInteger(action.startTick) && Number.isSafeInteger(action.endTick)) {
    return JSON.stringify([action.type, action.startTick, action.endTick]);
  }
  if (action.type === 'battery-mode' && Object.keys(action).length === 2 && validMode(action.mode)) {
    return JSON.stringify([action.type, action.mode]);
  }
  return '';
}

export function applyGridAction(state, action) {
  if (state.tick >= DAY_TICKS) return {ok: false, reason: 'day-complete'};
  if (action.type === 'schedule-ev') {
    const {startTick, endTick} = action;
    if (!isInterval({startTick, endTick}) || endTick <= state.tick) return {ok: false, reason: 'invalid-schedule'};
    return {ok: true, state: {...state, plan: {...state.plan, startTick, endTick}},
      result: {type: action.type, tick: state.tick}};
  }
  if (action.type === 'battery-mode' && validMode(action.mode)) {
    return {ok: true, state: {...state, plan: {...state.plan, batteryMode: action.mode}},
      result: {type: action.type, tick: state.tick}};
  }
  return {ok: false, reason: 'invalid-action'};
}

function baselinePeak() {
  let state = initialGridState();
  for (let tick = 0; tick < DAY_TICKS; tick++) state = stepGrid(state);
  return state.totals.peakW;
}

export const BASELINE_PEAK_W = baselinePeak();

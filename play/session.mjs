import {openTransactionalSession} from '@andiwijaya/common-engine';
import {actionKey, applyGridAction, DAY_TICKS, initialGridState, isGridState, stepGrid} from './microgrid.mjs';

export const STEP_MS = 120;

export function pilotDatabase(url) {
  const names = url.searchParams.getAll('qa-session');
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    || !['http:', 'https:'].includes(url.protocol)
    || names.length !== 1 || !/^[a-z0-9][a-z0-9-]{7,47}$/.test(names[0])) return null;
  return 'smartgridtwin.qa.microgrid.v1-' + names[0];
}

export function openGridSession(store) {
  return openTransactionalSession({
    stepMs: STEP_MS,
    maxFrameMs: STEP_MS * 4,
    maxManualSteps: DAY_TICKS,
    initialSpeed: 1,
    stepsPerFrame: {1: 2},
    initialState: initialGridState(),
    isState: isGridState,
    step: stepGrid,
    applyAction: applyGridAction,
    actionKey,
    store,
  });
}

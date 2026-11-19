import {openTransactionalSession} from '@andiwijaya/common-engine';
import {actionKey, applyGridAction, DAY_TICKS, initialGridState, isGridState, stepGrid} from './microgrid.mjs';

export const STEP_MS = 120;
export const PROGRESS_DATABASE = 'smartgridtwin.microgrid.v1';

export function isPilotOrigin(url) {
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  return (loopback && ['http:', 'https:'].includes(url.protocol))
    || (url.protocol === 'https:' && /^[a-z0-9][a-z0-9-]*\.smartgridtwin-com\.pages\.dev$/.test(url.hostname));
}

export function gridDatabase(url) {
  if (!['http:', 'https:'].includes(url.protocol)) return null;
  const names = url.searchParams.getAll('qa-session');
  if (names.length === 0) return PROGRESS_DATABASE;
  if (!isPilotOrigin(url) || names.length !== 1 || !/^[a-z0-9][a-z0-9-]{7,47}$/.test(names[0])) return null;
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

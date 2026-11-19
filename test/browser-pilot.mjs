import assert from 'node:assert/strict';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const origin = new URL(process.env.SMARTGRID_QA_URL ?? 'http://127.0.0.1:4192');
if (origin.protocol !== 'http:' || origin.hostname !== '127.0.0.1') throw Error('Use the loopback pilot server');
const runtime = process.env.SMARTGRID_QA_PLAYWRIGHT;
const {chromium} = await import(runtime ? pathToFileURL(runtime).href : 'playwright');
const browser = await chromium.launch({executablePath: process.env.SMARTGRID_QA_CHROMIUM, headless: true});
const stamp = Date.now().toString(36);
const slot = name => 'smartgrid-' + name + '-' + stamp;
const nameFor = id => 'smartgridtwin.qa.microgrid.v1-' + id;
const locationFor = id => new URL('/play/?qa-session=' + id, origin).href;
const evidence = process.env.SMARTGRID_QA_EVIDENCE;
const report = {};

async function ready(page, id) {
  await page.goto(locationFor(id));
  await page.locator('#pilot[data-phase="ready"]').waitFor();
  await page.bringToFront();
}

async function revision(page, n) {
  await page.locator('#pilot[data-revision="' + n + '"]:not([data-phase="saving"])').waitFor();
}

async function record(page, id) {
  return page.evaluate(database => new Promise((resolve, reject) => {
    const request = indexedDB.open(database, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('checkpoints', 'readonly');
      const entry = tx.objectStore('checkpoints').get('session');
      tx.oncomplete = () => { db.close(); resolve(entry.result); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }), nameFor(id));
}

async function changeSchedule(page, start, end) {
  await page.locator('#ev-start').selectOption(String(start));
  await page.locator('#ev-end').selectOption(String(end));
  await page.getByRole('button', {name: 'Simpan jadwal EV'}).click();
}

async function configure(page) {
  await changeSchedule(page, 44, 64);
  await revision(page, 1);
  await page.locator('#battery-mode').selectOption('auto');
  await page.getByRole('button', {name: 'Simpan mode baterai'}).click();
  await revision(page, 2);
}

try {
  const desktop = await browser.newContext({viewport: {width: 1360, height: 900}});
  const errors = [];
  desktop.on('page', page => page.on('pageerror', error => errors.push(error.message)));

  const manualId = slot('manual');
  const manual = await desktop.newPage();
  await ready(manual, manualId);
  await configure(manual);
  await manual.locator('#advance').click();
  await manual.locator('#pilot[data-tick="1"]').waitFor();
  for (let i = 0; i < 24; i++) await manual.locator('#advance-hour').click();
  await manual.locator('#pilot[data-phase="complete"][data-tick="96"]').waitFor();
  await manual.locator('#checkpoint').click();
  await revision(manual, 3);
  const manualSave = await record(manual, manualId);

  const autoId = slot('auto');
  const auto = await desktop.newPage();
  await ready(auto, autoId);
  await configure(auto);
  await auto.locator('#autoplay').click();
  await auto.locator('#pilot[data-phase="complete"][data-tick="96"]').waitFor({timeout: 30_000});
  await auto.locator('#checkpoint').click();
  await revision(auto, 3);
  const autoSave = await record(auto, autoId);
  assert.deepEqual(autoSave.state, manualSave.state);
  assert.equal(autoSave.state.evWh, 12_000);
  assert.match(await auto.locator('#mission').textContent(), /Puncak impor turun/);
  if (evidence) await auto.screenshot({path: join(evidence, 'smartgrid-pilot-desktop.png'), fullPage: true});
  report.day = {ticks: autoSave.state.tick, evWh: autoSave.state.evWh, ...autoSave.state.totals,
    baselineLabel: await auto.locator('#baseline').textContent(), manualDb: nameFor(manualId), autoplayDb: nameFor(autoId)};

  const conflictId = slot('conflict');
  const first = await desktop.newPage();
  const second = await desktop.newPage();
  await ready(first, conflictId);
  await first.locator('#checkpoint').click();
  await revision(first, 1);
  await ready(second, conflictId);
  await first.bringToFront();
  await changeSchedule(first, 40, 64);
  await revision(first, 2);
  const winner = await record(first, conflictId);
  await second.bringToFront();
  await second.locator('#battery-mode').selectOption('auto');
  await second.getByRole('button', {name: 'Simpan mode baterai'}).click();
  await second.locator('#pilot[data-phase="conflict"]').waitFor();
  assert.equal(await second.locator('#advance').isEnabled(), false);
  assert.deepEqual(await record(second, conflictId), winner);
  await second.locator('#reload').click();
  await revision(second, 2);
  assert.match(await second.locator('#plan-ev').textContent(), /10:00–16:00/);
  assert.equal(await second.locator('#battery-mode').inputValue(), 'hold');
  report.conflict = {db: nameFor(conflictId), revision: winner.revision, receipts: winner.receipts.length};

  const failureId = slot('failure');
  const mobile = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
  mobile.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  await mobile.addInitScript(database => {
    const put = IDBObjectStore.prototype.put;
    window.qaAbortNextPut = false;
    IDBObjectStore.prototype.put = function (entry, key) {
      const request = put.call(this, entry, key);
      if (window.qaAbortNextPut && this.transaction.db.name === database && this.name === 'checkpoints') {
        window.qaAbortNextPut = false;
        window.qaAbortedAction = entry.receipts.at(-1)?.id;
        request.addEventListener('success', () => this.transaction.abort(), {once: true});
      }
      return request;
    };
  }, nameFor(failureId));
  const failure = await mobile.newPage();
  await ready(failure, failureId);
  for (let i = 0; i < 12; i++) await failure.locator('#advance-hour').click();
  await failure.locator('#checkpoint').click();
  await revision(failure, 1);
  const before = await record(failure, failureId);
  assert.equal(before.state.tick, 48);

  await failure.evaluate(() => { window.qaAbortNextPut = true; });
  await changeSchedule(failure, 52, 68);
  await failure.locator('#retry').waitFor();
  const actionId = await failure.evaluate(() => window.qaAbortedAction);
  assert.ok(actionId);
  assert.deepEqual(await record(failure, failureId), before);
  assert.match(await failure.locator('#plan-ev').textContent(), /18:00–22:00/);
  await failure.locator('#retry').click();
  await revision(failure, 2);
  const after = await record(failure, failureId);
  assert.deepEqual(after.receipts.map(receipt => receipt.id), [actionId]);
  assert.equal(after.state.tick, 48);
  assert.equal(after.state.plan.startTick, 52);
  await failure.reload();
  await revision(failure, 2);
  assert.match(await failure.locator('#steps').textContent(), /48 \/ 96/);
  assert.match(await failure.locator('#plan-ev').textContent(), /13:00–17:00/);
  assert.equal(await failure.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

  const replay = await failure.evaluate(async ({database, actionId}) => {
    const {createIndexedDbCheckpointStore} = await import('/play/engine/index.js');
    const {openGridSession} = await import('/play/session.mjs');
    const session = await openGridSession(createIndexedDbCheckpointStore(indexedDB, database));
    const same = await session.dispatch(actionId, {type: 'schedule-ev', startTick: 52, endTick: 68});
    const changed = await session.dispatch(actionId, {type: 'schedule-ev', startTick: 56, endTick: 68});
    return {same: same.status, changed: changed.reason};
  }, {database: nameFor(failureId), actionId});
  assert.deepEqual(replay, {same: 'replayed', changed: 'operation-id-reused'});
  assert.deepEqual(await record(failure, failureId), after);
  if (evidence) await failure.screenshot({path: join(evidence, 'smartgrid-pilot-mobile.png'), fullPage: true});
  report.retry = {db: nameFor(failureId), tick: after.state.tick, revision: after.revision,
    receipts: after.receipts.length, reusedId: replay.changed, duplicate: replay.same};

  await failure.setViewportSize({width: 844, height: 390});
  assert.equal(await failure.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const unscoped = await desktop.newPage();
  await unscoped.goto(new URL('/play/', origin).href);
  await unscoped.locator('#pilot[data-phase="blocked"]').waitFor();
  const desktopDatabases = await unscoped.evaluate(async () => (await indexedDB.databases()).map(db => db.name));
  assert.deepEqual(desktopDatabases.sort(), [manualId, autoId, conflictId].map(nameFor).sort());
  const mobileDatabases = await failure.evaluate(async () => (await indexedDB.databases()).map(db => db.name));
  assert.deepEqual(mobileDatabases, [nameFor(failureId)]);
  report.isolation = {desktop: desktopDatabases.length, mobile: mobileDatabases.length, unscoped: 'blocked'};

  assert.deepEqual(errors, []);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}

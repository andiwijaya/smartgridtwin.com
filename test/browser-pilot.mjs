import assert from 'node:assert/strict';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const origin = new URL(process.env.SMARTGRID_QA_URL ?? 'http://127.0.0.1:4192');
if (origin.protocol !== 'http:' || origin.hostname !== '127.0.0.1') throw Error('Use the loopback pilot server');
const runtime = process.env.SMARTGRID_QA_PLAYWRIGHT;
const {chromium} = await import(runtime ? pathToFileURL(runtime).href : 'playwright');
const browser = await chromium.launch({
  executablePath: process.env.SMARTGRID_QA_CHROMIUM,
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
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
  await worldReady(page, 'overview');
}

async function worldReady(page, view) {
  const stage = page.locator('#world-stage[data-renderer="ready"][data-camera-state="settled"][data-view="' + view + '"]');
  await stage.waitFor();
  return stage.getAttribute('data-camera-pose');
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

async function changeSchedule(page, start, end, touch = false) {
  if (!await page.locator('#schedule-form').isVisible()) await page.locator('#world-charger').click();
  await page.locator('#ev-start').selectOption(String(start));
  await page.locator('#ev-end').selectOption(String(end));
  const save = page.getByRole('button', {name: 'Simpan jadwal EV'});
  if (touch) await save.tap();
  else await save.click();
}

async function configure(page) {
  await changeSchedule(page, 44, 64);
  await revision(page, 1);
  await page.locator('#world-back').click();
  await page.locator('#battery-mode').selectOption('auto');
  await page.getByRole('button', {name: 'Simpan mode baterai'}).click();
  await revision(page, 2);
}

async function exerciseNavigation(page, id, format, touch = false) {
  await ready(page, id);
  const overviewPose = await worldReady(page, 'overview');
  assert.equal(await page.locator('#world-view').textContent(), 'Utuh');
  assert.equal(await page.locator('#schedule-form').isVisible(), false);
  assert.equal(await record(page, id), undefined);

  // The marker tracks the projected center of the real charger mesh.
  const marker = page.locator('#charger-pin');
  await marker.scrollIntoViewIfNeeded();
  const bounds = await marker.boundingBox();
  assert.ok(bounds);
  const overviewScroll = await page.evaluate(() => window.scrollY);
  const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
  if (touch) {
    await page.touchscreen.tap(x, y);
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 20, y);
    await page.mouse.move(x, y);
    await page.mouse.up();
    assert.equal(await page.locator('#world-view').textContent(), 'Utuh');
    await page.mouse.click(x, y);
  }
  const detailPose = await worldReady(page, 'charger-ev');
  assert.notEqual(detailPose, overviewPose);
  assert.equal(await page.locator('#world-view').textContent(), 'Charger EV');
  assert.ok(await page.locator('#schedule-form').isVisible());
  assert.equal(await page.evaluate(() => document.activeElement.id), 'ev-start');
  assert.equal(await record(page, id), undefined);

  await changeSchedule(page, 42, 62, touch);
  await revision(page, 1);
  assert.match(await page.locator('#status').textContent(), /Jadwal EV tersimpan/);
  const saved = await record(page, id);
  assert.equal(saved.revision, 1);
  assert.equal(saved.receipts.length, 1);
  assert.equal(saved.receipts[0].result.type, 'schedule-ev');
  assert.equal(saved.state.tick, 0);
  assert.deepEqual([saved.state.plan.startTick, saved.state.plan.endTick], [42, 62]);
  if (evidence && touch) await page.screenshot({path: join(evidence, 'smartgrid-s3-charger-' + format + '.png'), fullPage: true});

  const back = page.locator('#world-back');
  if (touch) await back.tap();
  else await back.press('Enter');
  assert.equal(await worldReady(page, 'overview'), overviewPose);
  assert.equal(await page.locator('#world-view').textContent(), 'Utuh');
  assert.equal(await page.locator('#schedule-form').isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'world-charger');
  assert.ok(Math.abs((await page.evaluate(() => window.scrollY)) - overviewScroll) <= 1);
  assert.equal(await page.locator('#world-charger').getAttribute('aria-expanded'), 'false');
  assert.match(await page.locator('#plan-ev').textContent(), /10:30–15:30/);
  assert.deepEqual(await record(page, id), saved);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  if (evidence && !touch) await page.screenshot({path: join(evidence, 'smartgrid-s3-utuh-desktop.png'), fullPage: true});

  if (!touch) {
    await page.locator('#world-charger').press('Enter');
    assert.equal(await worldReady(page, 'charger-ev'), detailPose);
    await page.locator('#world-back').press('Enter');
    assert.equal(await worldReady(page, 'overview'), overviewPose);
  }
  await page.reload();
  await revision(page, 1);
  assert.equal(await worldReady(page, 'overview'), overviewPose);
  assert.match(await page.locator('#plan-ev').textContent(), /10:30–15:30/);
  assert.deepEqual(await record(page, id), saved);
  return {format, viewport: page.viewportSize(), input: touch ? 'touch' : 'mouse and keyboard',
    database: nameFor(id), revision: saved.revision, tick: saved.state.tick, receipts: saved.receipts.length,
    poseRestored: true, schedule: await page.locator('#plan-ev').textContent()};
}

try {
  const desktop = await browser.newContext({viewport: {width: 1360, height: 900}});
  const errors = [];
  const watch = context => context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  watch(desktop);
  const desktopS3 = slot('s3-desktop');
  const desktopPage = await desktop.newPage();
  report.navigation = [await exerciseNavigation(desktopPage, desktopS3, 'desktop')];
  await desktopPage.close();

  const mobile = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
  watch(mobile);
  const portraitS3 = slot('s3-portrait');
  const portrait = await mobile.newPage();
  report.navigation.push(await exerciseNavigation(portrait, portraitS3, 'portrait', true));
  await portrait.close();

  const landscape = await browser.newContext({viewport: {width: 844, height: 390}, isMobile: true, hasTouch: true});
  watch(landscape);
  const landscapeS3 = slot('s3-landscape');
  const landscapePage = await landscape.newPage();
  report.navigation.push(await exerciseNavigation(landscapePage, landscapeS3, 'landscape', true));
  await landscape.close();

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
  await manual.close();

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
  report.day = {ticks: autoSave.state.tick, evWh: autoSave.state.evWh, ...autoSave.state.totals,
    baselineLabel: await auto.locator('#baseline').textContent(), manualDb: nameFor(manualId), autoplayDb: nameFor(autoId)};
  await auto.close();

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
  await first.close();
  await second.close();

  const failureId = slot('failure');
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
  report.retry = {db: nameFor(failureId), tick: after.state.tick, revision: after.revision,
    receipts: after.receipts.length, reusedId: replay.changed, duplicate: replay.same};

  await failure.setViewportSize({width: 844, height: 390});
  assert.equal(await failure.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const unscoped = await desktop.newPage();
  await unscoped.goto(new URL('/play/', origin).href);
  await unscoped.locator('#pilot[data-phase="blocked"]').waitFor();
  const desktopDatabases = await unscoped.evaluate(async () => (await indexedDB.databases()).map(db => db.name));
  assert.deepEqual(desktopDatabases.sort(), [desktopS3, manualId, autoId, conflictId].map(nameFor).sort());
  const mobileDatabases = await failure.evaluate(async () => (await indexedDB.databases()).map(db => db.name));
  assert.deepEqual(mobileDatabases.sort(), [portraitS3, failureId].map(nameFor).sort());
  report.isolation = {desktop: desktopDatabases.length, mobile: mobileDatabases.length, unscoped: 'blocked'};

  assert.deepEqual(errors, []);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}

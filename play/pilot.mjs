import {createDioramaNavigation, createIndexedDbCheckpointStore} from '@andiwijaya/common-engine';
import {BASELINE_PEAK_W, BATTERY_CAPACITY_WH, DAY_TICKS, EV_TARGET_WH} from './microgrid.mjs';
import {openGridSession, pilotDatabase} from './session.mjs';

const get = id => document.getElementById(id);
const pilot = get('pilot');
const status = get('status');
const time = tick => String(Math.floor(tick / 4)).padStart(2, '0') + ':'
  + String(tick % 4 * 15).padStart(2, '0');
const number = new Intl.NumberFormat('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const power = watts => number.format(watts / 1_000) + ' kW';
const energy = wh => number.format(wh / 1_000) + ' kWh';
const modeLabel = mode => mode === 'auto' ? 'Isi dari surya, bantu beban' : 'Siaga';
const OVERVIEW_POSE = {target: [0, .48, 0], height: 11.4, minWidth: 16.7};
const DEVICE_VIEWS = {
  'charger-ev': {
    label: 'Charger EV',
    pose: {target: [4.25, .65, 1.42], height: 4.65, minWidth: 6.6},
    buttonId: 'world-charger', formId: 'schedule-form', inputId: 'ev-start', markerId: 'charger-pin',
  },
  battery: {
    label: 'Baterai',
    pose: {target: [.03, .72, -2.65], height: 4.3, minWidth: 5.9},
    buttonId: 'world-battery', formId: 'battery-form', inputId: 'battery-mode', markerId: 'battery-pin',
  },
};

const messages = {
  'invalid-schedule': 'Jam selesai harus sesudah jam mulai dan masih berada di depan waktu simulasi.',
  'day-complete': 'Hari simulasi sudah selesai.',
  'invalid-action': 'Aksi ini tidak valid.',
  'operation-id-reused': 'Identitas aksi ini sudah dipakai untuk pengaturan yang berbeda.',
  conflict: 'Tab lain sudah menyimpan progres. Muat ulang checkpoint untuk melanjutkan.',
  'write-failed': 'Simpan gagal. Rencana yang sebelumnya tersimpan masih berlaku.',
  paused: 'Sesi dijeda.',
  busy: 'Penyimpanan sedang diproses.',
};

async function boot() {
  const database = pilotDatabase(new URL(location.href));
  if (!database) {
    pilot.dataset.phase = 'blocked';
    status.textContent = 'Buka lewat preview lokal dengan nama sesi QA yang valid.';
    return;
  }

  const slot = new URL(location.href).searchParams.get('qa-session');
  get('qa-slot').textContent = 'QA lokal · ' + slot;
  let session;
  try {
    session = await openGridSession(createIndexedDbCheckpointStore(indexedDB, database));
  } catch {
    pilot.dataset.phase = 'blocked';
    status.textContent = 'Checkpoint QA tidak bisa dibuka. Coba muat ulang atau buka sesi QA baru.';
    return;
  }

  let state = session.snapshot();
  let playing = false;
  let busy = false;
  let frameId = 0;
  let retry = null;
  let plotted = 0;
  const history = get('history');
  const navigation = createDioramaNavigation(OVERVIEW_POSE);
  const stage = get('world-stage');
  const devices = new Map(Object.entries(DEVICE_VIEWS).map(([id, config]) => [id, {
    label: config.label, pose: config.pose,
    button: get(config.buttonId), form: get(config.formId), input: get(config.inputId),
  }]));
  const markers = new Map(Object.entries(DEVICE_VIEWS).map(([id, config]) => [id, get(config.markerId)]));
  const backButton = get('world-back');
  let diorama;
  let pageClosed = false;
  let overviewScroll = 0;

  for (let tick = 0; tick <= DAY_TICKS; tick++) {
    if (tick < DAY_TICKS) get('ev-start').add(new Option(time(tick), tick));
    if (tick > 0) get('ev-end').add(new Option(time(tick), tick));
  }
  function syncPlanInputs() {
    get('ev-start').value = String(state.plan.startTick);
    get('ev-end').value = String(state.plan.endTick);
    get('battery-mode').value = state.plan.batteryMode;
  }

  function renderWorld() {
    const view = navigation.view();
    const focused = view.objectId !== null;
    stage.dataset.view = view.objectId ?? 'overview';
    get('world-view').textContent = devices.get(view.objectId)?.label ?? 'Utuh';
    backButton.hidden = !focused;
    for (const [id, device] of devices) {
      const selected = view.objectId === id;
      device.button.setAttribute('aria-expanded', String(selected));
      device.button.hidden = focused && !selected;
      device.form.hidden = !selected;
    }
    diorama?.present(view);
  }

  function openDevice(id) {
    const device = devices.get(id);
    if (!device || navigation.view().objectId !== null) return;
    navigation.select(id, device.pose);
    overviewScroll = window.scrollY;
    renderWorld();
    const focus = device.input.matches(':disabled') ? backButton : device.input;
    focus.focus({preventScroll: true});
    focus.scrollIntoView({block: 'nearest', inline: 'nearest'});
  }

  function showWorldFallback() {
    stage.dataset.renderer = 'unavailable';
    get('world-canvas').hidden = true;
    for (const marker of markers.values()) marker.hidden = true;
    get('world-fallback').hidden = false;
    diorama = undefined;
  }

  function render() {
    const {revision, conflicted} = session.inspect();
    const done = state.tick === DAY_TICKS;
    pilot.dataset.tick = String(state.tick);
    pilot.dataset.revision = String(revision ?? 0);
    pilot.dataset.phase = conflicted ? 'conflict' : busy ? 'saving' : done ? 'complete' : 'ready';
    get('clock').textContent = time(state.tick);
    get('steps').textContent = state.tick + ' / ' + DAY_TICKS + ' langkah';
    const flow = state.last;
    get('interval').textContent = flow ? time(flow.tick) + '–' + time(state.tick) : 'Langkah pertama belum berjalan.';
    get('solar').textContent = power((flow?.solarWh ?? 0) * 4);
    get('house').textContent = power((flow?.houseWh ?? 0) * 4);
    get('grid').textContent = power((flow?.gridWh ?? 0) * 4);
    get('battery').textContent = energy(state.batteryWh);
    get('ev').textContent = energy(state.evWh);
    get('peak').textContent = power(state.totals.peakW);
    get('baseline').textContent = power(BASELINE_PEAK_W);
    get('import').textContent = energy(state.totals.gridWh);
    get('ev-target').textContent = number.format(state.evWh / 1_000) + ' / ' + energy(EV_TARGET_WH);
    get('plan-ev').textContent = 'Aktif ' + time(state.plan.startTick) + '–' + time(state.plan.endTick);
    get('plan-battery').textContent = 'Aktif: ' + modeLabel(state.plan.batteryMode);
    if (state.tick > 0) {
      const unmetEv = state.evWh < EV_TARGET_WH;
      const improvedPeak = state.totals.peakW < BASELINE_PEAK_W;
      get('mission').textContent = done
        ? (unmetEv ? 'Target EV belum tercapai. ' : 'Target EV tercapai. ')
          + (improvedPeak ? 'Puncak impor turun ' + power(BASELINE_PEAK_W - state.totals.peakW) + '.' : 'Puncak impor belum turun.')
        : 'Beban rumah terlayani. Hasil akhir dibandingkan ketika hari simulasi selesai.';
    }
    const newBars = state.batteryHistory.slice(plotted).map(wh => {
      const bar = document.createElement('i');
      bar.style.setProperty('--level', wh * 100 / BATTERY_CAPACITY_WH + '%');
      return bar;
    });
    history.append(...newBars);
    plotted = state.batteryHistory.length;
    history.setAttribute('aria-label', 'Energi baterai pada ' + time(state.tick) + ' adalah ' + energy(state.batteryWh));
    get('edit-controls').disabled = busy || conflicted || done;
    get('time-controls').disabled = busy || conflicted;
    get('autoplay').disabled = done;
    get('advance').disabled = done || playing;
    get('advance-hour').disabled = done || playing;
    get('autoplay').textContent = playing ? 'Jeda autoplay' : 'Autoplay';
    get('autoplay').setAttribute('aria-pressed', String(playing));
    get('retry').hidden = retry === null || conflicted;
    get('retry').disabled = busy;
    get('reload').hidden = !conflicted;
  }

  function setPlaying(value) {
    playing = value;
    cancelAnimationFrame(frameId);
    session.setPaused(true);
    session.setPaused(document.hidden);
    if (playing) frameId = requestAnimationFrame(runFrame);
  }

  function runFrame(now) {
    if (session.frame(now) > 0) {
      state = session.snapshot();
      if (state.tick === DAY_TICKS) setPlaying(false);
      render();
    }
    if (playing) frameId = requestAnimationFrame(runFrame);
  }

  function advance(ticks) {
    session.advanceSteps(Math.min(ticks, DAY_TICKS - state.tick));
    state = session.snapshot();
    render();
  }

  async function save(action) {
    if (busy) return;
    busy = true;
    retry = null;
    status.textContent = 'Menyimpan checkpoint…';
    render();
    const result = action ? await session.dispatch(action.id, action.value) : await session.checkpoint();
    busy = false;
    if (result.status === 'applied' || result.status === 'replayed') {
      state = session.snapshot();
      syncPlanInputs();
      const label = result.receipt.result.type === 'schedule-ev' ? 'Jadwal EV' : 'Mode baterai';
      status.textContent = label + ' tersimpan di revisi ' + result.receipt.revision + '.';
    } else if (result.status === 'saved') {
      status.textContent = 'Checkpoint tersimpan di revisi ' + result.revision + '.';
    } else {
      setPlaying(false);
      status.textContent = messages[result.reason] ?? 'Aksi tidak dapat diselesaikan.';
      if (result.reason === 'write-failed') retry = {action};
    }
    render();
  }

  get('schedule-form').addEventListener('submit', event => {
    event.preventDefault();
    void save({id: crypto.randomUUID(), value: {
      type: 'schedule-ev',
      startTick: Number(get('ev-start').value), endTick: Number(get('ev-end').value),
    }});
  });
  get('battery-form').addEventListener('submit', event => {
    event.preventDefault();
    void save({id: crypto.randomUUID(), value: {type: 'battery-mode', mode: get('battery-mode').value}});
  });
  get('autoplay').addEventListener('click', () => { setPlaying(!playing); render(); });
  get('advance').addEventListener('click', () => advance(1));
  get('advance-hour').addEventListener('click', () => advance(4));
  get('checkpoint').addEventListener('click', () => void save(null));
  get('retry').addEventListener('click', () => { if (retry) void save(retry.action); });
  get('reload').addEventListener('click', () => location.reload());
  for (const [id, device] of devices) device.button.addEventListener('click', () => openDevice(id));
  backButton.addEventListener('click', () => {
    const previousDevice = devices.get(navigation.view().objectId);
    if (!navigation.back()) return;
    renderWorld();
    window.scrollTo(0, overviewScroll);
    previousDevice?.button.focus({preventScroll: true});
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) setPlaying(false);
    else session.setPaused(false);
    render();
  });
  window.addEventListener('pagehide', () => {
    pageClosed = true;
    diorama?.dispose();
    cancelAnimationFrame(frameId);
    session.dispose();
  }, {once: true});
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });

  session.setPaused(document.hidden);
  syncPlanInputs();
  const {revision} = session.inspect();
  status.textContent = revision === null ? 'Sesi QA baru. Waktu dijeda.' : 'Checkpoint revisi ' + revision + ' dibuka. Waktu dijeda.';
  render();
  renderWorld();
  for (const device of devices.values()) device.button.disabled = false;
  void import('./diorama.mjs').then(({mountDiorama}) => {
    if (pageClosed) return;
    diorama = mountDiorama({
      stage, canvas: get('world-canvas'), markers, view: navigation.view(),
      selectDevice: openDevice, unavailable: showWorldFallback,
    });
  }).catch(() => { if (!pageClosed) showWorldFallback(); });
}

void boot();

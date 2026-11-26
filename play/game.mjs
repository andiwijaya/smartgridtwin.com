import {
  MAX_ZONES, advanceGame, customerTypes, gridStatus, jobNames, partCondition, partsFor,
  perform, plantName, plantTypes, quote, regions, restoreGame, timeOf,
} from "./simulation.mjs";
import { Scene } from "./scene.mjs";

const SAVE_KEY = "smartgridtwin-game-v1";
const STEP_MS = 2850;
const number = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
const integers = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const $ = (selector) => document.querySelector(selector);
const icon = (name, extra = "") => `<svg aria-hidden="true" ${extra}><use href="#i-${name}"/></svg>`;
const safe = (value) => String(value).replace(/[&<>"']/g, (character) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]
));
const fmt = (value) => number.format(Math.max(0, value));
const whole = (value) => integers.format(Math.floor(Math.max(0, value)));
const percent = (value) => Math.max(0, Math.min(100, Math.round(value)));
const time = (hour) => String(timeOf(hour)).padStart(2, "0") + ".00";
const day = (hour) => Math.floor((hour + 8) / 24) + 1;
const openButton = (contents, args, style = "action-button", disabled = false) => (
  `<button type="button" class="${style}" ${args}${disabled ? " disabled" : ""}>${contents}</button>`
);

function readSave() {
  try { return localStorage.getItem(SAVE_KEY); } catch { return null; }
}

let lastSaved = readSave();
let game = restoreGame(lastSaved);
let paused = game.campaign[game.active].paused === true;
let elapsed = 0;
let toastTimer;
let panelMarkup = "";
let markerMarkup = "";
const ui = { tab: "grid", screen: "main", site: null, part: null, customer: null, camera: null };
const panel = $("#panel");
const markerLayer = $("#markers");
const dialog = $("#game-dialog");
const scene = new Scene($("#world"), markerLayer, (mode) => {
  $('[data-command="orbit"]').setAttribute("aria-pressed", String(mode === "orbit"));
}, (id) => {
  [...markerLayer.children].find((label) => label.dataset.marker === id)?.click();
});

function save() {
  game.campaign[game.active].paused = paused;
  const serialized = JSON.stringify(game);
  if (serialized === lastSaved) return;
  try {
    localStorage.setItem(SAVE_KEY, serialized);
    lastSaved = serialized;
  } catch {
    $("#save-state").textContent = "Penyimpanan lokal tidak tersedia";
  }
}

window.addEventListener("storage", (event) => {
  if (event.key !== SAVE_KEY || event.newValue === lastSaved) return;
  const oldRegion = game.active;
  lastSaved = event.newValue;
  game = restoreGame(event.newValue);
  paused = game.campaign[game.active].paused === true;
  elapsed = 0;
  if (oldRegion !== game.active) {
    clearSelection();
    scene.reset();
  }
  render(true);
});

function toast(message, error = false) {
  const item = $("#toast");
  item.hidden = false;
  item.classList.toggle("is-error", error);
  item.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { item.hidden = true; }, 2900);
}

function plantState(plant) {
  if (plant.status === "destroyed") return ["Hancur", "is-critical"];
  if (plant.status === "building") return ["Dibangun", ""];
  if (plant.job) return ["Dikerjakan", ""];
  if (plant.condition <= 14) return ["Kritis", "is-critical"];
  if (plant.condition < 47) return ["Perlu servis", "is-warning"];
  return ["Beroperasi", ""];
}

function row({ title, detail, symbol, type = "", status, isSelected, command, key, label = "" }) {
  return `<button type="button" class="row-button ${isSelected ? "is-selected" : ""}" data-command="${command}" data-key="${safe(key)}" ${label ? 'aria-label="' + safe(label) + '"' : ""}>
    <span class="row-icon" data-type="${type}">${icon(symbol)}</span>
    <span><strong class="row-title">${safe(title)}</strong><span class="row-description">${safe(detail)}</span></span>
    ${status ? `<span class="row-badge ${status[1]}">${safe(status[0])}</span>` : icon("chevron", 'class="row-chevron"')}
  </button>`;
}

function measurements(values) {
  return `<div class="measurements">${values.map(([label, value]) => `<div><span>${safe(label)}</span><strong>${safe(value)}</strong></div>`).join("")}</div>`;
}

function objective(grid) {
  const { region } = grid;
  if (region.milestone) {
    const next = regions[game.active + 1];
    return `<article class="objective"><h3>${icon("check-circle")} Target wilayah tercapai</h3>
      <p>${next ? safe(next.name) + " sekarang bisa dimainkan." : "Lanjutkan mengembangkan jaringan wilayah ini."}</p>
      ${next ? openButton("Pilih wilayah " + icon("arrow"), 'data-command="regions"', "text-button") : ""}</article>`;
  }
  const online = grid.plants.filter((plant) => plant.status === "online").length;
  const message = online < 2 || grid.customers.length < 2
    ? "Operasikan dua pembangkit dan layani dua pelanggan. Pertahankan pasokan 90% selama 16 jam simulasi."
    : "Pertahankan pasokan 90% selama 16 jam simulasi untuk mencapai target wilayah.";
  const next = regions[game.active + 1];
  return `<article class="objective"><h3>${icon("flag")} ${next ? "Buka " + safe(next.name) : "Target keandalan wilayah"}</h3>
    <p>${message}</p><progress max="16" value="${Math.min(region.streak, 16)}" aria-label="Jam pasokan andal"></progress></article>`;
}

function gridPanel(grid) {
  const { plants, meta } = grid;
  return `<p class="panel-heading">Pembangkit</p><div class="list-stack">${plants.map((plant) => {
    const site = meta.sites.find((item) => item.id === plant.site);
    return row({
      title: plantName(plant, site), detail: "Level " + plant.level + " · " + fmt(plant.output) + " MW",
      symbol: plantTypes[plant.type].icon, type: plant.type, status: plantState(plant), command: "site", key: site.id,
    });
  }).join("")}</div>
  ${openButton(icon("plus") + " Bangun pembangkit", 'data-command="tab" data-tab="build"', "outline-button", plants.length >= meta.sites.length)}
  ${plants.length >= meta.sites.length ? '<p class="panel-copy">Semua lokasi pembangkit sudah terisi.</p>' : ""}
  ${objective(grid)}`;
}

function buildPanel(grid) {
  const open = grid.meta.sites.filter((site) => !grid.plants.some((plant) => plant.site === site.id));
  return `${openButton(icon("left") + " Jaringan", 'data-command="tab" data-tab="grid"', "text-button")}
    <p class="panel-heading">Lokasi pembangunan</p>
    <p class="panel-copy">Pilih lokasi di peta atau dari daftar.</p>
    <div class="list-stack">${open.map((site) => row({
      title: site.name, detail: site.types.map((type) => plantTypes[type].name).join(" · "),
      symbol: "plus", command: "site", key: site.id,
    })).join("") || '<p class="empty-state">Semua lokasi sudah terisi.</p>'}</div>`;
}

function offerCard(grid) {
  const offer = grid.region.offer;
  if (!offer) return "";
  const reserve = grid.supply - grid.demand - offer.demand;
  const remaining = offer.expires - grid.region.hour;
  return `<article class="offer-card">
    <p class="panel-heading">Tawaran sambungan · ${remaining} jam lagi</p><h3>${safe(offer.name)}</h3>
    ${measurements([["Permintaan baru", fmt(offer.demand) + " MW"], ["Jika diterima sekarang", (reserve < 0 ? "Kurang " : "Sisa ") + fmt(Math.abs(reserve)) + " MW"]])}
    ${reserve < 0 ? "<p>Siapkan kapasitas tambahan atau atur jatah pelanggan.</p>" : ""}
    <div class="action-row">${openButton("Tolak", 'data-command="offer" data-key="reject"', "outline-button")}
    ${openButton("Terima", 'data-command="offer" data-key="accept"')}</div>
  </article>`;
}

function customersPanel(grid) {
  return `${offerCard(grid)}<p class="panel-heading">Pelanggan terhubung · ${grid.customers.length}/${MAX_ZONES}</p>
    <div class="list-stack">${grid.customers.map((customer) => row({
      title: customer.name, detail: fmt(customer.delivered) + " dari " + fmt(customer.demand) + " MW",
      symbol: customerTypes[customer.type].icon, command: "customer", key: customer.id,
      status: customer.priority ? ["Prioritas", ""] : null,
    })).join("")}</div>
    ${!grid.region.offer && grid.customers.length < MAX_ZONES ? '<p class="panel-copy">Tawaran baru muncul seiring waktu simulasi.</p>' : ""}`;
}

function customerPanel(grid, customer) {
  const type = customerTypes[customer.type];
  const outage = customer.delivered < customer.demand * 0.99;
  return `${openButton(icon("left") + " Semua pelanggan", 'data-command="tab" data-tab="customers"', "text-button")}
    <article class="detail-card ${outage ? "is-warning" : ""}">
      <div class="detail-title"><span class="row-icon">${icon(type.icon)}</span><div><h3>${safe(customer.name)}</h3><p class="detail-subtitle">${safe(type.label)}</p></div></div>
      ${measurements([["Permintaan", fmt(customer.demand) + " MW"], ["Tersalurkan", fmt(customer.delivered) + " MW"], ["Pendapatan", fmt(customer.delivered * type.tariff) + " koin/jam"]])}
      <progress max="100" value="${percent(customer.delivered / customer.demand * 100)}" aria-label="Permintaan terpenuhi"></progress>
    </article>
    <p class="panel-heading">Distribusi listrik</p>
    <div class="distribution">
      <label>Jatah maksimum
        <select id="customer-limit" data-distribution="limit">
          ${[0, 25, 50, 75, 100].map((limit) => `<option value="${limit}" ${customer.limit === limit ? "selected" : ""}>${limit ? limit + "%" : "0% (putus)"}</option>`).join("")}
        </select>
      </label>
      <label><input id="customer-priority" type="checkbox" data-distribution="priority" ${customer.priority ? "checked" : ""}> Prioritaskan pelanggan ini</label>
    </div>
    <p class="panel-copy">Ketika daya terbatas, pelanggan prioritas dilayani lebih dulu hingga batas jatahnya.</p>
    <div class="action-row">${openButton("Putuskan listrik", 'data-command="limit" data-key="0"', "outline-button", customer.limit === 0)}
    ${openButton("Pulihkan 100%", 'data-command="limit" data-key="100"', "outline-button", customer.limit === 100)}</div>`;
}

function logPanel(region) {
  return `<p class="panel-heading">Aktivitas terbaru</p><ul class="event-list">${region.events.map((event) =>
    `<li class="event-${safe(event.kind)}"><span>H${day(event.hour)} · ${time(event.hour)}</span><p>${safe(event.text)}</p></li>`,
  ).join("")}</ul>`;
}

function simulationHours(duration) {
  return duration + " jam simulasi";
}

function vacantPanel(grid, site) {
  return `${openButton(icon("left") + " Lokasi pembangunan", 'data-command="tab" data-tab="build"', "text-button")}
    <p class="panel-heading">${safe(site.name)}</p>
    ${site.types.map((key) => {
      const type = plantTypes[key];
      return `<article class="detail-card"><div class="detail-title"><span class="row-icon" data-type="${key}">${icon(type.icon)}</span><div><h3>${type.name} · ${type.energy}</h3><p class="detail-subtitle">Kapasitas ${type.capacity} MW</p></div></div>
        <p class="panel-copy">${type.description}</p>
        ${measurements([["Biaya", whole(type.price) + " koin"], ["Waktu", simulationHours(type.build)]])}
        ${openButton("Bangun " + type.name, 'data-command="work" data-action="build" data-key="' + key + '"', "action-button", grid.region.coins < type.price)}
        ${grid.region.coins < type.price ? '<p class="panel-copy">Butuh ' + whole(Math.ceil(type.price - grid.region.coins)) + ' koin lagi.</p>' : ""}
      </article>`;
    }).join("")}`;
}

function jobCard(plant) {
  const job = plant.job;
  return `<article class="job-card"><p><strong>${jobNames[job.mode]}</strong> · ${job.left} jam lagi</p>
    <progress max="${job.total}" value="${job.total - job.left}" aria-label="Progres pekerjaan"></progress>
    ${paused ? openButton(icon("play") + " Lanjutkan simulasi", 'data-command="pause"', "outline-button") : ""}</article>`;
}

function partPanel(grid, plant, part) {
  const condition = partCondition(part);
  const actions = [
    part.oil ? ["service", "Isi oli", part.lubricant >= 100] : null,
    ["repair", "Perbaiki", part.health >= 91],
    ["replace", "Ganti", condition >= 100],
    ["component", "Upgrade", part.level >= 3],
  ].filter(Boolean);
  const measurementsList = [["Kondisi", percent(part.health) + "%"]];
  if (part.oil) measurementsList.push(["Oli pelumas", percent(part.lubricant) + "%"]);
  return `<article class="detail-card part-detail ${condition < 47 ? "is-warning" : ""}"><div class="detail-title"><span class="row-icon">${icon(part.oil ? "water" : "tools")}</span>
    <div><h3>${safe(part.name)}</h3><p class="detail-subtitle">Level ${part.level} · ${safe(part.detail)}</p></div></div>
    ${measurements(measurementsList)}
    <progress max="100" value="${percent(condition)}" aria-label="Kesiapan komponen"></progress>
    ${part.level < 3 ? '<p class="panel-copy">Upgrade memperlambat keausan dan memulihkan kondisi.</p>' : '<p class="panel-copy">Level komponen maksimum.</p>'}
    <div class="action-row">${actions.map(([action, text, unavailable]) => {
      const info = quote(plant, action, part.key);
      return openButton(safe(text) + ' · ' + whole(info.price), 'data-command="work" data-action="' + action + '" data-key="' + safe(part.key) + '" title="' + simulationHours(info.duration) + '"', action === "service" ? "action-button" : "outline-button", unavailable || !!plant.job || grid.region.coins < info.price);
    }).join("")}</div></article>`;
}

function plantPanel(grid, plant, site) {
  const definition = plantTypes[plant.type];
  const status = plantState(plant);
  const parts = partsFor(plant);
  const selected = parts.find((part) => part.key === ui.part);
  const upgrade = quote(plant, "plant");
  const repair = quote(plant, "rebuild");
  const loan = Math.max(0, repair.price - grid.region.coins);
  const loanAllowed = grid.plants.every((item) => item.status === "destroyed");
  return `${openButton(icon("left") + " Peta penuh", 'data-command="back"', "text-button")}
    <article class="detail-card ${status[1]}"><div class="detail-title"><span class="row-icon" data-type="${plant.type}">${icon(definition.icon)}</span>
      <div><h3>${safe(plantName(plant, site))}</h3><p class="detail-subtitle">Level ${plant.level} · ${status[0]}</p></div></div>
      ${measurements([["Daya tersedia saat ini", fmt(plant.output) + " MW"], ["Kapasitas", plant.capacity + " MW"]])}
      ${plant.status === "online" && plant.condition <= 14 && !plant.job ? "<p class='panel-copy'>Komponen kritis. Segera tangani gejalanya sebelum pembangkit hancur.</p>" : ""}
      ${plant.status === "destroyed" ? `<p class="panel-copy">Pembangkit harus dibangun ulang. Desain level ${plant.level} bisa digunakan kembali.</p>
        ${loan && loanAllowed ? `<p class="panel-copy">Pinjaman ${whole(Math.ceil(loan))} koin. Cicilan mengambil 25% dari pendapatan hingga lunas.</p>` : ""}
        ${openButton("Bangun ulang · " + whole(repair.price), 'data-command="work" data-action="rebuild"', "action-button", loan > 0 && !loanAllowed)}
        ${loan && !loanAllowed ? "<p class='panel-copy'>Butuh " + whole(Math.ceil(loan)) + " koin lagi.</p>" : ""}` : ""}
    </article>
    ${plant.job ? jobCard(plant) : ""}
    ${plant.status === "online" ? `${selected ? partPanel(grid, plant, selected) : ""}
      <p class="panel-heading">Komponen</p>
      <div class="list-stack">${parts.map((part) => {
        const condition = partCondition(part);
        return row({
          title: part.name, detail: "Level " + part.level + (part.oil ? " · Oli " + percent(part.lubricant) + "%" : " · Kondisi " + percent(part.health) + "%"),
          symbol: part.oil ? "water" : "tools", status: condition < 47 ? ["Periksa", "is-warning"] : null,
          isSelected: ui.part === part.key, command: "part", key: part.key,
        });
      }).join("")}</div>
      ${selected ? "" : '<p class="panel-copy">Pilih komponen di peta atau di daftar untuk melihat kondisi dan tindakan.</p>'}
      ${plant.level < 3 ? `<article class="detail-card"><p class="panel-heading">Level berikutnya</p><p class="panel-copy">${definition.upgrade} Pekerjaan ${simulationHours(upgrade.duration)}.</p>
        ${openButton(icon("stack") + " Upgrade pembangkit · " + whole(upgrade.price), 'data-command="work" data-action="plant"', "outline-button", !!plant.job || grid.region.coins < upgrade.price)}</article>` : '<p class="panel-copy">Level pembangkit maksimum.</p>'}` : ""}`;
}

function updatePanel(grid, force) {
  let next;
  if (ui.screen === "site") {
    const site = grid.meta.sites.find((item) => item.id === ui.site);
    const plant = grid.plants.find((item) => item.site === ui.site);
    if (site) next = plant ? plantPanel(grid, plant, site) : vacantPanel(grid, site);
  }
  if (ui.screen === "customer") {
    const customer = grid.customers.find((item) => item.id === ui.customer);
    if (customer) next = customerPanel(grid, customer);
  }
  next ??= ({ grid: gridPanel, build: buildPanel, customers: customersPanel, log: () => logPanel(grid.region) })[ui.tab](grid);
  const active = document.activeElement;
  if (panelMarkup === next || (!force && active?.matches("#customer-limit"))) return;
  const focus = panel.contains(active) ? { id: active.id, command: active.dataset.command, key: active.dataset.key } : null;
  panel.innerHTML = next;
  panelMarkup = next;
  if (focus) {
    const target = [...panel.querySelectorAll("button, select, input")].find((item) => !item.disabled && (
      focus.id ? item.id === focus.id : item.dataset.command === focus.command && item.dataset.key === focus.key
    ));
    target?.focus({ preventScroll: true });
  }
}

function updateMarkers(grid) {
  const showAll = ui.screen === "main";
  markerLayer.classList.toggle("is-dense", showAll && grid.plants.length + grid.customers.length >= 7);
  const inspected = grid.plants.find((plant) => plant.site === ui.site && ui.screen === "site" && plant.status === "online");
  const next = grid.meta.sites.filter((site) => showAll || (!inspected && site.id === ui.site)).map((site) => {
    const plant = grid.plants.find((item) => item.site === site.id);
    const classes = plant ? "marker-plant " + plantState(plant)[1] : "marker-site";
    const name = plant ? plantName(plant, site) : "Bangun di " + site.name;
    return `<button type="button" class="marker ${classes}" data-marker="site-${site.id}" data-command="site" data-key="${site.id}" aria-label="${safe(name)}" title="${safe(name)}">
      ${icon(plant ? plantTypes[plant.type].icon : "plus")}${plant ? "<span>" + safe(name) + "</span>" : ""}</button>`;
  }).concat(grid.customers.filter((customer) => showAll || (ui.screen === "customer" && customer.id === ui.customer)).map((customer) =>
    `<button type="button" class="marker marker-customer" data-marker="customer-${safe(customer.id)}" data-command="customer" data-key="${safe(customer.id)}" aria-label="${safe(customer.name)}" title="${safe(customer.name)}">
      ${icon(customerTypes[customer.type].icon)}<span>${safe(customer.name)}</span></button>`,
  )).concat(inspected ? partsFor(inspected).map((part) =>
    `<button type="button" class="marker marker-part ${ui.part === part.key ? "is-selected" : ""} ${partCondition(part) < 47 ? "is-warning" : ""}" data-marker="part-${part.key}" data-command="part" data-key="${part.key}" aria-label="${safe(part.name)}" aria-pressed="${ui.part === part.key}">
      ${icon(part.oil ? "water" : "tools")}<span>${safe(part.name)}</span></button>`,
  ) : []).join("");
  if (markerMarkup !== next) {
    markerLayer.innerHTML = next;
    markerMarkup = next;
  }
  scene.sync(grid, inspected ? { site: inspected.site, part: ui.part } : undefined);
}

function updateHint(grid) {
  const hint = $("#map-alert");
  const attention = grid.plants.find((item) => item.status === "destroyed") ??
    grid.plants.find((item) => item.status === "online" && !item.job && item.condition < 47);
  let mark = "", message, clue, key;
  if (ui.screen === "site" || ui.screen === "customer") {
    hint.hidden = true;
    return;
  }
  if (attention) {
    const site = grid.meta.sites.find((item) => item.id === attention.site);
    const weakest = partsFor(attention).sort((a, b) => partCondition(a) - partCondition(b))[0];
    mark = plantState(attention)[1];
    clue = "warning";
    key = attention.site;
    message = attention.status === "destroyed"
      ? plantName(attention, site) + " harus dibangun ulang"
      : weakest.oil && weakest.lubricant < 39
        ? "Daya " + plantTypes[attention.type].name + " turun · Periksa oli pelumas"
        : "Periksa " + weakest.name + " di " + plantName(attention, site);
  } else if (grid.region.offer) {
    mark = "is-warning";
    clue = "bolt";
    key = "offer";
    message = "Tawaran sambungan · " + grid.region.offer.name;
  } else if (grid.region.hour < 20) {
    clue = "tools";
    key = grid.meta.sites[0].id;
    message = "Pilih PLTA Air Terjun untuk melihat komponen";
  }
  hint.hidden = !message;
  if (message) {
    const markup = icon(clue) + "<span>" + safe(message) + "</span>" + icon("chevron");
    if (hint.innerHTML !== markup) hint.innerHTML = markup;
    hint.className = "map-alert " + mark;
    hint.dataset.key = key;
  }
}

function render(force = false) {
  const grid = gridStatus(game);
  const { region, meta } = grid;
  const delivery = percent(grid.delivered / Math.max(1, grid.demand) * 100);
  $("#region-name").textContent = meta.name;
  $("#clock").textContent = "Hari " + day(region.hour) + " · " + time(region.hour);
  const pause = $("#pause");
  const pauseText = paused ? "Lanjutkan simulasi" : "Jeda simulasi";
  if (pause.getAttribute("aria-label") !== pauseText) {
    pause.setAttribute("aria-label", pauseText);
    pause.title = pauseText;
    pause.innerHTML = icon(paused ? "play" : "pause");
  }
  for (const button of document.querySelectorAll("[data-speed]")) {
    button.setAttribute("aria-pressed", String(Number(button.dataset.speed) === game.speed));
  }
  $("#metric-supply").innerHTML = fmt(grid.supply) + "<small>MW</small>";
  $("#metric-capacity").textContent = "Kapasitas " + fmt(grid.capacity) + " MW";
  $("#metric-demand").innerHTML = fmt(grid.demand) + "<small>MW</small>";
  $("#metric-customers").textContent = grid.customers.length + " pelanggan";
  $("#metric-delivered").innerHTML = fmt(grid.delivered) + "<small>MW</small>";
  $("#metric-reliability").textContent = delivery + "% kebutuhan";
  $("#metric-coins").textContent = whole(region.coins);
  $("#metric-income").textContent = region.debt >= 0.01
    ? "Utang " + whole(Math.ceil(region.debt)) + " koin"
    : "+" + fmt(grid.income) + " koin/jam";
  const network = $("#network-state");
  const warning = delivery < 99 || grid.plants.some((plant) => plant.condition < 47 || plant.status === "destroyed");
  network.classList.toggle("is-warning", warning);
  network.innerHTML = "<span></span>" + (
    delivery === 0 ? "Pasokan terhenti" : delivery < 99 ? "Pasokan terbatas" : warning ? "Perlu perhatian" : "Jaringan stabil"
  );
  $("#operation-count").textContent = grid.plants.length + "/" + meta.sites.length + " lokasi";
  $("#offer-indicator").hidden = !region.offer;
  $("#map-back").hidden = ui.screen === "main";
  for (const button of document.querySelectorAll(".tabs button")) {
    button.setAttribute("aria-pressed", String(button.dataset.tab === (ui.tab === "build" ? "grid" : ui.tab)));
  }
  updatePanel(grid, force);
  updateMarkers(grid);
  updateHint(grid);
}

function clearSelection() {
  if (ui.camera) scene.motion(ui.camera);
  Object.assign(ui, { screen: "main", site: null, part: null, customer: null, camera: null });
}

function selectSite(siteId, hint = false) {
  const grid = gridStatus(game);
  const site = grid.meta.sites.find((item) => item.id === siteId);
  if (!site) return;
  const plant = grid.plants.find((item) => item.site === siteId);
  ui.camera ??= scene.snapshot();
  Object.assign(ui, { screen: "site", site: siteId, tab: plant ? "grid" : "build", customer: null, part: null });
  if (hint && plant?.status === "online") {
    const weakest = partsFor(plant).sort((a, b) => partCondition(a) - partCondition(b))[0];
    if (partCondition(weakest) < 47) ui.part = weakest.key;
  }
  scene.focus(site, grid.meta, true);
  render(true);
}

function selectCustomer(id) {
  const grid = gridStatus(game);
  const index = grid.customers.findIndex((item) => item.id === id);
  if (index < 0) return;
  ui.camera ??= scene.snapshot();
  Object.assign(ui, { screen: "customer", customer: id, tab: "customers", site: null, part: null });
  scene.focus(grid.meta.zones[index], grid.meta);
  render(true);
}

function bringPanelIntoView(fromMap, detail) {
  if (!matchMedia("(max-width: 740px) and (orientation: portrait)").matches) return;
  if (!fromMap) return;
  const card = detail ? panel.querySelector(detail) : null;
  const end = card ? card.getBoundingClientRect().bottom + 16 : $("#operations").getBoundingClientRect().top + 220;
  if (end <= innerHeight) return;
  window.scrollBy({ top: end - innerHeight, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
}

function changeTab(tab) {
  clearSelection();
  ui.tab = tab;
  render(true);
}

function dispatch(action) {
  const result = perform(game, action);
  toast(result.message, !result.ok);
  if (result.ok) save();
  render(true);
}

function showGuide() {
  $("#dialog-content").innerHTML = `<h2 id="dialog-title">Cara bermain</h2>
    <h3>Jaga pasokan listrik</h3><p>MW adalah daya saat ini. Selisih antara pasokan dan permintaan menunjukkan apakah jaringan mampu melayani semua pelanggan. Koin diperoleh dari listrik yang tersalurkan setiap jam simulasi.</p>
    <h3>Rawat dan kembangkan pembangkit</h3><p>Pilih PLTA untuk membuka interior, lalu pilih komponen untuk melihat kondisinya. Servis, perbaikan, penggantian, dan upgrade memakai koin serta waktu. Pasokan sementara turun selama sebagian pekerjaan.</p>
    <h3>Atur distribusi</h3><p>Di tab Pelanggan, tanggapi tawaran baru dan atur jatah daya. Pelanggan prioritas dilayani lebih dulu. Gunakan jeda atau ubah kecepatan saat mengambil keputusan.</p>
    <h3>Gerakkan kamera</h3><p>Geser untuk berpindah, klik kanan dan geser untuk memutar atau memiringkan. Gunakan scroll atau cubit untuk zoom. Di HP, aktifkan Putar kamera lalu geser. Dengan keyboard, pakai panah, Shift + panah, +, −, dan Home.</p>`;
  dialog.showModal();
}

function showRegions() {
  $("#dialog-content").innerHTML = `<h2 id="dialog-title">Wilayah</h2><p>Setiap wilayah punya jaringan dan progres tersendiri.</p>
    <div class="list-stack">${regions.map((meta, index) => {
      const unlocked = !!game.campaign[index];
      const status = game.active === index ? ["Aktif", ""] : unlocked ? ["Terbuka", ""] : ["Terkunci", ""];
      if (unlocked) return row({ title: meta.name, detail: meta.setting, symbol: "map", isSelected: game.active === index, status, command: "region", key: index });
      return `<div class="row-button"><span class="row-icon">${icon("lock")}</span><span><strong class="row-title">${safe(meta.name)}</strong>
        <span class="row-description">${safe(meta.setting)} · Tuntaskan target wilayah sebelumnya</span></span></div>`;
    }).join("")}</div>`;
  dialog.showModal();
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-command]");
  if (!target) return;
  const { command, key } = target.dataset;
  const fromMap = !!target.closest(".map-viewport");
  if (command === "pause") {
    paused = !paused;
    elapsed = 0;
    save();
    render(true);
  } else if (command === "speed") {
    game.speed = Number(target.dataset.speed);
    elapsed = 0;
    save();
    render(true);
  } else if (command === "tab") {
    changeTab(target.dataset.tab);
  } else if (command === "back") {
    clearSelection();
    render(true);
  } else if (command === "site" || (command === "hint" && key !== "offer")) {
    selectSite(key, command === "hint");
    bringPanelIntoView(fromMap, command === "hint" ? ".part-detail" : null);
  } else if (command === "customer") {
    selectCustomer(key);
    bringPanelIntoView(fromMap, ".distribution");
  } else if (command === "part") {
    ui.part = key;
    render(true);
    bringPanelIntoView(fromMap, ".part-detail");
  } else if (command === "offer") {
    dispatch({ kind: "offer", accept: key === "accept" });
  } else if (command === "hint") {
    changeTab("customers");
    bringPanelIntoView(fromMap, ".offer-card");
  } else if (command === "limit") {
    dispatch({ kind: "customer", id: ui.customer, limit: Number(key) });
  } else if (command === "work") {
    dispatch({ kind: target.dataset.action, site: ui.site, key, type: key });
  } else if (command === "zoom-in" || command === "zoom-out") {
    scene.zoom(command === "zoom-in" ? 0.84 : 1.19);
  } else if (command === "orbit") {
    scene.setMode(scene.touchMode === "pan" ? "orbit" : "pan");
  } else if (command === "reset-view") {
    clearSelection();
    scene.reset();
    render(true);
  } else if (command === "guide") {
    showGuide();
  } else if (command === "regions") {
    showRegions();
  } else if (command === "close-dialog") {
    dialog.close();
  } else if (command === "region") {
    save();
    game.active = Number(key);
    paused = game.campaign[game.active].paused === true;
    ui.tab = "grid";
    clearSelection();
    scene.reset();
    elapsed = 0;
    dialog.close();
    save();
    render(true);
  }
});

panel.addEventListener("change", (event) => {
  const input = event.target;
  if (input.dataset.distribution === "limit") {
    dispatch({ kind: "customer", id: ui.customer, limit: Number(input.value) });
  }
  if (input.dataset.distribution === "priority") {
    dispatch({ kind: "customer", id: ui.customer, priority: input.checked });
  }
});
panel.addEventListener("focusout", (event) => {
  if (event.target.id === "customer-limit") setTimeout(render, 0);
});

let previous = performance.now();
setInterval(() => {
  const now = performance.now();
  const difference = Math.min(now - previous, 450);
  previous = now;
  if (paused || document.hidden || dialog.open) return;
  elapsed += difference * game.speed;
  if (elapsed < STEP_MS) return;
  elapsed -= STEP_MS;
  const result = advanceGame(game);
  if (result.pause) {
    paused = true;
    elapsed = 0;
    toast("Alarm pembangkit · Simulasi dijeda", true);
  }
  if (result.unlocked) toast(regions[game.active + 1].name + " sekarang terbuka.");
  save();
  render();
}, 150);

scene.reset();
render(true);

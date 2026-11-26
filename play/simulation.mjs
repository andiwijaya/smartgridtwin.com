export const MAX_ZONES = 8;
const MAX_LEVEL = 3;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const customerTypes = {
  city: { label: "Kota", icon: "city", tariff: 0.58 },
  factory: { label: "Kompleks pabrik", icon: "factory", tariff: 0.76 },
  data: { label: "Data center", icon: "server", tariff: 0.91 },
  commerce: { label: "Kawasan komersial", icon: "city", tariff: 0.71 },
};

const components = {
  turbine: { name: "Turbin", detail: "Putaran air menggerakkan generator.", shape: "turbine", wear: 0.43 },
  generator: { name: "Generator", detail: "Mengubah putaran menjadi listrik.", shape: "generator", wear: 0.31 },
  pump: { name: "Pompa pelumas", detail: "Menjaga bagian bergerak tetap terlumasi.", shape: "pump", wear: 0.32, oil: true },
  panel: { name: "Modul surya", detail: "Menangkap cahaya dan menghasilkan listrik DC.", shape: "panel", wear: 0.2 },
  inverter: { name: "Inverter", detail: "Menyiapkan daya AC untuk jaringan.", shape: "inverter", wear: 0.41 },
  transformer: { name: "Transformator", detail: "Menyesuaikan tegangan untuk penyaluran daya.", shape: "generator", wear: 0.31 },
  rotor: { name: "Rotor angin", detail: "Mengubah energi angin menjadi putaran.", shape: "rotor", wear: 0.48 },
  gearbox: { name: "Transmisi", detail: "Menyalurkan putaran rotor ke generator.", shape: "turbine", wear: 0.42, oil: true },
  steam: { name: "Turbin uap", detail: "Menggerakkan generator melalui putaran.", shape: "turbine", wear: 0.4 },
  cooling: { name: "Sistem pendingin", detail: "Membantu pembangkit menjaga suhu operasi.", shape: "cooling", wear: 0.38 },
};

export const plantTypes = {
  hydro: { name: "PLTA", energy: "Tenaga air", icon: "water", color: "#59c8e6", capacity: 30, price: 870, build: 6, components: ["turbine", "generator", "pump"], description: "Pasokan stabil dengan variasi aliran air.", upgrade: "Menambah unit turbin dan kapasitas." },
  solar: { name: "PLTS", energy: "Tenaga surya", icon: "sun", color: "#d49132", capacity: 24, price: 440, build: 4, components: ["panel", "inverter", "transformer"], description: "Berproduksi saat matahari bersinar.", upgrade: "Menambah modul surya dan kapasitas siang." },
  wind: { name: "PLTB", energy: "Tenaga angin", icon: "wind", color: "#56c7aa", capacity: 31, price: 610, build: 5, components: ["rotor", "gearbox", "generator"], description: "Produksi mengikuti kekuatan angin.", upgrade: "Menambah kapasitas rotor dan generator." },
  nuclear: { name: "PLTN", energy: "Tenaga nuklir", icon: "atom", color: "#b8a5ef", capacity: 54, price: 1220, build: 10, components: ["steam", "generator", "cooling"], description: "Pasokan tinggi dan konsisten, dengan biaya pembangunan besar.", upgrade: "Menambah kapasitas blok pembangkit." },
};

const valleySites = [
  { id: "falls", name: "Air Terjun", x: -19.7, z: 4, types: ["hydro"] },
  { id: "meadow", name: "Padang Timur", x: 29, z: 19, types: ["solar", "wind"] },
  { id: "ridge", name: "Bukit Utara", x: 24, z: -28, types: ["wind", "solar"] },
  { id: "bend", name: "Tikungan Sungai", x: -21.5, z: 26, types: ["hydro"] },
  { id: "south", name: "Dataran Selatan", x: 2, z: 30, types: ["solar", "nuclear"] },
  { id: "forest", name: "Teras Barat", x: -38, z: -13, types: ["wind", "nuclear"] },
];
const layouts = [
  { x: 10, z: -1 }, { x: 1, z: 15 }, { x: 16, z: -17 }, { x: 39, z: -5 },
  { x: -5, z: -22 }, { x: 43, z: 10 }, { x: -9, z: 25 }, { x: 5, z: -30 },
];

export const regions = [
  { id: "arunika", name: "Lembah Arunika", setting: "Lembah sungai", city: "Kota Arunika", production: 1, wind: 1, solar: 1, demand: 16, sites: valleySites, zones: layouts },
  { id: "bayu", name: "Pesisir Bayu", setting: "Pesisir berangin", city: "Kota Bayu", production: 0.9, wind: 1.24, solar: 0.96, demand: 17, sites: valleySites.map((site, index) => ({ ...site, x: site.x + [3, 4, 8, 3, -2, -5][index], z: site.z + [-1, 3, 2, 2, 3, 2][index] })), zones: layouts.map(({ x, z }) => ({ x: x + 2, z: z - 3 })) },
  { id: "bara", name: "Dataran Bara", setting: "Dataran cerah", city: "Kota Bara", production: 0.86, wind: 0.93, solar: 1.3, demand: 18, sites: valleySites.map((site, index) => ({ ...site, x: site.x + [-2, 2, 4, -1, 2, -2][index], z: site.z + [0, -3, 1, -2, 1, 3][index] })), zones: layouts.map(({ x, z }) => ({ x: x + 2, z: z + 2 })) },
];

const offers = [
  { name: "Pabrik Sagara", type: "factory", demand: 12 },
  { name: "Data Center Nusa", type: "data", demand: 17 },
  { name: "Pabrik Sentra", type: "factory", demand: 15 },
  { name: "Distrik Meranti", type: "commerce", demand: 10 },
  { name: "Data Center Awan", type: "data", demand: 20 },
  { name: "Pabrik Lestari", type: "factory", demand: 19 },
  { name: "Kawasan Pasar Timur", type: "commerce", demand: 13 },
  { name: "Pabrik Pangan Raya", type: "factory", demand: 14 },
  { name: "Data Center Rimba", type: "data", demand: 22 },
];

export const jobNames = {
  build: "Pembangunan", rebuild: "Pembangunan ulang", service: "Servis", repair: "Perbaikan",
  replace: "Penggantian", component: "Upgrade komponen", plant: "Upgrade pembangkit",
};

export function partsFor(plant) {
  return plantTypes[plant.type].components.concat(
    plant.type === "hydro" ? ["turbine2", "turbine3"].slice(0, plant.level - 1) : [],
  ).map((key) => {
    const definition = components[key.startsWith("turbine") ? "turbine" : key];
    const name = key === "turbine2" ? "Turbin 2" : key === "turbine3" ? "Turbin 3" : definition.name;
    return { ...definition, key, name, ...plant.parts[key] };
  });
}

function createPlant(site, type, level = 1) {
  const plant = { site, type, level, status: "online", job: null, critical: 0, parts: {} };
  for (const part of partsFor(plant)) {
    plant.parts[part.key] = { level: 1, health: 100, lubricant: part.oil ? 96 : null };
  }
  return plant;
}

function createRegion(index, seed) {
  const meta = regions[index];
  return {
    hour: 0, coins: 370, debt: 0, seed, weather: 0.5, offer: null, nextOffer: 12,
    alarmIntroduced: false, fieldCheck: false, streak: 0, milestone: false,
    plants: [createPlant(meta.sites[0].id, "hydro")],
    customers: [{ id: "city", name: meta.city, type: "city", base: meta.demand, since: 0, limit: 100, priority: true }],
    events: [{ hour: 0, kind: "info", text: meta.city + " terhubung ke PLTA Air Terjun." }],
  };
}

export function createGame(seed = (Math.random() * 0xffffffff) >>> 0) {
  return { version: 1, active: 0, speed: 1, campaign: [createRegion(0, seed || 1)] };
}

export function restoreGame(raw) {
  if (!raw) return createGame();
  try {
    const game = JSON.parse(raw);
    if (
      game.version === 1 && Array.isArray(game.campaign) && game.campaign.length > 0 &&
      game.campaign.length <= regions.length && Number.isInteger(game.active) && game.campaign[game.active] &&
      [1, 2, 4].includes(game.speed) &&
      game.campaign.every((region, index) =>
        region && Number.isInteger(region.hour) && region.hour >= 0 && Number.isFinite(region.coins) &&
        Number.isFinite(region.debt) && Number.isFinite(region.weather) && Number.isInteger(region.seed) &&
        Array.isArray(region.plants) && region.plants.length >= 1 && region.plants.every((plant) =>
          Object.hasOwn(plantTypes, plant.type) && plant.parts && [1, 2, 3].includes(plant.level) &&
          ["online", "building", "destroyed"].includes(plant.status) && regions[index].sites.some((site) => site.id === plant.site) &&
          partsFor(plant).every((part) => Number.isFinite(part.health) && (!part.oil || Number.isFinite(part.lubricant))),
        ) && Array.isArray(region.customers) && region.customers.length <= MAX_ZONES &&
        region.customers.every((customer) => Object.hasOwn(customerTypes, customer.type) && Number.isFinite(customer.base) && Number.isFinite(customer.since)) &&
        Array.isArray(region.events),
      )
    ) return game;
  } catch {
    // Start a fresh campaign if the local save is unreadable.
  }
  return createGame();
}

function rand(region) {
  let value = region.seed | 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  region.seed = (value >>> 0) || 1;
  return region.seed / 4294967296;
}

function log(region, text, kind = "info") {
  region.events.unshift({ hour: region.hour, text, kind });
  region.events.length = Math.min(12, region.events.length);
}

export function timeOf(hour) {
  return (hour + 8) % 24;
}

function capacityFor(plant) {
  const factors = [1, 1.36, 1.72];
  return Math.round(plantTypes[plant.type].capacity * factors[plant.level - 1]);
}

export function partCondition(part) {
  return Math.min(part.health, part.lubricant ?? 100);
}

function plantOutput(plant, region, meta) {
  if (plant.status !== "online") return 0;
  const parts = partsFor(plant);
  const turbineUnits = plant.type === "hydro" ? parts.filter((part) => part.key.startsWith("turbine")) : [];
  const common = parts.filter((part) => !turbineUnits.includes(part));
  const turbineCondition = turbineUnits.length
    ? turbineUnits.reduce((sum, part) => sum + partCondition(part), 0) / turbineUnits.length : 100;
  const condition = Math.min(turbineCondition, ...common.map(partCondition));
  const efficiency = condition >= 66 ? 1 : 0.32 + 0.68 * condition / 66;
  const hours = timeOf(region.hour);
  const sunlight = Math.max(0, Math.sin(Math.PI * (hours - 5) / 15));
  const sources = {
    hydro: (0.96 + 0.04 * region.weather) * meta.production,
    solar: Math.min(1, sunlight * (0.74 + 0.26 * region.weather) * meta.solar),
    wind: Math.min(1, (0.28 + 0.66 * region.weather) * meta.wind),
    nuclear: 0.99,
  };
  const serviceFactor = plant.job ? 0.43 + 0.15 * (plant.level - 1) : 1;
  return capacityFor(plant) * efficiency * sources[plant.type] * serviceFactor;
}

function demandFor(customer, hour) {
  const time = timeOf(hour);
  const growth = Math.min(customer.type === "city" ? 10 : 5, Math.floor((hour - customer.since) / 21));
  const cycle = customer.type === "city"
    ? (time >= 17 && time < 22 ? 4 : time < 7 ? -3 : 0)
    : (customer.type === "data" ? 0 : time >= 7 && time < 19 ? 0 : -2);
  return Math.max(1, customer.base + growth + cycle);
}

export function gridStatus(game) {
  const region = game.campaign[game.active];
  const meta = regions[game.active];
  const plants = region.plants.map((plant) => ({
    ...plant, capacity: capacityFor(plant), output: plantOutput(plant, region, meta),
    condition: Math.min(...partsFor(plant).map(partCondition)),
  }));
  const capacity = plants.filter((plant) => plant.status === "online").reduce((sum, plant) => sum + plant.capacity, 0);
  const supply = plants.reduce((sum, plant) => sum + plant.output, 0);
  let remaining = supply;
  const customers = region.customers.map((customer) => ({ ...customer, demand: demandFor(customer, region.hour), delivered: 0 }));
  for (const customer of customers.slice().sort((a, b) => Number(b.priority) - Number(a.priority))) {
    customer.delivered = Math.min(remaining, customer.demand * customer.limit / 100);
    remaining -= customer.delivered;
  }
  const demand = customers.reduce((sum, customer) => sum + customer.demand, 0);
  const delivered = supply - remaining;
  const income = customers.reduce((sum, customer) => sum + customer.delivered * customerTypes[customer.type].tariff, 0);
  return { meta, region, plants, customers, capacity, supply, demand, delivered, reserve: remaining, income };
}

function startJob(plant, mode, duration, key) {
  plant.job = { mode, left: duration, total: duration, key: key ?? null };
}

function finishJob(plant, region) {
  const { mode, key } = plant.job;
  const part = plant.parts[key];
  if (mode === "build" || mode === "rebuild") plant.status = "online";
  if (mode === "service") {
    part.lubricant = 100;
    part.health = Math.min(100, part.health + 5);
  }
  if (mode === "repair") part.health = 91;
  if (mode === "replace" || mode === "component") {
    if (mode === "component") part.level += 1;
    part.health = 100;
    if (part.lubricant !== null) part.lubricant = 100;
  }
  if (mode === "plant") {
    plant.level += 1;
    for (const item of partsFor(plant)) {
      plant.parts[item.key] ??= { level: 1, health: 100, lubricant: item.oil ? 96 : null };
    }
  }
  plant.job = null;
  log(region, jobNames[mode] + " " + plantTypes[plant.type].name + " selesai.", "success");
}

function maintainPlants(region, grid) {
  let alarm = false;
  for (const plant of region.plants) {
    if (plant.job) {
      plant.job.left -= 1;
      if (plant.job.left <= 0) finishJob(plant, region);
      continue;
    }
    if (plant.status !== "online") continue;
    for (const part of partsFor(plant)) {
      const component = plant.parts[part.key];
      const utilization = clamp(grid.delivered / Math.max(1, grid.supply), 0.15, 1);
      const wear = part.wear * (0.35 + utilization * 0.65) / (1 + (part.level - 1) * 0.62);
      component.health = Math.max(0, component.health - wear * (partCondition(part) < 23 ? 3.6 : 1));
      if (part.oil) {
        component.lubricant = Math.max(0, component.lubricant - wear * 2.45);
        if (part.lubricant >= 39 && component.lubricant < 39) {
          log(region, plantTypes[plant.type].name + " melaporkan oli pelumas rendah.", "warning");
          alarm = true;
        }
      }
      if (part.health >= 47 && component.health < 47) {
        log(region, part.name + " di " + plantTypes[plant.type].name + " perlu diperbaiki.", "warning");
        alarm = true;
      }
    }
    const condition = Math.min(...partsFor(plant).map(partCondition));
    if (condition <= 14) {
      plant.critical += 1;
      if (plant.critical === 1) {
        log(region, plantTypes[plant.type].name + " kritis. Segera servis atau perbaiki komponen.", "critical");
        alarm = true;
      }
      if (plant.critical >= 8) {
        plant.status = "destroyed";
        log(region, plantTypes[plant.type].name + " terbakar dan harus dibangun ulang.", "critical");
        alarm = true;
      }
    } else {
      plant.critical = 0;
    }
  }
  return alarm;
}

function advanceOffer(region) {
  if (region.offer && region.hour >= region.offer.expires) {
    log(region, "Tawaran " + region.offer.name + " berakhir.");
    region.offer = null;
    region.nextOffer = region.hour + 6;
  }
  if (region.offer || region.customers.length >= MAX_ZONES || region.hour < region.nextOffer) return;
  const options = offers.filter((offer) => !region.customers.some((customer) => customer.name === offer.name));
  if (!options.length) return;
  const firstFactory = region.hour === 12 && region.customers.length === 1;
  const available = firstFactory ? options.filter((offer) => offer.type === "factory") : options;
  const offer = available[Math.floor(rand(region) * available.length)];
  region.offer = { ...offer, demand: firstFactory ? Math.min(offer.demand, 14) : offer.demand, expires: region.hour + 24 };
  log(region, offer.name + " meminta sambungan listrik.", "offer");
}

export function advanceGame(game) {
  const grid = gridStatus(game);
  const { region } = grid;
  region.hour += 1;
  const installment = Math.min(grid.income * 0.25, region.debt);
  region.debt -= installment;
  region.coins += grid.income - installment;
  region.weather = clamp(region.weather * 0.78 + rand(region) * 0.22, 0.15, 0.92);
  let alarm = maintainPlants(region, grid);
  if (!region.fieldCheck && region.hour >= 5) {
    region.fieldCheck = true;
    const starter = region.plants[0];
    if (starter.status === "online" && !starter.job && starter.parts.pump.lubricant < 96 && starter.parts.pump.level === 1) {
      starter.parts.pump.lubricant = Math.min(32, starter.parts.pump.lubricant);
      log(region, "Daya PLTA Air Terjun turun. Periksa pompa pelumas.", "warning");
      alarm = true;
    }
  }
  advanceOffer(region);
  if (grid.customers.length >= 2 && grid.plants.filter((plant) => plant.status === "online").length >= 2 && grid.delivered >= grid.demand * 0.9) {
    region.streak += 1;
  } else if (!region.milestone) {
    region.streak = 0;
  }
  let unlocked = false;
  if (region.streak >= 16 && !region.milestone) {
    region.milestone = true;
    const next = game.active + 1;
    if (next < regions.length && !game.campaign[next]) {
      game.campaign[next] = createRegion(next, (region.seed ^ (next * 48271)) >>> 0 || 1);
      log(region, regions[next].name + " terbuka. Pilih Wilayah untuk menjelajah.", "success");
      unlocked = true;
    } else {
      log(region, "Target keandalan wilayah tercapai.", "success");
    }
  }
  const pause = alarm && !region.alarmIntroduced;
  if (pause) region.alarmIntroduced = true;
  return { pause, unlocked };
}

export function plantName(plant, site) {
  return plantTypes[plant.type].name + " " + site.name;
}

export function quote(plant, mode, key) {
  const definition = plantTypes[plant.type];
  const part = plant.parts[key];
  if (mode === "rebuild") return { price: Math.round(definition.price * (0.54 + (plant.level - 1) * 0.16)), duration: definition.build };
  if (mode === "plant") return { price: Math.round(definition.price * (0.41 + (plant.level - 1) * 0.21)), duration: 3 + plant.level };
  if (mode === "service") return { price: 24, duration: 1 };
  if (mode === "repair") return { price: 60 + (part.level - 1) * 20, duration: 2 };
  if (mode === "replace") return { price: 105 + (part.level - 1) * 35, duration: 2 };
  if (mode === "component") return { price: 84 + part.level * 35, duration: 2 };
  return { price: definition.price, duration: definition.build };
}

export function perform(game, action) {
  const { region, meta } = gridStatus(game);
  const deny = (message) => ({ ok: false, message });
  const done = (message, kind = "info") => {
    log(region, message, kind);
    return { ok: true, message };
  };
  if (action.kind === "offer") {
    if (!region.offer) return deny("Tawaran ini sudah berakhir.");
    const offer = region.offer;
    if (action.accept && region.customers.length >= MAX_ZONES) return deny("Semua zona pelanggan sudah terisi.");
    if (action.accept) {
      region.customers.push({ id: "customer-" + region.hour, name: offer.name, type: offer.type, base: offer.demand, since: region.hour, limit: 100, priority: false });
    }
    region.offer = null;
    region.nextOffer = region.hour + 12 + Math.floor(rand(region) * 13);
    return done(action.accept ? offer.name + " terhubung ke jaringan." : "Tawaran " + offer.name + " ditolak.", action.accept ? "success" : "info");
  }
  if (action.kind === "customer") {
    const customer = region.customers.find((item) => item.id === action.id);
    if (!customer) return deny("Pelanggan belum terhubung.");
    if ([0, 25, 50, 75, 100].includes(action.limit)) customer.limit = action.limit;
    if (typeof action.priority === "boolean") customer.priority = action.priority;
    return { ok: true, message: "Distribusi " + customer.name + " diperbarui." };
  }
  const site = meta.sites.find((item) => item.id === action.site);
  if (!site) return deny("Pilih lokasi pembangkit.");
  const plant = region.plants.find((item) => item.site === site.id);
  if (action.kind === "build") {
    if (plant || !site.types.includes(action.type)) return deny("Pembangkit ini tidak bisa dibangun di lokasi tersebut.");
    const next = createPlant(site.id, action.type);
    const cost = quote(next, "build");
    if (region.coins < cost.price) return deny("Koin belum cukup untuk pembangunan.");
    region.coins -= cost.price;
    next.status = "building";
    startJob(next, "build", cost.duration);
    region.plants.push(next);
    return done(plantName(next, site) + " mulai dibangun.");
  }
  if (!plant || plant.job) return deny("Pembangkit sedang mengerjakan pekerjaan lain.");
  if (action.kind === "rebuild") {
    if (plant.status !== "destroyed") return deny("Pembangunan ulang tersedia setelah pembangkit hancur.");
    const cost = quote(plant, "rebuild");
    const loan = Math.max(0, cost.price - region.coins);
    if (loan > 0 && region.plants.some((item) => item.status !== "destroyed")) return deny("Kumpulkan koin dari jaringan yang masih beroperasi.");
    region.coins = Math.max(0, region.coins - cost.price);
    region.debt += loan;
    const next = createPlant(site.id, plant.type, plant.level);
    next.status = "building";
    startJob(next, "rebuild", cost.duration);
    region.plants[region.plants.indexOf(plant)] = next;
    return done(loan ? "Pembangunan ulang dimulai dengan pinjaman " + Math.ceil(loan) + " koin." : "Pembangunan ulang dimulai.");
  }
  if (plant.status !== "online") return deny("Pembangkit belum beroperasi.");
  if (action.kind === "plant") {
    if (plant.level >= MAX_LEVEL) return deny("Pembangkit sudah mencapai level tertinggi.");
  } else {
    const part = plant.parts[action.key];
    if (!part || !["service", "repair", "replace", "component"].includes(action.kind)) return deny("Pilih tindakan komponen.");
    if (action.kind === "component" && part.level >= MAX_LEVEL) return deny("Komponen sudah mencapai level tertinggi.");
    if (action.kind === "repair" && part.health >= 91) return deny("Komponen masih dalam kondisi baik.");
    if (action.kind === "service" && (part.lubricant === null || part.lubricant >= 100)) return deny("Oli pelumas masih penuh.");
  }
  const cost = quote(plant, action.kind, action.key);
  if (region.coins < cost.price) return deny("Koin belum cukup untuk tindakan ini.");
  region.coins -= cost.price;
  startJob(plant, action.kind, cost.duration, action.key);
  return done(jobNames[action.kind] + " di " + plantName(plant, site) + " dimulai.");
}

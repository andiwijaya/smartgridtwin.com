import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_ZONES, advanceGame, createGame, gridStatus, partsFor, perform, quote, regions, restoreGame,
} from "../play/simulation.mjs";

function run(game, hours) {
  return Array.from({ length: hours }, () => advanceGame(game));
}

function serviceStarter(game) {
  assert.equal(perform(game, { kind: "service", site: "falls", key: "pump" }).ok, true);
  advanceGame(game);
}

test("the first alarm pauses once, and oil service restores hydro generation", () => {
  const game = createGame(19);
  const initial = gridStatus(game);
  assert.equal(initial.plants.length, 1);
  assert.equal(initial.customers.length, 1);
  assert.equal(initial.delivered, initial.demand);
  assert.equal(run(game, 5).filter((step) => step.pause).length, 1);
  assert.ok(gridStatus(game).supply < initial.supply - 7);
  const coins = game.campaign[0].coins;
  serviceStarter(game);
  assert.equal(game.campaign[0].plants[0].parts.pump.lubricant, 100);
  assert.ok(Math.abs(gridStatus(game).supply - initial.supply) < 2);
  assert.ok(game.campaign[0].coins < coins);
  assert.ok(run(game, 5).every((step) => !step.pause));
});

test("accepting, prioritizing, capping, disconnecting, and reconnecting affect real allocations", () => {
  const game = createGame(28);
  run(game, 12);
  assert.equal(game.campaign[0].offer.type, "factory");
  assert.equal(perform(game, { kind: "offer", accept: true }).ok, true);
  const factory = gridStatus(game).customers[1];
  assert.ok(factory.delivered < factory.demand);
  assert.equal(perform(game, { kind: "customer", id: "city", priority: false }).ok, true);
  assert.equal(perform(game, { kind: "customer", id: factory.id, priority: true }).ok, true);
  assert.equal(gridStatus(game).customers[1].delivered, factory.demand);
  assert.equal(perform(game, { kind: "customer", id: factory.id, limit: 25 }).ok, true);
  assert.equal(gridStatus(game).customers[1].delivered, factory.demand * 0.25);
  perform(game, { kind: "customer", id: factory.id, limit: 0 });
  assert.equal(gridStatus(game).customers[1].delivered, 0);
  perform(game, { kind: "customer", id: factory.id, limit: 100 });
  assert.equal(gridStatus(game).customers[1].delivered, factory.demand);
  const grid = gridStatus(game);
  assert.ok(grid.delivered <= grid.supply);
});

test("builds and upgrades charge once and add capacity only after completion", () => {
  const game = createGame(10);
  const region = game.campaign[0];
  region.coins = 3000;
  const start = { kind: "build", site: "meadow", type: "solar" };
  assert.equal(perform(game, { ...start, type: "nuclear" }).ok, false);
  assert.equal(perform(game, start).ok, true);
  const after = region.coins;
  assert.equal(perform(game, start).ok, false);
  assert.equal(region.coins, after);
  assert.equal(gridStatus(game).plants[1].output, 0);
  run(game, 4);
  assert.equal(gridStatus(game).plants[1].status, "online");
  assert.ok(gridStatus(game).plants[1].output > 0);
  const hydro = region.plants[0];
  const info = quote(hydro, "plant");
  const capacity = gridStatus(game).plants[0].capacity;
  assert.equal(perform(game, { kind: "plant", site: hydro.site }).ok, true);
  assert.equal(perform(game, { kind: "component", site: hydro.site, key: "turbine" }).ok, false);
  assert.equal(gridStatus(game).plants[0].capacity, capacity);
  run(game, info.duration);
  assert.equal(hydro.level, 2);
  assert.ok(gridStatus(game).plants[0].capacity > capacity);
  assert.ok(partsFor(hydro).some((part) => part.key === "turbine2"));
  assert.equal(perform(game, { kind: "component", site: hydro.site, key: "turbine2" }).ok, true);
  run(game, 2);
  assert.equal(hydro.parts.turbine2.level, 2);
});

test("a critical plant burns, rebuilds using a loan, and repays from restored supply", () => {
  const game = createGame(18);
  const region = game.campaign[0];
  region.coins = 10;
  region.plants[0].parts.pump.lubricant = 1;
  run(game, 8);
  assert.equal(gridStatus(game).plants[0].status, "destroyed");
  assert.equal(gridStatus(game).supply, 0);
  assert.equal(perform(game, { kind: "rebuild", site: "falls" }).ok, true);
  const debt = region.debt;
  assert.ok(debt > 0);
  assert.equal(region.coins, 0);
  assert.equal(perform(game, { kind: "rebuild", site: "falls" }).ok, false);
  const resumed = restoreGame(JSON.stringify(game));
  assert.deepEqual(resumed, game);
  run(resumed, 6);
  assert.equal(gridStatus(resumed).plants[0].status, "online");
  assert.equal(resumed.campaign[0].debt, debt);
  advanceGame(resumed);
  assert.ok(resumed.campaign[0].debt < debt);
  assert.ok(resumed.campaign[0].coins > 0);
});

test("bounded expansion unlocks a separate region and stops generating offers at the cap", () => {
  const game = createGame(31);
  const region = game.campaign[0];
  region.coins = 5000;
  assert.equal(perform(game, { kind: "build", site: "south", type: "nuclear" }).ok, true);
  run(game, 12);
  serviceStarter(game);
  const firstOffer = region.offer;
  assert.equal(perform(game, { kind: "offer", accept: false }).ok, true);
  assert.equal(region.customers.length, 1);
  assert.equal(region.offer, null);
  assert.ok(firstOffer);
  run(game, 25);
  assert.equal(perform(game, { kind: "offer", accept: true }).ok, true);
  assert.equal(run(game, 16).filter((step) => step.unlocked).length, 1);
  assert.equal(game.campaign.length, 2);
  game.active = 1;
  assert.equal(gridStatus(game).meta.id, regions[1].id);
  assert.equal(gridStatus(game).plants.length, 1);
  assert.equal(gridStatus(game).customers.length, 1);
  game.active = 0;
  while (region.customers.length < MAX_ZONES) {
    region.nextOffer = region.hour + 1;
    advanceGame(game);
    assert.equal(perform(game, { kind: "offer", accept: true }).ok, true);
  }
  run(game, 40);
  assert.equal(region.offer, null);
  assert.equal(gridStatus(game).customers.length, MAX_ZONES);
  assert.equal(perform(game, { kind: "offer", accept: true }).ok, false);
});

test("unreadable saves restart without breaking the game", () => {
  for (const raw of ["{", '{"version":1,"active":0,"campaign":[null]}']) {
    const reset = restoreGame(raw);
    assert.equal(gridStatus(reset).region.hour, 0);
    assert.equal(gridStatus(reset).plants.length, 1);
  }
});

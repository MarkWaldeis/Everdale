import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultState,
  harvestResource,
  canPlaceBuilding,
  placeBuilding,
  completeResearch,
  startResearch,
  tickVillagerWork,
  getPlayerLevel,
  getNodeStatus,
  getActiveQuest,
  isValleyUnlocked,
  consumeSoup,
  fillValleyCrate,
  canCollectResource,
  getUpgradeInfo,
  upgradeBuilding,
  getBuildingLevel,
  listOrders,
  canFillOrder,
  fillOrder,
  ORDER_SLOTS,
  getConstruction,
  tickConstructions,
} from "../src/world/simulation.js";

test("fresh start keeps later buildings locked", () => {
  const state = createDefaultState();
  assert.equal(state.placed.study, true);
  assert.equal(state.placed["clay-pit"], false);
  assert.equal(state.placed["stone-storage"], false);
  assert.equal(canPlaceBuilding(state, "clay-pit"), false);
  assert.equal(canPlaceBuilding(state, "stone-storage"), false);
  assert.equal(canPlaceBuilding(state, "bakery"), false);
  assert.equal(getNodeStatus(state, "clay-pit"), "ready");
  assert.equal(isValleyUnlocked(state), false);
  assert.equal(state.villagers.sophie.unlocked, false);
  assert.equal(state.villagers.lena.unlocked, true);
});

test("harvest increments the real item and respects the cap", () => {
  const state = createDefaultState();
  const first = harvestResource(state, "wood", 5);
  assert.equal(first.ok, true);
  assert.equal(first.added, 5);
  assert.equal(first.total, 5);
  assert.equal(state.village.wood, 5);

  const overflow = harvestResource(state, "wood", 40);
  assert.equal(overflow.total, 20);
  assert.equal(overflow.capped, true);
  assert.equal(state.village.wood, 20);
  assert.equal(state.village.woodCap, 20);

  const lockedStone = harvestResource(state, "stone", 5);
  assert.equal(lockedStone.ok, false);
  assert.equal(lockedStone.reason, "locked");
  assert.equal(state.village.stone, 0);
});

test("research spend unlocks a previously locked building", () => {
  const state = createDefaultState();
  assert.equal(state.placed.study, true);
  assert.equal(getNodeStatus(state, "clay-pit"), "ready");
  assert.equal(completeResearch(state, "clay-pit").ok, false);

  harvestResource(state, "wood", 5);
  harvestResource(state, "wood", 5);
  assert.equal(state.village.wood, 10);
  const started = startResearch(state, "clay-pit");
  assert.equal(started.ok, true);
  const researched = completeResearch(state, "clay-pit");
  assert.equal(researched.ok, true);
  assert.equal(researched.unlockedBuilding, "clay-pit");
  assert.equal(state.unlocked["clay-pit"], true);
  assert.equal(state.village.wood, 0);

  harvestResource(state, "wood", 5);
  harvestResource(state, "wood", 5);
  assert.equal(canPlaceBuilding(state, "clay-pit"), true);
  assert.equal(placeBuilding(state, "clay-pit").ok, true);
  assert.equal(state.placed["clay-pit"], true);
});

test("working tick consumes soup and empty soup yields HUNGRY", () => {
  const state = createDefaultState();
  state.village.soup = 1;
  state.villagers.lena.state = "WORKING";
  const stillFed = tickVillagerWork(state, "lena", 10);
  assert.equal(stillFed, false);
  assert.equal(state.villagers.lena.hungry, false);

  const consumed = tickVillagerWork(state, "lena", 90);
  assert.equal(consumed, false);
  assert.equal(state.village.soup, 0);
  assert.equal(state.villagers.lena.hungry, false);

  const emptied = tickVillagerWork(state, "lena", 5);
  assert.equal(emptied, true);
  assert.equal(state.villagers.lena.hungry, true);
  assert.equal(state.villagers.lena.state, "HUNGRY");
  assert.equal(consumeSoup(state, 1), false);
});

test("player level increases after a qualifying harvest or research action", () => {
  const state = createDefaultState();
  assert.equal(getPlayerLevel(state), 1);
  harvestResource(state, "wood", 5);
  assert.ok(getPlayerLevel(state) > 1, "harvest must raise level");
  const afterHarvest = getPlayerLevel(state);

  harvestResource(state, "wood", 5);
  completeResearch(state, "clay-pit");
  assert.ok(getPlayerLevel(state) > afterHarvest, "research must raise level");
});

test("clay cannot be collected until clay-storage is placed", () => {
  const state = createDefaultState();
  assert.equal(canCollectResource(state, "clay"), false);

  harvestResource(state, "wood", 5);
  harvestResource(state, "wood", 5);
  assert.equal(completeResearch(state, "clay-pit").ok, true);

  harvestResource(state, "wood", 5);
  harvestResource(state, "wood", 5);
  assert.equal(placeBuilding(state, "clay-pit").ok, true);
  assert.equal(state.placed["clay-pit"], true);
  assert.equal(state.placed["clay-storage"], false);
  assert.equal(canCollectResource(state, "clay"), false);

  const blocked = harvestResource(state, "clay", 5);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, "locked");
  assert.equal(blocked.added, 0);
  assert.equal(state.village.clay, 0);

  harvestResource(state, "wood", 5);
  harvestResource(state, "wood", 5);
  assert.equal(completeResearch(state, "clay-storage").ok, true);
  harvestResource(state, "wood", 5);
  harvestResource(state, "wood", 5);
  assert.equal(placeBuilding(state, "clay-storage").ok, true);
  assert.equal(canCollectResource(state, "clay"), true);

  const dug = harvestResource(state, "clay", 5);
  assert.equal(dug.ok, true);
  assert.equal(dug.added, 5);
  assert.equal(state.village.clay, 5);
});

test("quest asks for house research before valley", () => {
  const state = createDefaultState();
  state.nodes["clay-pit"] = "done";
  state.nodes["clay-storage"] = "done";
  state.nodes["stone-storage"] = "done";
  state.placed["clay-pit"] = true;
  state.placed["clay-storage"] = true;
  state.placed["stone-storage"] = true;
  const quest = getActiveQuest(state);
  assert.equal(quest.id, "research-house");
});

test("valley crates stay locked until researched", () => {
  const state = createDefaultState();
  assert.equal(fillValleyCrate(state, 0).ok, false);
  state.valleyUnlocked = true;
  state.village.wood = 5;
  const filled = fillValleyCrate(state, 0);
  assert.equal(filled.ok, true);
  assert.equal(state.village.wood, 0);
  assert.ok(state.village.gold > 0);
});

test("storage upgrade raises the cap and spends resources", () => {
  const state = createDefaultState();
  assert.equal(state.village.woodCap, 20);
  const info = getUpgradeInfo(state, "wood-storage");
  assert.equal(info.level, 1);
  assert.equal(info.atMax, false);
  assert.equal(info.nextCap, 45);

  assert.equal(upgradeBuilding(state, "wood-storage").ok, false);

  state.village.wood = 10;
  state.village.stone = 4;
  const done = upgradeBuilding(state, "wood-storage");
  assert.equal(done.ok, true);
  assert.equal(done.level, 2);
  assert.equal(state.village.woodCap, 45);
  assert.equal(state.village.wood, 0);
  assert.equal(state.village.stone, 0);
  assert.equal(getBuildingLevel(state, "wood-storage"), 2);
});

test("kitchen upgrade raises the soup cap and maxes out", () => {
  const state = createDefaultState();
  state.village.wood = 40;
  state.village.clay = 40;
  assert.equal(upgradeBuilding(state, "kitchen").ok, true);
  assert.equal(state.village.soupCap, 16);
  assert.equal(upgradeBuilding(state, "kitchen").ok, true);
  assert.equal(state.village.soupCap, 24);
  const last = upgradeBuilding(state, "kitchen");
  assert.equal(last.ok, false);
  assert.equal(last.reason, "max");
  assert.equal(getUpgradeInfo(state, "kitchen").atMax, true);
});

test("unplaced buildings cannot be upgraded", () => {
  const state = createDefaultState();
  assert.equal(getUpgradeInfo(state, "stone-storage"), null);
  assert.equal(upgradeBuilding(state, "stone-storage").ok, false);
});

test("order board offers fillable slots and pays rewards", () => {
  const state = createDefaultState();
  const orders = listOrders(state);
  assert.equal(orders.length, ORDER_SLOTS);
  assert.equal(orders[0].requests.wood, 5);
  const firstKey = orders[0].key;
  assert.equal(canFillOrder(state, 0), false);

  state.village.wood = 5;
  assert.equal(canFillOrder(state, 0), true);
  const filled = fillOrder(state, 0);
  assert.equal(filled.ok, true);
  assert.equal(state.village.wood, 0);
  assert.equal(state.village.gold, 6);

  const next = listOrders(state)[0];
  assert.notEqual(next.key, firstKey);
});

test("gated orders stay out of the deck until unlocked", () => {
  const state = createDefaultState();
  const orders = listOrders(state);
  assert.ok(orders.every((order) => !order.requiresPlaced));

  state.placed["clay-pit"] = true;
  let found = false;
  for (let index = 0; index < 12; index += 1) {
    const slot = listOrders(state)[index % ORDER_SLOTS];
    if (slot.requiresPlaced === "clay-pit") {
      found = true;
      break;
    }
    state.village.wood = 99;
    state.village.pumpkins = 99;
    state.village.soup = 99;
    fillOrder(state, index % ORDER_SLOTS);
  }
  assert.equal(found, true);
});

test("fillOrder rejects orders that cannot be afforded", () => {
  const state = createDefaultState();
  listOrders(state);
  const blocked = fillOrder(state, 0);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, "items");
  assert.equal(state.village.gold, 0);
});

test("house-ii research unlocks the build, not the villager", () => {
  const state = createDefaultState();
  state.nodes["stone-storage"] = "done";
  state.village.wood = 60;
  assert.equal(canPlaceBuilding(state, "house-ii"), false);
  const done = completeResearch(state, "house-ii");
  assert.equal(done.ok, true);
  assert.equal(done.unlockedBuilding, "house-ii");
  assert.equal(state.villagers.sophie.unlocked, false);
});

test("house-ii construction completes into sophie moving in", () => {
  const state = createDefaultState();
  state.unlocked["house-ii"] = true;
  state.village.wood = 20;
  state.village.stone = 10;
  const placed = placeBuilding(state, "house-ii");
  assert.equal(placed.ok, true);
  const construction = getConstruction(state, "house-ii");
  assert.ok(construction);
  assert.equal(construction.total, 24);
  assert.equal(state.buildings["house-ii"].status, "CONSTRUCTION");
  assert.equal(state.villagers.sophie.unlocked, false);

  tickConstructions(state, 30);
  assert.equal(getConstruction(state, "house-ii"), null);
  assert.equal(state.buildings["house-ii"].status, "ACTIVE");
  assert.equal(state.villagers.sophie.unlocked, true);
  assert.equal(getActiveQuest(state).id === "build-house", false);
});

test("quest asks to build the house before valley research", () => {
  const state = createDefaultState();
  state.nodes["clay-pit"] = "done";
  state.nodes["clay-storage"] = "done";
  state.nodes["stone-storage"] = "done";
  state.nodes["house-ii"] = "done";
  state.placed["clay-pit"] = true;
  state.placed["clay-storage"] = true;
  state.placed["stone-storage"] = true;
  const quest = getActiveQuest(state);
  assert.equal(quest.id, "build-house");
});

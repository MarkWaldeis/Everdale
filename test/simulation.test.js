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
  isValleyUnlocked,
  consumeSoup,
  fillValleyCrate,
  canCollectResource,
} from "../src/world/simulation.js";

test("fresh start keeps later buildings locked", () => {
  const state = createDefaultState();
  assert.equal(state.placed.study, false);
  assert.equal(state.placed["clay-pit"], false);
  assert.equal(state.placed["stone-storage"], false);
  assert.equal(canPlaceBuilding(state, "clay-pit"), false);
  assert.equal(canPlaceBuilding(state, "stone-storage"), false);
  assert.equal(canPlaceBuilding(state, "bakery"), false);
  assert.equal(getNodeStatus(state, "clay-pit"), "locked");
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
  harvestResource(state, "wood", 5);
  harvestResource(state, "wood", 5);
  assert.equal(state.village.wood, 10);
  assert.equal(canPlaceBuilding(state, "study"), true);
  const built = placeBuilding(state, "study");
  assert.equal(built.ok, true);
  assert.equal(state.placed.study, true);
  assert.equal(state.village.wood, 0);
  assert.equal(getNodeStatus(state, "clay-pit"), "ready");

  const started = startResearch(state, "clay-pit");
  assert.equal(started.ok, true);
  const researched = completeResearch(state, "clay-pit");
  assert.equal(researched.ok, true);
  assert.equal(researched.unlockedBuilding, "clay-pit");
  assert.equal(state.unlocked["clay-pit"], true);

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
  placeBuilding(state, "study");
  completeResearch(state, "clay-pit");
  assert.ok(getPlayerLevel(state) > afterHarvest, "research must raise level");
});

test("clay cannot be collected until clay-storage is placed", () => {
  const state = createDefaultState();
  assert.equal(canCollectResource(state, "clay"), false);

  harvestResource(state, "wood", 5);
  harvestResource(state, "wood", 5);
  assert.equal(placeBuilding(state, "study").ok, true);
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

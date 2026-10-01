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
  applyOfflineProgress,
  queueRecipe,
  tickProduction,
  brewPotion,
  tickBrewing,
  applyPotion,
  tickBuffs,
  villagerSpeed,
  canPlaceDecoration,
  removeDecoration,
  tickValley,
  rushConstruction,
  rushBrewing,
  rushResearch,
  getShip,
  buildLibrary,
  isLibraryBuilt,
  buildGuildhall,
  isGuildhallBuilt,
  buildMine,
  isMineBuilt,
  getMineProgress,
  MINE_SECONDS,
  buildMonumentStage,
  getMonumentStage,
  isVillagerUnlocked,
  tickResearch,
  villagerSkillLevel,
  tickVillagerSkill,
  recordSkillHit,
  hitsForSkill,
  placeDecoration,
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

test("offline progress finishes constructions while away", () => {
  const state = createDefaultState();
  state.unlocked["house-ii"] = true;
  state.village.wood = 20;
  state.village.stone = 10;
  placeBuilding(state, "house-ii");
  const summary = applyOfflineProgress(state, 3600);
  assert.ok(summary.constructions.includes("house-ii"));
  assert.equal(getConstruction(state, "house-ii"), null);
  assert.equal(state.villagers.sophie.unlocked, true);
});

test("offline progress completes an active research", () => {
  const state = createDefaultState();
  state.village.wood = 20;
  startResearch(state, "clay-pit");
  const summary = applyOfflineProgress(state, 600);
  assert.equal(summary.researchDone, "clay-pit");
  assert.equal(state.nodes["clay-pit"], "done");
  assert.equal(state.unlocked["clay-pit"], true);
});

test("bakery research unlocks a placeable bakery", () => {
  const state = createDefaultState();
  state.nodes["valley-access"] = "done";
  state.placed["clay-pit"] = true;
  state.placed["clay-storage"] = true;
  state.placed["stone-storage"] = true;
  state.placed["house-ii"] = true;
  state.village.wood = 50;
  state.village.clay = 20;
  const done = completeResearch(state, "bakery");
  assert.equal(done.ok, true);
  assert.equal(done.unlockedBuilding, "bakery");
  assert.equal(canPlaceBuilding(state, "bakery"), true);
  const placed = placeBuilding(state, "bakery");
  assert.equal(placed.ok, true);
  assert.equal(state.placed.bakery, true);
});

test("bake queue spends inputs up front and produces bread", () => {
  const state = createDefaultState();
  state.unlocked.bakery = true;
  state.village.wood = 40;
  state.village.clay = 20;
  state.village.pumpkins = 6;
  placeBuilding(state, "bakery");

  const queued = queueRecipe(state, "bakery", "bread");
  assert.equal(queued.ok, true);
  assert.equal(state.village.pumpkins, 4);
  assert.equal(state.village.wood, 23);
  assert.equal(state.buildings.bakery.productionQueue.length, 1);

  const produced = tickProduction(state, "bakery", 31);
  assert.equal(produced.produced, "bread");
  assert.equal(state.village.bread, 1);
  assert.equal(state.buildings.bakery.productionQueue.length, 0);
});

test("bake queue rejects when broke or full and stalls on full storage", () => {
  const state = createDefaultState();
  state.unlocked.bakery = true;
  state.village.wood = 40;
  state.village.clay = 20;
  state.village.pumpkins = 2;
  placeBuilding(state, "bakery");
  assert.equal(queueRecipe(state, "bakery", "bread").ok, true);
  assert.equal(queueRecipe(state, "bakery", "bread").ok, false);
  state.village.pumpkins = 20;
  assert.equal(queueRecipe(state, "bakery", "bread").ok, true);
  assert.equal(queueRecipe(state, "bakery", "bread").ok, true);
  assert.equal(queueRecipe(state, "bakery", "bread").ok, true);
  assert.equal(queueRecipe(state, "bakery", "bread").ok, false);
  assert.equal(state.buildings.bakery.productionQueue.length, 4);

  state.village.bread = state.village.breadCap;
  const stalled = tickProduction(state, "bakery", 60);
  assert.equal(stalled.blocked, "cap");
  assert.equal(state.buildings.bakery.productionQueue.length, 4);
});

test("bread orders only appear once the bakery stands", () => {
  const state = createDefaultState();
  const without = listOrders(state).filter((slot) =>
    slot && Object.keys(slot.requests).includes("bread"),
  );
  assert.equal(without.length, 0);
  state.unlocked.bakery = true;
  state.village.wood = 200;
  state.village.clay = 100;
  state.village.pumpkins = 100;
  state.village.soup = 50;
  state.village.stone = 100;
  placeBuilding(state, "bakery");
  let found = 0;
  for (let i = 0; i < 40 && found === 0; i += 1) {
    const slots = listOrders(state);
    const slot = slots.findIndex(
      (entry) => entry && Object.keys(entry.requests).includes("bread"),
    );
    if (slot >= 0) {
      state.village.bread = 10;
      if (fillOrder(state, slot).ok) found = 1;
      break;
    }
    const fillIdx = slots.findIndex((entry, index) => entry && canFillOrder(state, index));
    if (fillIdx < 0) break;
    fillOrder(state, fillIdx);
  }
  assert.equal(found, 1);
});

test("tailor sews blankets from wood and clay", () => {
  const state = createDefaultState();
  state.unlocked.tailor = true;
  state.village.wood = 40;
  state.village.clay = 20;
  placeBuilding(state, "tailor");

  const queued = queueRecipe(state, "tailor", "blanket");
  assert.equal(queued.ok, true);
  assert.equal(state.village.wood, 24);
  assert.equal(state.village.clay, 11);

  const produced = tickProduction(state, "tailor", 51);
  assert.equal(produced.produced, "blanket");
  assert.equal(state.village.blanket, 1);
});

test("wood-workshop planes logs into two planks each run", () => {
  const state = createDefaultState();
  state.unlocked["wood-workshop"] = true;
  state.village.wood = 30;
  placeBuilding(state, "wood-workshop");

  assert.equal(queueRecipe(state, "wood-workshop", "planks").ok, true);
  assert.equal(state.village.wood, 15);
  const produced = tickProduction(state, "wood-workshop", 36);
  assert.equal(produced.produced, "planks");
  assert.equal(produced.amount, 2);
  assert.equal(state.village.planks, 2);

  assert.equal(queueRecipe(state, "wood-workshop", "rope").ok, false);
});

test("tailor and workshop goods join the order deck after placement", () => {
  const state = createDefaultState();
  state.unlocked.tailor = true;
  state.unlocked["wood-workshop"] = true;
  state.village.wood = 500;
  state.village.clay = 300;
  state.village.pumpkins = 100;
  state.village.soup = 50;
  state.village.stone = 100;
  placeBuilding(state, "tailor");
  placeBuilding(state, "wood-workshop");
  const seen = new Set();
  for (let i = 0; i < 60 && seen.size < 2; i += 1) {
    const slots = listOrders(state);
    slots.forEach((entry) => {
      if (!entry) return;
      Object.keys(entry.requests).forEach((key) => {
        if (["rope", "blanket", "planks", "bucket"].includes(key)) seen.add(key);
      });
    });
    const fillIdx = slots.findIndex((entry, index) => entry && canFillOrder(state, index));
    if (fillIdx < 0) break;
    state.village.bread = 50;
    fillOrder(state, fillIdx);
  }
  assert.ok(seen.size >= 1);
});

test("potions research unlocks brewing at the lab", () => {
  const state = createDefaultState();
  state.nodes["wood-workshop"] = "done";
  state.village.wood = 30;
  state.village.scrolls = 5;
  assert.equal(brewPotion(state, "energie").ok, false);
  const done = completeResearch(state, "potions");
  assert.equal(done.ok, true);
  assert.equal(state.potionsUnlocked, true);
});

test("brewing a potion pays inputs and produces over time", () => {
  const state = createDefaultState();
  state.potionsUnlocked = true;
  state.village.pumpkins = 5;
  state.village.soup = 3;
  const brewed = brewPotion(state, "energie");
  assert.equal(brewed.ok, true);
  assert.equal(state.village.pumpkins, 4);
  assert.equal(state.village.soup, 2);
  assert.equal(state.brewing.queue.length, 1);

  const produced = tickBrewing(state, 41);
  assert.equal(produced.produced, "energie");
  assert.equal(state.potions.energie, 1);
});

test("sattmacher feeds a hungry villager and energie speeds work", () => {
  const state = createDefaultState();
  state.potionsUnlocked = true;
  state.village.pumpkins = 5;
  state.village.clay = 5;
  brewPotion(state, "sattmacher");
  tickBrewing(state, 36);

  const villager = state.villagers.lena;
  villager.hungry = true;
  villager.state = "HUNGRY";
  villager.workSeconds = 99;
  const applied = applyPotion(state, "sattmacher", "lena");
  assert.equal(applied.ok, true);
  assert.equal(villager.hungry, false);
  assert.equal(villager.workSeconds, 0);
  assert.equal(villager.activeBuff.effect, "meal");

  assert.equal(villagerSpeed(state, "lena"), 1);
  state.potions.energie = 1;
  applyPotion(state, "energie", "john");
  assert.equal(villagerSpeed(state, "john"), 1.6);
  tickBuffs(state, 121);
  assert.ok(state.villagers.john.activeBuff); // buffs pause while idle
  state.villagers.john.state = "WORKING";
  tickBuffs(state, 121);
  assert.equal(state.villagers.john.activeBuff, null);
});

test("decorations can be placed repeatedly and grant reputation", () => {
  const state = createDefaultState();
  state.village.wood = 10;
  const first = placeDecoration(state, "deko-daisy");
  assert.equal(first.ok, true);
  assert.equal(first.uid, "deko-daisy-1");
  const second = placeDecoration(state, "deko-daisy");
  assert.equal(second.ok, true);
  assert.equal(second.uid, "deko-daisy-2");
  assert.equal(state.village.wood, 8);
  assert.equal(state.village.reputation, 2);
  assert.equal(state.decorations.length, 2);
  assert.equal(canPlaceDecoration(state, "deko-fountain"), false);
});

test("removeDecoration refunds cost and revokes reputation", () => {
  const state = createDefaultState();
  state.village.wood = 10;
  state.village.stone = 10;
  state.village.clay = 10;
  placeDecoration(state, "deko-daisy");
  const placed = placeDecoration(state, "deko-fountain");
  assert.equal(state.village.reputation, 4);
  const removed = removeDecoration(state, placed.uid);
  assert.equal(removed.ok, true);
  assert.equal(state.decorations.length, 1);
  assert.equal(state.village.stone, 10);
  assert.equal(state.village.clay, 10);
  assert.equal(state.village.reputation, 1);
  assert.equal(removeDecoration(state, placed.uid).ok, false);
});

test("valley ship departs when all crates are filled and returns with cargo", () => {
  const state = createDefaultState();
  state.valleyUnlocked = true;
  state.village.wood = 30;
  state.village.clay = 30;
  state.village.stone = 30;
  state.valley.crates.forEach((crate) => {
    crate.filledBy = "player";
  });
  const departed = tickValley(state, 0.5);
  assert.equal(departed.event, "departed");
  assert.equal(state.valley.ship.status, "sailing");

  const returned = tickValley(state, 91);
  assert.equal(returned.event, "returned");
  assert.equal(state.valley.ship.status, "loading");
  assert.equal(state.valley.ship.voyages, 1);
  assert.equal(state.village.gems, 2);
  assert.equal(state.valley.crates.every((crate) => !crate.filledBy), true);
});

test("gem rush completes construction, brewing and research instantly", () => {
  const state = createDefaultState();
  state.village.gems = 3;
  state.village.wood = 60;
  state.village.stone = 20;
  state.village.clay = 20;
  state.unlocked["house-ii"] = true;

  const placed = placeBuilding(state, "house-ii");
  assert.equal(placed.ok, true);
  assert.ok(state.constructions["house-ii"]);
  assert.equal(rushConstruction(state, "house-ii").ok, true);
  assert.equal(state.constructions["house-ii"], undefined);
  assert.equal(state.buildings["house-ii"].status, "ACTIVE");
  assert.equal(state.villagers.sophie.unlocked, true);
  assert.equal(state.village.gems, 2);

  state.potionsUnlocked = true;
  state.village.pumpkins = 5;
  state.village.soup = 5;
  brewPotion(state, "energie");
  assert.equal(rushBrewing(state).ok, true);
  const produced = tickBrewing(state, 0.01);
  assert.equal(produced.produced, "energie");
  assert.equal(state.village.gems, 1);

  state.nodes["clay-pit"] = "locked";
  state.research.activeId = "clay-pit";
  state.research.required = 12;
  assert.equal(rushResearch(state).ok, true);
  assert.equal(state.research.progress, 12);
  assert.equal(state.village.gems, 0);
  assert.equal(rushConstruction(state, "house-ii").ok, false);
});

test("villagers gain skill xp while working and get faster", () => {
  const state = createDefaultState();
  const villager = state.villagers.lena;
  villager.state = "WORKING";
  villager.assignedTaskId = "dig";
  state.village.soup = 10;

  assert.equal(villagerSpeed(state, "lena"), 1);
  villager.assignedTaskId = "bake"; // real taskId from workshops
  tickVillagerWork(state, "lena", 50); // 25 xp of crafting skill
  assert.equal(villager.skills.building, 25);
  assert.equal(villagerSkillLevel(state, "lena"), 2);
  assert.ok(villagerSpeed(state, "lena") > 1);

  // Skill ticks for food jobs use the skill-only path.
  villager.assignedTaskId = "cook-soup";
  assert.equal(villagerSkillLevel(state, "lena"), 1);
  tickVillagerSkill(state, "lena", 50);
  assert.equal(villagerSkillLevel(state, "lena"), 2);

  // Hit tasks gain xp per impact only — timed ticks must not double-dip.
  villager.assignedTaskId = "dig-clay";
  tickVillagerWork(state, "lena", 50);
  assert.equal(villager.skills.clayDigging ?? 0, 0);
  recordSkillHit(state, "lena", "woodcutting");
  assert.equal(villager.skills.woodcutting, 1.5);
  assert.equal(hitsForSkill(state, "lena", "woodcutting"), 5);
  villager.skills.woodcutting = 50; // level 3
  assert.equal(hitsForSkill(state, "lena", "woodcutting"), 4);
});

test("valley library boosts research and pays skill xp on ship return", () => {
  const state = createDefaultState();
  assert.equal(buildLibrary(state).ok, false); // valley locked

  state.valleyUnlocked = true;
  state.village.wood = 30;
  state.village.stone = 15;
  state.village.clay = 10;
  assert.equal(buildLibrary(state).ok, true);
  assert.equal(isLibraryBuilt(state), true);
  assert.equal(buildLibrary(state).ok, false); // already built

  state.research.activeId = "clay-pit";
  state.research.required = 100;
  tickResearch(state, 10);
  assert.equal(state.research.progress, 12.5); // +25%

  // Ship return pays 6 skill xp per villager on their active track.
  state.villagers.lena.assignedTaskId = "bake";
  state.valley.ship = { status: "sailing", remaining: 1, voyages: 0 };
  tickValley(state, 2);
  assert.equal(state.villagers.lena.skills.building, 6);
});

test("guildhall unlocks karl as a fourth villager", () => {
  const state = createDefaultState();
  assert.equal(state.villagers.karl.unlocked, false);
  assert.equal(buildGuildhall(state).ok, false); // valley locked

  state.valleyUnlocked = true;
  state.village.wood = 40;
  state.village.stone = 25;
  state.village.gems = 3;
  assert.equal(buildGuildhall(state).ok, true);
  assert.equal(isGuildhallBuilt(state), true);
  assert.equal(state.villagers.karl.unlocked, true);
  assert.equal(isVillagerUnlocked(state, "karl"), true);
  assert.equal(state.village.gems, 0);
});

test("everstone mine yields gems over time", () => {
  const state = createDefaultState();
  state.valleyUnlocked = true;
  state.village.wood = 20;
  state.village.stone = 40;
  state.village.clay = 10;

  assert.equal(isMineBuilt(state), false);
  assert.equal(buildMine(state).ok, true);

  tickValley(state, MINE_SECONDS * 0.5);
  assert.equal(state.village.gems, 0);
  tickValley(state, MINE_SECONDS * 0.6);
  assert.equal(state.village.gems, 1);
  assert.ok(getMineProgress(state) < 0.5);
});

test("valley monument builds in three escalating stages", () => {
  const state = createDefaultState();
  state.valleyUnlocked = true;
  state.village.wood = 60;
  state.village.stone = 120;
  state.village.clay = 50;
  state.village.gems = 10;

  assert.equal(getMonumentStage(state), 0);
  assert.equal(buildMonumentStage(state).ok, true);
  assert.equal(buildMonumentStage(state).ok, true);
  assert.equal(getMonumentStage(state), 2);
  assert.equal(buildMonumentStage(state).ok, true);
  assert.equal(getMonumentStage(state), 3);
  assert.equal(buildMonumentStage(state).ok, false); // done
  assert.equal(state.village.gems, 5);

  // Completed monument pays +5 extra gems per ship return.
  state.valley.crates.forEach((crate) => {
    crate.filledBy = "lena";
  });
  state.village.gems = 0;
  tickValley(state, 0.1); // depart
  tickValley(state, 90.1); // return
  assert.equal(state.village.gems, 7);
});

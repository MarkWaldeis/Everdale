import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultState } from "../src/world/simulation.js";

function mockStorage(state) {
  const store = new Map(state ? [["everdale-game-v2", JSON.stringify(state)]] : []);
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
    removeItem: (key) => void store.delete(key),
  };
  return store;
}

test("game state loads from an existing save and persists offline progress", async () => {
  const saved = createDefaultState();
  saved.village.wood = 7;
  saved.lastTick = Date.now() - 5000;
  const store = mockStorage(saved);
  const { createGameState } = await import("../src/world/game-state.js");
  const game = createGameState();
  assert.equal(game.getWood(), 7);

  const persisted = JSON.parse(store.get("everdale-game-v2"));
  assert.ok(persisted.lastTick > saved.lastTick);
  delete globalThis.localStorage;
});

test("offline constructions complete once and stay cleared on reload", async () => {
  const saved = createDefaultState();
  saved.unlocked["house-ii"] = true;
  saved.village.wood = 20;
  saved.village.stone = 10;
  saved.placed["house-ii"] = true;
  saved.buildings["house-ii"] = {
    id: "house-ii",
    status: "CONSTRUCTION",
    level: 1,
    assignedVillagerIds: [],
    productionQueue: [],
    productionProgress: 0,
  };
  saved.constructions = { "house-ii": { remaining: 24, total: 24 } };
  saved.lastTick = Date.now() - 120000;
  const store = mockStorage(saved);
  const { createGameState } = await import("../src/world/game-state.js");
  const game = createGameState();

  const summary = game.getOfflineSummary?.();
  assert.ok(summary?.constructions.includes("house-ii"));
  assert.equal(game.getSnapshot().villagers.sophie.unlocked, true);

  const persisted = JSON.parse(store.get("everdale-game-v2"));
  assert.equal(persisted.constructions["house-ii"], undefined);
  delete globalThis.localStorage;
});

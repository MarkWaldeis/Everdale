import { createFieldLoop } from "./field-loop.js";

export function createEggLoop({ game, chickenCoop, storages = [] }) {
  return createFieldLoop({
    game,
    module: chickenCoop,
    buildingId: "chicken-coop",
    taskId: "collect-eggs",
    resourceId: "egg",
    storages,
    addResource: (amount) => game.addEgg(amount),
    getResource: () => game.getEgg(),
    getCap: () => game.getEggCap(),
    yieldAmount: 2,
    durationScale: 0.9,
  });
}

import { createFieldLoop } from "./field-loop.js";

export function createFishLoop({ game, fishingDock, storages = [] }) {
  return createFieldLoop({
    game,
    module: fishingDock,
    buildingId: "fishing-dock",
    taskId: "catch-fish",
    resourceId: "fish",
    storages,
    addResource: (amount) => game.addFish(amount),
    getResource: () => game.getFish(),
    getCap: () => game.getFishCap(),
    yieldAmount: 2,
    durationScale: 1.2,
  });
}

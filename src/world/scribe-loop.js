import { createFieldLoop } from "./field-loop.js";

export function createScribeLoop({ game, townHall, storages = [] }) {
  return createFieldLoop({
    game,
    module: townHall,
    buildingId: "town-hall",
    taskId: "write-scrolls",
    resourceId: "scrolls",
    storages,
    addResource: (amount) => game.addScrolls(amount),
    getResource: () => game.getScrolls(),
    getCap: () => Number.POSITIVE_INFINITY,
    yieldAmount: 1,
    durationScale: 2.2,
  });
}

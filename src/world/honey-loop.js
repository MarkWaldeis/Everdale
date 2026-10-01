import { createFieldLoop } from "./field-loop.js";

export function createHoneyLoop({ game, apiary, storages = [] }) {
  return createFieldLoop({
    game,
    module: apiary,
    buildingId: "apiary",
    taskId: "collect-honey",
    resourceId: "honey",
    storages,
    addResource: (amount) => game.addHoney(amount),
    getResource: () => game.getHoney(),
    getCap: () => game.getHoneyCap(),
    yieldAmount: 2,
    durationScale: 1.1,
  });
}

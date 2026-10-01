import { createFieldLoop } from "./field-loop.js";

export function createAppleLoop({ game, appleTree, storages = [] }) {
  return createFieldLoop({
    game,
    module: appleTree,
    buildingId: "apple-tree",
    taskId: "pick-apples",
    resourceId: "apple",
    storages,
    addResource: (amount) => game.addApple(amount),
    getResource: () => game.getApple(),
    getCap: () => game.getAppleCap(),
    yieldAmount: 2,
    durationScale: 0.8,
  });
}

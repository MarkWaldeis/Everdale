import { createFieldLoop } from "./field-loop.js";

export function createStoneLoop({ game, quarry, storages = [] }) {
  return createFieldLoop({
    game,
    module: quarry,
    buildingId: "quarry",
    taskId: "dig-stone",
    resourceId: "stone",
    storages,
    addResource: (amount) => game.addStone(amount),
    getResource: () => game.getStone(),
    getCap: () => game.getStoneCap(),
    yieldAmount: 1,
    durationScale: 1.4,
  });
}

import { createFieldLoop } from "./field-loop.js";

export function createBerryLoop({ game, berryBush, storages = [] }) {
  return createFieldLoop({
    game,
    module: berryBush,
    buildingId: "berry-bush",
    taskId: "pick-berries",
    resourceId: "berry",
    storages,
    addResource: (amount) => game.addBerry(amount),
    getResource: () => game.getBerry(),
    getCap: () => game.getBerryCap(),
    yieldAmount: 3,
    durationScale: 0.7,
  });
}

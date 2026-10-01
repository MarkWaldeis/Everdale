import { createFieldLoop } from "./field-loop.js";

export function createSheepLoop({ game, sheepPen, storages = [] }) {
  return createFieldLoop({
    game,
    module: sheepPen,
    buildingId: "sheep-pen",
    taskId: "shear-wool",
    resourceId: "wool",
    storages,
    addResource: (amount) => game.addWool(amount),
    getResource: () => game.getWool(),
    getCap: () => game.getWoolCap(),
    yieldAmount: 1,
    durationScale: 1.4,
  });
}

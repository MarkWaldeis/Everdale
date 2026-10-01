import { createFieldLoop } from "./field-loop.js";

export function createWheatLoop({ game, wheatField, storages = [], onYield = null }) {
  return createFieldLoop({
    game,
    module: wheatField,
    buildingId: "wheat-field",
    taskId: "harvest-wheat",
    resourceId: "wheat",
    storages,
    addResource: (amount) => game.addWheat(amount),
    getResource: () => game.getWheat(),
    getCap: () => game.getWheatCap(),
    onYield,
    yieldAmount: 2,
  });
}

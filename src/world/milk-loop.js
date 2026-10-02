import { createFieldLoop } from "./field-loop.js";

export function createMilkLoop({ game, cowPasture, storages = [] }) {
  return createFieldLoop({
    game,
    module: cowPasture,
    buildingId: "cow-pasture",
    taskId: "milk-cows",
    resourceId: "milk",
    storages,
    addResource: (amount) => game.addMilk(amount),
    getResource: () => game.getMilk(),
    getCap: () => game.getMilkCap(),
    yieldAmount: 2,
    durationScale: 1.05,
  });
}

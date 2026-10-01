import { createFieldLoop } from "./field-loop.js";

// The stall never fills a resource — the vendor cycles, sells surplus,
// and onYield converts two units of the fattest stockpile into gold.
export function createMarketLoop({ game, market, storages = [] }) {
  return createFieldLoop({
    game,
    module: market,
    buildingId: "market",
    taskId: "sell-goods",
    resourceId: "gold",
    storages,
    addResource: () => 0,
    getResource: () => 0,
    getCap: () => Number.POSITIVE_INFINITY,
    yieldAmount: 0,
    durationScale: 1.6,
    onYield: () => game.sellSurplus(),
  });
}

import {
  STORAGE_VERSION,
  createDefaultState,
  harvestResource as simHarvest,
  placeBuilding as simPlace,
  canPlaceBuilding as simCanPlace,
  canCollectResource as simCanCollect,
  startResearch as simStart,
  completeResearch as simComplete,
  tickResearch as simTickResearch,
  tickVillagerWork as simTickWork,
  setVillagerState as simSetVillager,
  cookFromPumpkin as simCook,
  consumeSoup as simConsumeSoup,
  setResource,
  getPlayerLevel,
  getNodeStatus,
  getActiveQuest,
  isPlaced,
  isBuildingUnlocked,
  isValleyUnlocked,
  isVillagerUnlocked,
  fillValleyCrate,
  simulateValleyMembers,
  getCatalogItem,
  getResearchNode,
  canAfford,
  researchCostShortfall,
  formatCost,
  BUILDING_CATALOG,
  RESEARCH_NODES,
} from "./simulation.js";

const STORAGE_KEY = "everdale-game-v2";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== STORAGE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createGameState() {
  const base = createDefaultState();
  const saved = readSave();
  const data = saved
    ? {
        ...base,
        ...saved,
        player: { ...base.player, ...saved.player },
        settings: { ...base.settings, ...saved.settings },
        village: { ...base.village, ...saved.village },
        placed: { ...base.placed, ...saved.placed },
        unlocked: { ...base.unlocked, ...saved.unlocked },
        nodes: { ...base.nodes, ...saved.nodes },
        research: { ...base.research, ...saved.research },
        valley: {
          ...base.valley,
          ...saved.valley,
          crates: saved.valley?.crates ?? base.valley.crates,
        },
        timings: { ...base.timings, ...saved.timings },
        buildings: { ...base.buildings, ...saved.buildings },
        villagers: {
          lena: { ...base.villagers.lena, ...saved.villagers?.lena },
          john: { ...base.villagers.john, ...saved.villagers?.john },
          sophie: { ...base.villagers.sophie, ...saved.villagers?.sophie },
        },
      }
    : base;
  data.placed.study = true;
  data.player.level = getPlayerLevel(data);
  const listeners = new Set();

  function persist() {
    data.lastTick = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Private mode should not break play.
    }
    listeners.forEach((listener) => listener(getSnapshot()));
  }

  function getSnapshot() {
    return clone(data);
  }

  function wrap(mutator) {
    const result = mutator();
    persist();
    return result;
  }

  return {
    getSnapshot,
    getRaw: () => data,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    persist,
    catalog: BUILDING_CATALOG,
    nodes: RESEARCH_NODES,
    formatCost,
    canAffordResearch: (nodeId) => {
      const node = getResearchNode(nodeId);
      return Boolean(node && canAfford(data, node.cost));
    },
    researchShortfall: (nodeId) => {
      const node = getResearchNode(nodeId);
      return node ? researchCostShortfall(data, node.cost) : [];
    },
    getPlayerLevel: () => getPlayerLevel(data),
    getXp: () => data.player.xp,
    getQuest: () => getActiveQuest(data),
    getNodeStatus: (id) => getNodeStatus(data, id),
    isPlaced: (id) => isPlaced(data, id),
    isUnlocked: (id) => isBuildingUnlocked(data, id),
    isValleyUnlocked: () => isValleyUnlocked(data),
    isVillagerUnlocked: (id) => isVillagerUnlocked(data, id),
    canPlaceBuilding: (id) => simCanPlace(data, id),
    canCollectResource: (resourceId) => simCanCollect(data, resourceId),
    placeBuilding: (id) => wrap(() => simPlace(data, id)),
    startResearch: (id) => wrap(() => simStart(data, id)),
    completeResearch: (id) => wrap(() => simComplete(data, id)),
    tickResearch: (delta) =>
      wrap(() => {
        const result = simTickResearch(data, delta);
        return result;
      }),
    recordHarvest: (resourceId, amount) => wrap(() => simHarvest(data, resourceId, amount)),
    fillValleyCrate: (crateId) => wrap(() => fillValleyCrate(data, crateId, "player")),
    simulateValleyMembers: (fills) => wrap(() => simulateValleyMembers(data, fills)),
    getCatalogItem: (id) => getCatalogItem(id),
    getSoup: () => data.village.soup,
    getSoupCap: () => data.village.soupCap,
    getPumpkins: () => data.village.pumpkins,
    setSoup: (amount) => wrap(() => setResource(data, "soup", amount)),
    addSoup: (amount) => wrap(() => setResource(data, "soup", data.village.soup + amount)),
    consumeSoup: (amount = 1) => wrap(() => simConsumeSoup(data, amount)),
    setPumpkins: (amount) => wrap(() => setResource(data, "pumpkin", amount)),
    addPumpkins: (amount) => wrap(() => setResource(data, "pumpkin", data.village.pumpkins + amount)),
    spendPumpkins: (amount = 1) =>
      wrap(() => {
        if (data.village.pumpkins < amount) return false;
        setResource(data, "pumpkin", data.village.pumpkins - amount);
        return true;
      }),
    getWood: () => data.village.wood,
    getWoodCap: () => data.village.woodCap,
    setWood: (amount) => wrap(() => setResource(data, "wood", amount)),
    addWood: (amount) => wrap(() => simHarvest(data, "wood", amount).total),
    getStone: () => data.village.stone,
    getStoneCap: () => data.village.stoneCap,
    setStone: (amount) => wrap(() => setResource(data, "stone", amount)),
    addStone: (amount) => wrap(() => simHarvest(data, "stone", amount).total),
    getClay: () => data.village.clay,
    getClayCap: () => data.village.clayCap,
    setClay: (amount) => wrap(() => setResource(data, "clay", amount)),
    addClay: (amount) => wrap(() => simHarvest(data, "clay", amount).total),
    getGold: () => data.village.gold,
    getGems: () => data.village.gems,
    getReputation: () => data.village.reputation,
    getScrolls: () => data.village.scrolls,
    cookFromPumpkin: () => wrap(() => simCook(data)),
    getCookSeconds: () => data.timings.cookSeconds,
    getHarvestSeconds: () => data.timings.harvestSeconds,
    getEatSeconds: () => data.timings.eatSeconds,
    getHungerInterval: () => data.timings.hungerInterval,
    setCookSeconds: (value) => {
      data.timings.cookSeconds = Math.max(0.4, value);
      persist();
    },
    setHarvestSeconds: (value) => {
      data.timings.harvestSeconds = Math.max(0.4, value);
      persist();
    },
    setEatSeconds: (value) => {
      data.timings.eatSeconds = Math.max(0.4, value);
      persist();
    },
    setHungerInterval: (value) => {
      data.timings.hungerInterval = Math.max(0.4, value);
      persist();
    },
    tickVillagerWork: (id, delta) => wrap(() => simTickWork(data, id, delta)),
    resetVillagerWork: (id) =>
      wrap(() => {
        const villager = data.villagers[id];
        if (!villager) return;
        villager.workSeconds = 0;
        villager.hungry = false;
      }),
    setVillagerState: (id, state, extra = {}) => {
      const villager = data.villagers[id];
      if (!villager) return null;
      const unchanged =
        villager.state === state &&
        (extra.hungry === undefined || villager.hungry === extra.hungry) &&
        (extra.assignedBuildingId === undefined ||
          villager.assignedBuildingId === extra.assignedBuildingId) &&
        (extra.assignedTaskId === undefined || villager.assignedTaskId === extra.assignedTaskId);
      if (unchanged) return villager;
      return wrap(() => simSetVillager(data, id, state, extra));
    },
    assignBuildingWorker: (buildingId, villagerId) =>
      wrap(() => {
        const building = data.buildings[buildingId];
        if (!building) return;
        if (!building.assignedVillagerIds.includes(villagerId)) {
          building.assignedVillagerIds.push(villagerId);
        }
      }),
    clearBuildingWorker: (buildingId, villagerId) =>
      wrap(() => {
        const building = data.buildings[buildingId];
        if (!building) return;
        building.assignedVillagerIds = building.assignedVillagerIds.filter((id) => id !== villagerId);
      }),
    ensureVillager: (id, name) => {
      if (!data.villagers[id]) {
        data.villagers[id] = {
          id,
          name: name ?? id,
          unlocked: true,
          state: "IDLE",
          hungry: false,
          workSeconds: 0,
          assignedBuildingId: null,
          assignedTaskId: null,
        };
      }
      return data.villagers[id];
    },
    getMuted: () => Boolean(data.settings.muted),
    setMuted: (value) => {
      data.settings.muted = Boolean(value);
      persist();
    },
    getWind: () => data.settings.wind !== false,
    setWind: (value) => {
      data.settings.wind = Boolean(value);
      persist();
    },
    resetSave: () => {
      const fresh = createDefaultState();
      Object.keys(data).forEach((key) => {
        delete data[key];
      });
      Object.assign(data, fresh);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      persist();
    },
  };
}

export { STORAGE_KEY };

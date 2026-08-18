const STORAGE_KEY = "everdale-game-v1";

const DEFAULT_SKILLS = Object.freeze({
  farming: 0,
  woodcutting: 0,
  clayDigging: 0,
  stoneMining: 0,
  building: 0,
  research: 0,
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultVillager(id, name) {
  return {
    id,
    name,
    gender: id === "john" ? "male" : "female",
    houseId: "cottage",
    state: "IDLE",
    assignedBuildingId: null,
    assignedTaskId: null,
    skills: { ...DEFAULT_SKILLS },
    activeBuff: null,
    workSeconds: 0,
    hungry: false,
  };
}

function defaultState() {
  return {
    version: 1,
    lastTick: Date.now(),
    village: {
      gold: 0,
      gems: 0,
      reputation: 0,
      scrolls: 0,
      soup: 2,
      soupCap: 10,
      pumpkins: 3,
    },
    recipes: [
      {
        id: "pumpkin-soup",
        buildingTypeId: "kitchen",
        name: "Kürbissuppe",
        craftingTimeSeconds: 45,
        inputs: [{ resourceId: "pumpkin", amount: 1 }],
        outputs: [{ resourceId: "soup", amount: 2 }],
        requiredStudyLevel: 0,
      },
    ],
    buildings: {
      kitchen: {
        id: "kitchen",
        typeId: "kitchen",
        level: 1,
        status: "ACTIVE",
        workerCapacity: 1,
        assignedVillagerIds: [],
        productionQueue: [],
        storedResources: { soup: 2 },
        maxCapacity: 10,
      },
      pumpkinPatch: {
        id: "pumpkin-patch",
        typeId: "pumpkin-patch",
        level: 1,
        status: "ACTIVE",
        workerCapacity: 1,
        assignedVillagerIds: [],
        storedResources: { pumpkin: 3 },
      },
      well: {
        id: "well",
        typeId: "well",
        level: 1,
        status: "IDLE",
        workerCapacity: 0,
        assignedVillagerIds: [],
      },
    },
    villagers: {
      lena: defaultVillager("lena", "Lena"),
      john: defaultVillager("john", "John"),
      sophie: defaultVillager("sophie", "Sophie"),
    },
    timings: {
      cookSeconds: 45,
      harvestSeconds: 8,
      eatSeconds: 2.6,
      hungerInterval: 90,
    },
  };
}

function readSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function createGameState() {
  const base = defaultState();
  const saved = readSave();
  const data = saved?.version === 1 ? { ...base, ...saved, village: { ...base.village, ...saved.village }, timings: { ...base.timings, ...saved.timings }, buildings: { ...base.buildings, ...saved.buildings }, villagers: { ...base.villagers, ...saved.villagers } } : base;
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

  function getSoup() {
    return data.village.soup;
  }

  function getSoupCap() {
    return data.village.soupCap;
  }

  function getPumpkins() {
    return data.village.pumpkins;
  }

  function setSoup(amount) {
    data.village.soup = Math.max(0, Math.min(data.village.soupCap, Math.round(amount)));
    data.buildings.kitchen.storedResources.soup = data.village.soup;
    persist();
    return data.village.soup;
  }

  function addSoup(amount) {
    return setSoup(data.village.soup + amount);
  }

  function consumeSoup(amount = 1) {
    if (data.village.soup < amount) return false;
    setSoup(data.village.soup - amount);
    return true;
  }

  function setPumpkins(amount) {
    data.village.pumpkins = Math.max(0, Math.round(amount));
    data.buildings.pumpkinPatch.storedResources.pumpkin = data.village.pumpkins;
    persist();
    return data.village.pumpkins;
  }

  function addPumpkins(amount) {
    return setPumpkins(data.village.pumpkins + amount);
  }

  function spendPumpkins(amount = 1) {
    if (data.village.pumpkins < amount) return false;
    setPumpkins(data.village.pumpkins - amount);
    return true;
  }

  function cookFromPumpkin() {
    if (data.village.soup >= data.village.soupCap) return data.village.soup;
    if (!spendPumpkins(1)) return data.village.soup;
    const room = data.village.soupCap - data.village.soup;
    return addSoup(Math.min(2, room));
  }

  function ensureVillager(id, name) {
    if (!data.villagers[id]) data.villagers[id] = defaultVillager(id, name ?? id);
    return data.villagers[id];
  }

  function setVillagerState(id, state, extra = {}) {
    const villager = ensureVillager(id);
    const nextHungry = extra.hungry === undefined ? villager.hungry : extra.hungry;
    const nextBuilding = extra.assignedBuildingId === undefined ? villager.assignedBuildingId : extra.assignedBuildingId;
    const nextTask = extra.assignedTaskId === undefined ? villager.assignedTaskId : extra.assignedTaskId;
    const changed =
      villager.state !== state ||
      villager.hungry !== nextHungry ||
      villager.assignedBuildingId !== nextBuilding ||
      villager.assignedTaskId !== nextTask;
    villager.state = state;
    villager.assignedBuildingId = nextBuilding;
    villager.assignedTaskId = nextTask;
    villager.hungry = nextHungry;
    if (changed) persist();
    return villager;
  }

  function tickVillagerWork(id, delta) {
    const villager = ensureVillager(id);
    if (data.village.soup <= 0) {
      if (!villager.hungry) {
        villager.hungry = true;
        persist();
      }
      return true;
    }
    villager.workSeconds += delta;
    if (villager.workSeconds >= data.timings.hungerInterval) {
      if (!consumeSoup(1)) {
        villager.hungry = true;
        persist();
        return true;
      }
      villager.workSeconds = 0;
      villager.hungry = false;
      persist();
    }
    return false;
  }

  function resetVillagerWork(id) {
    const villager = ensureVillager(id);
    villager.workSeconds = 0;
    villager.hungry = false;
    persist();
  }

  function assignBuildingWorker(buildingId, villagerId) {
    const building = data.buildings[buildingId];
    if (!building) return;
    if (!building.assignedVillagerIds.includes(villagerId)) {
      building.assignedVillagerIds.push(villagerId);
    }
    persist();
  }

  function clearBuildingWorker(buildingId, villagerId) {
    const building = data.buildings[buildingId];
    if (!building) return;
    building.assignedVillagerIds = building.assignedVillagerIds.filter((id) => id !== villagerId);
    persist();
  }

  return {
    getSnapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    persist,
    getSoup,
    getSoupCap,
    getPumpkins,
    setSoup,
    addSoup,
    consumeSoup,
    setPumpkins,
    addPumpkins,
    spendPumpkins,
    cookFromPumpkin,
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
    tickVillagerWork,
    resetVillagerWork,
    setVillagerState,
    assignBuildingWorker,
    clearBuildingWorker,
    ensureVillager,
  };
}

const XP_PER_HARVEST = 15;
const XP_PER_RESEARCH = 30;
const XP_PER_LEVEL = 15;

export const STORAGE_VERSION = 2;

export const RESOURCES = Object.freeze({
  wood: { capKey: "woodCap", requiresPlaced: "wood-storage" },
  stone: { capKey: "stoneCap", requiresPlaced: "stone-storage" },
  clay: { capKey: "clayCap", requiresPlaced: "clay-storage" },
  soup: { capKey: "soupCap" },
  pumpkin: { field: "pumpkins" },
  gold: {},
  gems: {},
  reputation: {},
  scrolls: {},
  flour: {},
});

export const BUILDING_CATALOG = Object.freeze([
  {
    id: "study",
    label: "Studierstube",
    starterBuild: true,
    placeable: true,
    cost: { wood: 10 },
    description: "Hier forschen Bewohner neue Gebäude frei.",
  },
  {
    id: "clay-pit",
    label: "Lehmgrube",
    placeable: true,
    cost: { wood: 8 },
    description: "Rohlehm für Lager und spätere Werkstätten.",
  },
  {
    id: "clay-storage",
    label: "Lehmlager",
    placeable: true,
    cost: { wood: 6 },
    description: "Lagert Lehm. Sammler stoppen, wenn es voll ist.",
  },
  {
    id: "stone-storage",
    label: "Steinlager",
    placeable: true,
    cost: { wood: 8 },
    description: "Schaltet Steinabbau frei und lagert Stein.",
  },
  {
    id: "bakery",
    label: "Bäckerei",
    placeable: false,
    later: true,
    cost: { wood: 16, clay: 8 },
    description: "Später: Brot und Kuchen für den Handel.",
  },
  {
    id: "tailor",
    label: "Schneiderei",
    placeable: false,
    later: true,
    cost: { wood: 14, clay: 6 },
    description: "Später: Kleidung für Schiffe und Quests.",
  },
  {
    id: "wood-workshop",
    label: "Holzwerkstatt",
    placeable: false,
    later: true,
    cost: { wood: 12 },
    description: "Später: Bretter, Fässer und Spielzeug.",
  },
]);

export const RESEARCH_NODES = Object.freeze([
  {
    id: "clay-pit",
    name: "Lehmgrube",
    detail: "Hebt eine Lehmgrube am Dorfrand aus.",
    requires: [],
    cost: { scrolls: 1 },
    unlocksBuilding: "clay-pit",
    completable: true,
  },
  {
    id: "clay-storage",
    name: "Lehmlager",
    detail: "Trockenschuppen für gegrabenen Lehm.",
    requires: ["clay-pit"],
    cost: { scrolls: 1 },
    unlocksBuilding: "clay-storage",
    completable: true,
  },
  {
    id: "stone-storage",
    name: "Steinlager",
    detail: "Steinstapel und Abbau im Wald.",
    requires: ["clay-pit"],
    cost: { scrolls: 1 },
    unlocksBuilding: "stone-storage",
    completable: true,
  },
  {
    id: "house-ii",
    name: "Neues Wohnhaus",
    detail: "Sophie zieht ins Dorf und hilft mit.",
    requires: ["clay-storage"],
    cost: { scrolls: 2 },
    unlocksVillager: "sophie",
    completable: true,
  },
  {
    id: "valley-access",
    name: "Tal-Zugang",
    detail: "Öffnet das gemeinsame Tal und den Hafen.",
    requires: ["clay-storage", "stone-storage"],
    cost: { scrolls: 2 },
    unlocksValley: true,
    completable: true,
  },
  {
    id: "bakery",
    name: "Bäckerei",
    detail: "Kommt später: Mehl zu Brot und Kuchen.",
    requires: ["valley-access"],
    cost: { scrolls: 3 },
    later: true,
    completable: false,
  },
  {
    id: "tailor",
    name: "Schneiderei",
    detail: "Kommt später: Hemden, Socken, Hosen.",
    requires: ["bakery"],
    cost: { scrolls: 3 },
    later: true,
    completable: false,
  },
  {
    id: "wood-workshop",
    name: "Holzwerkstatt",
    detail: "Kommt später: Bretter und Fässer.",
    requires: ["bakery"],
    cost: { scrolls: 3 },
    later: true,
    completable: false,
  },
]);

export const STARTER_PLACED = Object.freeze([
  "cottage",
  "wood-storage",
  "kitchen",
  "pumpkin-patch",
  "well",
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultVillager(id, name, unlocked = true) {
  return {
    id,
    name,
    gender: id === "john" ? "male" : "female",
    houseId: "cottage",
    state: "IDLE",
    assignedBuildingId: null,
    assignedTaskId: null,
    skills: {
      farming: 0,
      woodcutting: 0,
      clayDigging: 0,
      stoneMining: 0,
      building: 0,
      research: 0,
    },
    activeBuff: null,
    workSeconds: 0,
    hungry: false,
    unlocked,
  };
}

export function createDefaultState() {
  const placed = {
    cottage: true,
    "wood-storage": true,
    kitchen: true,
    "pumpkin-patch": true,
    well: true,
    study: false,
    "clay-pit": false,
    "clay-storage": false,
    "stone-storage": false,
    bakery: false,
    tailor: false,
    "wood-workshop": false,
  };
  const nodes = {};
  RESEARCH_NODES.forEach((node) => {
    nodes[node.id] = "locked";
  });
  return {
    version: STORAGE_VERSION,
    lastTick: 0,
    player: { xp: 0, level: 1 },
    settings: { muted: false, wind: true },
    village: {
      gold: 0,
      gems: 0,
      reputation: 0,
      scrolls: 0,
      soup: 2,
      soupCap: 10,
      pumpkins: 3,
      wood: 0,
      woodCap: 20,
      stone: 0,
      stoneCap: 20,
      clay: 0,
      clayCap: 20,
      flour: 0,
      harvestCount: 0,
    },
    placed,
    unlocked: { study: true },
    valleyUnlocked: false,
    nodes,
    research: {
      activeId: null,
      progress: 0,
      required: 12,
    },
    valley: {
      crates: [
        { id: 0, item: "wood", amount: 5, rewardGold: 12, rewardRep: 4, filledBy: null },
        { id: 1, item: "clay", amount: 5, rewardGold: 14, rewardRep: 5, filledBy: null },
        { id: 2, item: "stone", amount: 5, rewardGold: 13, rewardRep: 4, filledBy: null },
        { id: 3, item: "wood", amount: 10, rewardGold: 20, rewardRep: 8, filledBy: null },
      ],
      memberFills: 0,
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
    },
    villagers: {
      lena: defaultVillager("lena", "Lena", true),
      john: defaultVillager("john", "John", true),
      sophie: defaultVillager("sophie", "Sophie", false),
    },
    timings: {
      cookSeconds: 45,
      harvestSeconds: 8,
      eatSeconds: 2.6,
      hungerInterval: 90,
    },
  };
}

export function getCatalogItem(id) {
  return BUILDING_CATALOG.find((item) => item.id === id) ?? null;
}

export function getResearchNode(id) {
  return RESEARCH_NODES.find((node) => node.id === id) ?? null;
}

export function getPlayerLevel(state) {
  return 1 + Math.floor(Math.max(0, state.player.xp) / XP_PER_LEVEL);
}

export function addPlayerXp(state, amount) {
  state.player.xp = Math.max(0, state.player.xp + Math.round(amount));
  state.player.level = getPlayerLevel(state);
  return state.player.level;
}

export function isPlaced(state, id) {
  return Boolean(state.placed[id]);
}

export function isBuildingUnlocked(state, id) {
  if (id === "study") return true;
  return Boolean(state.unlocked[id]);
}

export function isValleyUnlocked(state) {
  return Boolean(state.valleyUnlocked);
}

export function isVillagerUnlocked(state, id) {
  return Boolean(state.villagers[id]?.unlocked);
}

function canAfford(state, cost = {}) {
  return Object.entries(cost).every(([key, value]) => (state.village[key] ?? 0) >= value);
}

function spendCost(state, cost = {}) {
  Object.entries(cost).forEach(([key, value]) => {
    state.village[key] = Math.max(0, (state.village[key] ?? 0) - value);
  });
}

export function canPlaceBuilding(state, id) {
  const item = getCatalogItem(id);
  if (!item || !item.placeable) return false;
  if (state.placed[id]) return false;
  if (!isBuildingUnlocked(state, id)) return false;
  return canAfford(state, item.cost);
}

export function placeBuilding(state, id) {
  if (!canPlaceBuilding(state, id)) {
    return { ok: false, reason: "locked" };
  }
  const item = getCatalogItem(id);
  spendCost(state, item.cost);
  state.placed[id] = true;
  return { ok: true, id, village: { ...state.village } };
}

export function getNodeStatus(state, nodeId) {
  const node = getResearchNode(nodeId);
  if (!node) return "locked";
  if (state.nodes[nodeId] === "done") return "done";
  if (state.research.activeId === nodeId) return "researching";
  if (node.later || node.completable === false) return "locked";
  if (!state.placed.study) return "locked";
  const ready = node.requires.every((id) => state.nodes[id] === "done");
  return ready ? "ready" : "locked";
}

export function startResearch(state, nodeId) {
  const node = getResearchNode(nodeId);
  if (!node) return { ok: false, reason: "missing" };
  if (!state.placed.study) return { ok: false, reason: "no-study" };
  const status = getNodeStatus(state, nodeId);
  if (status !== "ready") return { ok: false, reason: status };
  if ((state.village.scrolls ?? 0) < (node.cost.scrolls ?? 0)) {
    return { ok: false, reason: "scrolls" };
  }
  state.research.activeId = nodeId;
  state.research.progress = 0;
  state.nodes[nodeId] = "researching";
  return { ok: true, nodeId };
}

export function completeResearch(state, nodeId) {
  const node = getResearchNode(nodeId);
  if (!node) return { ok: false, reason: "missing" };
  if (node.completable === false || node.later) return { ok: false, reason: "later" };
  if (!state.placed.study) return { ok: false, reason: "no-study" };
  const status = getNodeStatus(state, nodeId);
  if (status !== "ready" && status !== "researching") {
    return { ok: false, reason: status };
  }
  if ((state.village.scrolls ?? 0) < (node.cost.scrolls ?? 0)) {
    return { ok: false, reason: "scrolls" };
  }
  state.village.scrolls -= node.cost.scrolls ?? 0;
  state.nodes[nodeId] = "done";
  state.research.activeId = null;
  state.research.progress = 0;
  if (node.unlocksBuilding) state.unlocked[node.unlocksBuilding] = true;
  if (node.unlocksValley) state.valleyUnlocked = true;
  if (node.unlocksVillager && state.villagers[node.unlocksVillager]) {
    state.villagers[node.unlocksVillager].unlocked = true;
  }
  addPlayerXp(state, XP_PER_RESEARCH);
  return {
    ok: true,
    nodeId,
    unlockedBuilding: node.unlocksBuilding ?? null,
    valleyUnlocked: Boolean(node.unlocksValley),
    level: getPlayerLevel(state),
  };
}

export function tickResearch(state, delta) {
  const id = state.research.activeId;
  if (!id) return { done: false };
  state.research.progress += delta;
  if (state.research.progress >= state.research.required) {
    return { done: true, result: completeResearch(state, id) };
  }
  return { done: false, progress: state.research.progress };
}

function villageField(resourceId) {
  return resourceId === "pumpkin" ? "pumpkins" : resourceId;
}

export function canCollectResource(state, resourceId) {
  const spec = RESOURCES[resourceId];
  if (!spec) return false;
  if (spec.requiresPlaced && !state.placed[spec.requiresPlaced]) return false;
  return true;
}

export function harvestResource(state, resourceId, amount) {
  const spec = RESOURCES[resourceId];
  if (!spec) return { ok: false, reason: "unknown", added: 0, total: 0 };
  if (!canCollectResource(state, resourceId)) {
    const current = state.village[villageField(resourceId)] ?? 0;
    return { ok: false, reason: "locked", added: 0, total: current, capped: true };
  }
  const field = villageField(resourceId);
  const before = state.village[field] ?? 0;
  const capKey = spec.capKey;
  const cap = capKey ? state.village[capKey] : Infinity;
  const room = Math.max(0, cap - before);
  const added = Math.max(0, Math.min(Math.round(amount), room));
  state.village[field] = before + added;
  if (resourceId === "soup" && state.buildings.kitchen?.storedResources) {
    state.buildings.kitchen.storedResources.soup = state.village.soup;
  }
  if (added > 0 && (resourceId === "wood" || resourceId === "stone" || resourceId === "clay")) {
    addPlayerXp(state, XP_PER_HARVEST);
    state.village.harvestCount = (state.village.harvestCount ?? 0) + 1;
    state.village.scrolls = (state.village.scrolls ?? 0) + 1;
  }
  return {
    ok: added > 0,
    added,
    total: state.village[field],
    capped: added < Math.round(amount),
    level: getPlayerLevel(state),
  };
}

export function setResource(state, resourceId, amount) {
  const spec = RESOURCES[resourceId];
  const field = villageField(resourceId);
  const capKey = spec?.capKey;
  const cap = capKey ? state.village[capKey] : Infinity;
  state.village[field] = Math.max(0, Math.min(cap, Math.round(amount)));
  return state.village[field];
}

export function consumeSoup(state, amount = 1) {
  if ((state.village.soup ?? 0) < amount) return false;
  state.village.soup -= amount;
  if (state.buildings.kitchen?.storedResources) {
    state.buildings.kitchen.storedResources.soup = state.village.soup;
  }
  return true;
}

export function cookFromPumpkin(state) {
  if (state.village.soup >= state.village.soupCap) return state.village.soup;
  if ((state.village.pumpkins ?? 0) < 1) return state.village.soup;
  state.village.pumpkins -= 1;
  const room = state.village.soupCap - state.village.soup;
  state.village.soup += Math.min(2, room);
  if (state.buildings.kitchen?.storedResources) {
    state.buildings.kitchen.storedResources.soup = state.village.soup;
  }
  if (state.buildings.pumpkinPatch?.storedResources) {
    state.buildings.pumpkinPatch.storedResources.pumpkin = state.village.pumpkins;
  }
  return state.village.soup;
}

export function tickVillagerWork(state, villagerId, delta) {
  const villager = state.villagers[villagerId];
  if (!villager) return false;
  if ((state.village.soup ?? 0) <= 0) {
    villager.hungry = true;
    villager.state = "HUNGRY";
    return true;
  }
  villager.workSeconds += delta;
  if (villager.workSeconds >= state.timings.hungerInterval) {
    if (!consumeSoup(state, 1)) {
      villager.hungry = true;
      villager.state = "HUNGRY";
      return true;
    }
    villager.workSeconds = 0;
    villager.hungry = false;
    if (villager.state === "HUNGRY") villager.state = "WORKING";
  }
  return false;
}

export function setVillagerState(state, id, nextState, extra = {}) {
  const villager = state.villagers[id];
  if (!villager) return null;
  villager.state = nextState;
  if (extra.hungry !== undefined) villager.hungry = extra.hungry;
  if (extra.assignedBuildingId !== undefined) villager.assignedBuildingId = extra.assignedBuildingId;
  if (extra.assignedTaskId !== undefined) villager.assignedTaskId = extra.assignedTaskId;
  return villager;
}

export function fillValleyCrate(state, crateId, playerId = "player") {
  if (!state.valleyUnlocked) return { ok: false, reason: "locked" };
  const crate = state.valley.crates.find((entry) => entry.id === crateId);
  if (!crate || crate.filledBy) return { ok: false, reason: "taken" };
  const have = state.village[crate.item] ?? 0;
  if (have < crate.amount) return { ok: false, reason: "items" };
  state.village[crate.item] -= crate.amount;
  crate.filledBy = playerId;
  state.village.gold += crate.rewardGold;
  state.village.reputation += crate.rewardRep;
  addPlayerXp(state, 10);
  return { ok: true, gold: state.village.gold, reputation: state.village.reputation };
}

export function simulateValleyMembers(state, fills = 1) {
  if (!state.valleyUnlocked) return 0;
  let count = 0;
  state.valley.crates.forEach((crate) => {
    if (crate.filledBy || count >= fills) return;
    crate.filledBy = `member-${state.valley.memberFills + 1}`;
    state.valley.memberFills += 1;
    count += 1;
  });
  return count;
}

export function getActiveQuest(state) {
  if (!state.placed.study) {
    return { id: "build-study", text: "Sammle 10 Holz und baue die Studierstube." };
  }
  if (state.nodes["clay-pit"] !== "done") {
    return { id: "research-clay", text: "Erforsche die Lehmgrube in der Studierstube." };
  }
  if (!state.placed["clay-pit"]) {
    return { id: "place-clay", text: "Platziere die Lehmgrube über das Bau-Menü." };
  }
  if (state.nodes["clay-storage"] !== "done") {
    return { id: "research-store", text: "Erforsche das Lehmlager." };
  }
  if (!state.placed["clay-storage"]) {
    return { id: "place-store", text: "Baue das Lehmlager und grabe Lehm." };
  }
  if (state.nodes["stone-storage"] !== "done") {
    return { id: "research-stone", text: "Erforsche das Steinlager." };
  }
  if (!state.placed["stone-storage"]) {
    return { id: "place-stone", text: "Baue das Steinlager und baue Stein ab." };
  }
  if (state.nodes["valley-access"] !== "done") {
    return { id: "research-valley", text: "Erforsche den Zugang zum Tal." };
  }
  return { id: "visit-valley", text: "Besuche das Tal und belade ein Handelsschiff." };
}

export function listHudControls() {
  return [
    "hud-level",
    "hud-gold",
    "hud-gems",
    "hud-rep",
    "btn-settings",
    "btn-build",
    "btn-inventory",
    "btn-research",
    "btn-valley",
    "btn-arrange",
    "btn-mute",
    "btn-wind",
    "btn-reset-save",
    "sheet-close",
  ];
}

export { XP_PER_HARVEST, XP_PER_RESEARCH, XP_PER_LEVEL, clone };

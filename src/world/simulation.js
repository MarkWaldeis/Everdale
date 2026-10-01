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
  bread: { capKey: "breadCap", requiresPlaced: "bakery" },
  planks: { requiresPlaced: "wood-workshop" },
  bucket: { requiresPlaced: "wood-workshop" },
  rope: { requiresPlaced: "tailor" },
  blanket: { requiresPlaced: "tailor" },
  gold: {},
  gems: {},
  reputation: {},
  scrolls: {},
  flour: {},
});

export const COST_LABELS = Object.freeze({
  wood: "Holz",
  stone: "Stein",
  clay: "Lehm",
  scrolls: "Schriftrollen",
  pumpkin: "Kürbisse",
  soup: "Suppe",
  bread: "Brot",
  planks: "Bretter",
  bucket: "Eimer",
  rope: "Seile",
  blanket: "Decken",
});

export const RECIPES = Object.freeze([
  {
    id: "bread",
    label: "Brot",
    building: "bakery",
    inputs: { pumpkin: 2, wood: 1 },
    output: "bread",
    amount: 1,
    seconds: 30,
  },
  {
    id: "planks",
    label: "Bretter",
    building: "wood-workshop",
    inputs: { wood: 3 },
    output: "planks",
    amount: 2,
    seconds: 35,
  },
  {
    id: "bucket",
    label: "Eimer",
    building: "wood-workshop",
    inputs: { wood: 2, stone: 1 },
    output: "bucket",
    amount: 1,
    seconds: 45,
  },
  {
    id: "rope",
    label: "Seil",
    building: "tailor",
    inputs: { wood: 1, clay: 2 },
    output: "rope",
    amount: 1,
    seconds: 40,
  },
  {
    id: "blanket",
    label: "Decke",
    building: "tailor",
    inputs: { wood: 2, clay: 3 },
    output: "blanket",
    amount: 1,
    seconds: 50,
  },
]);

export function formatCost(cost = {}) {
  const parts = Object.entries(cost)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => `${value} ${COST_LABELS[key] ?? key}`);
  return parts.join(" · ") || "Frei";
}

export const BUILDING_CATALOG = Object.freeze([
  {
    id: "study",
    label: "Alchemielabor",
    starterBuild: true,
    placeable: false,
    cost: {},
    description: "Steht bereits im Dorf. Hier forschst du neue Gebäude frei.",
  },
  {
    id: "order-board",
    label: "Auftragsbrett",
    starterBuild: true,
    placeable: false,
    cost: {},
    description: "Steht bereits im Dorf. Ottos Aufträge zahlen mit Gold und Schriftrollen.",
  },
  {
    id: "house-ii",
    label: "Wohnhaus II",
    placeable: true,
    cost: { wood: 12, stone: 6 },
    constructionSeconds: 24,
    description: "Neues Zuhause für Sophie — braucht kurze Bauzeit.",
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
    placeable: true,
    cost: { wood: 16, clay: 8 },
    description: "Ein Bäcker backt Brot aus Kürbissen — für Aufträge und Schiffe.",
  },
  {
    id: "tailor",
    label: "Schneiderei",
    placeable: true,
    cost: { wood: 14, clay: 6 },
    description: "Näht Seile und Decken — Auftragsware mit gutem Gold.",
  },
  {
    id: "wood-workshop",
    label: "Holzwerkstatt",
    placeable: true,
    cost: { wood: 12 },
    description: "Hobelt Bretter und zimmert Eimer für Schiffe und Aufträge.",
  },
]);

export const RESEARCH_NODES = Object.freeze([
  {
    id: "clay-pit",
    name: "Lehmgrube",
    detail: "Sammle 10 Holz, dann erforsche die Grube und baue sie.",
    icon: "🧱",
    requires: [],
    cost: { wood: 10 },
    unlocksBuilding: "clay-pit",
    completable: true,
  },
  {
    id: "clay-storage",
    name: "Lehmlager",
    detail: "Trockenschuppen für gegrabenen Lehm.",
    icon: "📦",
    requires: ["clay-pit"],
    cost: { wood: 6 },
    unlocksBuilding: "clay-storage",
    completable: true,
  },
  {
    id: "stone-storage",
    name: "Steinlager",
    detail: "Steinstapel und Abbau im Wald.",
    icon: "🪨",
    requires: ["clay-storage"],
    cost: { wood: 8 },
    unlocksBuilding: "stone-storage",
    completable: true,
  },
  {
    id: "house-ii",
    name: "Neues Wohnhaus",
    detail: "Schaltet den Bauplatz frei — Sophie zieht ein, wenn das Haus steht.",
    icon: "🏠",
    requires: ["stone-storage"],
    cost: { wood: 12 },
    unlocksBuilding: "house-ii",
    completable: true,
  },
  {
    id: "valley-access",
    name: "Tal-Zugang",
    detail: "Öffnet das gemeinsame Tal und den Hafen.",
    icon: "⛵",
    requires: ["house-ii"],
    cost: { wood: 10, stone: 4 },
    unlocksValley: true,
    completable: true,
  },
  {
    id: "bakery",
    name: "Bäckerei",
    detail: "Brot aus Kürbissen backen — Auftragsware mit gutem Gold.",
    icon: "🍞",
    requires: ["valley-access"],
    cost: { wood: 16 },
    unlocksBuilding: "bakery",
    completable: true,
  },
  {
    id: "tailor",
    name: "Schneiderei",
    detail: "Näht Seile und Decken aus Lehm und Holz.",
    icon: "🧵",
    requires: ["bakery"],
    cost: { wood: 14 },
    unlocksBuilding: "tailor",
    completable: true,
  },
  {
    id: "wood-workshop",
    name: "Holzwerkstatt",
    detail: "Hobelt Bretter und zimmert Eimer.",
    icon: "🪚",
    requires: ["bakery"],
    cost: { wood: 12 },
    unlocksBuilding: "wood-workshop",
    completable: true,
  },
  {
    id: "potions",
    name: "Tränke",
    detail: "Brau Buffs für deine Bewohner am Alchemielabor.",
    icon: "🧪",
    requires: ["wood-workshop"],
    cost: { wood: 10, scrolls: 2 },
    unlocksPotions: true,
    completable: true,
  },
]);

export const STARTER_PLACED = Object.freeze([
  "cottage",
  "wood-storage",
  "kitchen",
  "pumpkin-patch",
  "well",
  "study",
  "order-board",
]);

export const ORDER_SLOTS = 3;

export const ORDER_DECK = Object.freeze([
  { requests: { wood: 5 }, rewardGold: 6 },
  { requests: { pumpkin: 2 }, rewardGold: 5 },
  { requests: { wood: 8 }, rewardGold: 10, rewardScrolls: 1 },
  { requests: { soup: 1 }, rewardGold: 7, rewardRep: 1 },
  { requests: { wood: 6, pumpkin: 3 }, rewardGold: 12 },
  { requests: { clay: 4 }, rewardGold: 12, rewardScrolls: 1, requiresPlaced: "clay-pit" },
  { requests: { soup: 2 }, rewardGold: 11, rewardScrolls: 1 },
  { requests: { stone: 4 }, rewardGold: 14, requiresPlaced: "stone-storage" },
  { requests: { wood: 10, clay: 4 }, rewardGold: 18, rewardScrolls: 1, requiresPlaced: "clay-storage" },
  { requests: { soup: 3, pumpkin: 4 }, rewardGold: 16, rewardRep: 2 },
  { requests: { stone: 5, wood: 10 }, rewardGold: 21, rewardScrolls: 2, requiresPlaced: "stone-storage" },
  { requests: { clay: 8, stone: 6 }, rewardGold: 26, rewardScrolls: 2, requiresPlaced: "stone-storage" },
  { requests: { bread: 2 }, rewardGold: 24, rewardScrolls: 2, requiresPlaced: "bakery" },
  { requests: { bread: 3, soup: 2 }, rewardGold: 34, rewardRep: 3, requiresPlaced: "bakery" },
  { requests: { planks: 4 }, rewardGold: 22, rewardScrolls: 1, requiresPlaced: "wood-workshop" },
  { requests: { bucket: 2, planks: 2 }, rewardGold: 30, rewardScrolls: 2, requiresPlaced: "wood-workshop" },
  { requests: { rope: 3 }, rewardGold: 26, rewardScrolls: 1, requiresPlaced: "tailor" },
  { requests: { blanket: 2, rope: 1 }, rewardGold: 36, rewardRep: 3, requiresPlaced: "tailor" },
]);

export const DECORATIONS = Object.freeze([
  {
    id: "deko-daisy",
    label: "Gänseblümchen",
    icon: "🌼",
    cost: { wood: 1 },
    rep: 1,
    effect: "Bringt Farbe ins Dorf.",
  },
  {
    id: "deko-fountain",
    label: "Wasserspiel",
    icon: "⛲",
    cost: { stone: 4, clay: 2 },
    rep: 3,
    effect: "Plätschert vor sich hin.",
  },
]);

export const POTIONS = Object.freeze([
  {
    id: "energie",
    label: "Energietrank",
    inputs: { pumpkin: 1, soup: 1 },
    seconds: 40,
    effect: "speed",
    effectSeconds: 120,
    description: "Der Bewohner arbeitet 60 % schneller für 2 Minuten.",
  },
  {
    id: "sattmacher",
    label: "Stärkungstrank",
    inputs: { pumpkin: 2, clay: 1 },
    seconds: 35,
    effect: "meal",
    effectSeconds: 60,
    description: "Stillt sofort und hält 60 Sekunden satt.",
  },
]);

export const BUILDING_UPGRADES = Object.freeze({
  "wood-storage": {
    label: "Holzlager",
    capKey: "woodCap",
    caps: [20, 45, 80],
    costs: [null, { wood: 10, stone: 4 }, { wood: 18, stone: 10, clay: 6 }],
    effect: "Lagert gefälltes Holz.",
  },
  "stone-storage": {
    label: "Steinlager",
    capKey: "stoneCap",
    caps: [20, 45, 80],
    costs: [null, { wood: 14, clay: 6 }, { wood: 22, stone: 12, clay: 12 }],
    effect: "Lagert abgebauten Stein.",
  },
  "clay-storage": {
    label: "Lehmlager",
    capKey: "clayCap",
    caps: [20, 45, 80],
    costs: [null, { wood: 12, stone: 8 }, { wood: 20, stone: 14 }],
    effect: "Lagert gegrabenen Lehm.",
  },
  kitchen: {
    label: "Küche",
    capKey: "soupCap",
    caps: [10, 16, 24],
    costs: [null, { wood: 8, clay: 5 }, { wood: 14, clay: 12 }],
    effect: "Kocht Suppe für hungrige Bewohner.",
  },
});

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
    study: true,
    "clay-pit": false,
    "clay-storage": false,
    "stone-storage": false,
    bakery: false,
    tailor: false,
    "wood-workshop": false,
    "order-board": true,
    "house-ii": false,
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
      bread: 0,
      breadCap: 15,
      planks: 0,
      bucket: 0,
      rope: 0,
      blanket: 0,
      harvestCount: 0,
    },
    placed,
    unlocked: { study: true },
    valleyUnlocked: false,
    potions: {},
    potionsUnlocked: false,
    brewing: { queue: [], progress: 0 },
    decorations: [],
    decoSeq: 0,
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
    orders: {
      next: 0,
      slots: [],
    },
    constructions: {},
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

export function canAfford(state, cost = {}) {
  return Object.entries(cost).every(([key, value]) => (state.village[key] ?? 0) >= value);
}

export function researchCostShortfall(state, cost = {}) {
  return Object.entries(cost)
    .filter(([key, value]) => (state.village[key] ?? 0) < value)
    .map(([key, value]) => `${value - (state.village[key] ?? 0)} ${COST_LABELS[key] ?? key}`);
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
  if (!state.buildings[id]) {
    state.buildings[id] = {
      id,
      typeId: id,
      level: 1,
      status: "ACTIVE",
      workerCapacity: 1,
      assignedVillagerIds: [],
      productionQueue: [],
    };
  }
  if (item.constructionSeconds) {
    state.buildings[id].status = "CONSTRUCTION";
    state.constructions ??= {};
    state.constructions[id] = {
      remaining: item.constructionSeconds,
      total: item.constructionSeconds,
    };
  }
  return { ok: true, id, village: { ...state.village } };
}

export function queueRecipe(state, buildingId, recipeId) {
  const recipe = RECIPES.find((entry) => entry.id === recipeId && entry.building === buildingId);
  if (!recipe) return { ok: false, reason: "missing" };
  if (!state.placed[buildingId]) return { ok: false, reason: "locked" };
  if (state.constructions?.[buildingId]) return { ok: false, reason: "constructing" };
  const building = state.buildings[buildingId];
  if (!building) return { ok: false, reason: "missing" };
  building.productionQueue ??= [];
  if (building.productionQueue.length >= 4) return { ok: false, reason: "queue-full" };
  if (!orderCanAfford(state, recipe.inputs)) return { ok: false, reason: "cost" };
  orderSpend(state, recipe.inputs);
  building.productionQueue.push(recipeId);
  return { ok: true, queue: building.productionQueue.length };
}

export function tickProduction(state, buildingId, deltaSeconds) {
  const building = state.buildings[buildingId];
  const queue = building?.productionQueue ?? [];
  if (!queue.length) {
    if (building) building.productionProgress = 0;
    return { produced: null };
  }
  const recipe = RECIPES.find((entry) => entry.id === queue[0]);
  if (!recipe) {
    queue.shift();
    return { produced: null };
  }
  const field = villageField(recipe.output);
  const capKey = RESOURCES[recipe.output]?.capKey;
  const cap = capKey ? state.village[capKey] : Infinity;
  if ((state.village[field] ?? 0) + recipe.amount > cap) {
    building.productionProgress = recipe.seconds;
    return { produced: null, blocked: "cap" };
  }
  building.productionProgress = (building.productionProgress ?? 0) + deltaSeconds;
  if (building.productionProgress < recipe.seconds) return { produced: null };
  building.productionProgress = 0;
  queue.shift();
  state.village[field] = Math.min(cap, (state.village[field] ?? 0) + recipe.amount);
  addPlayerXp(state, 6);
  return { produced: recipe.id, output: recipe.output, amount: recipe.amount };
}

export function canPlaceDecoration(state, typeId) {
  const item = DECORATIONS.find((entry) => entry.id === typeId);
  return Boolean(item && canAfford(state, item.cost));
}

export function placeDecoration(state, typeId) {
  const item = DECORATIONS.find((entry) => entry.id === typeId);
  if (!item) return { ok: false, reason: "missing" };
  if (!canAfford(state, item.cost)) return { ok: false, reason: "cost" };
  spendCost(state, item.cost);
  state.decorations ??= [];
  state.decoSeq = (state.decoSeq ?? 0) + 1;
  const uid = `${typeId}-${state.decoSeq}`;
  state.decorations.push({ id: uid, type: typeId });
  state.village.reputation = (state.village.reputation ?? 0) + (item.rep ?? 0);
  return { ok: true, uid, village: { ...state.village } };
}

export function removeDecoration(state, uid) {
  const index = (state.decorations ?? []).findIndex((deco) => deco.id === uid);
  if (index < 0) return { ok: false, reason: "missing" };
  const [deco] = state.decorations.splice(index, 1);
  const item = DECORATIONS.find((entry) => entry.id === deco.type);
  if (item) {
    Object.entries(item.cost).forEach(([key, value]) => {
      const field = villageField(key);
      const cap = state.village[`${field}Cap`] ?? Infinity;
      state.village[field] = Math.min(cap, (state.village[field] ?? 0) + value);
    });
    state.village.reputation = Math.max(0, (state.village.reputation ?? 0) - (item.rep ?? 0));
  }
  return { ok: true, removed: deco };
}

export function brewPotion(state, potionId) {
  const potion = POTIONS.find((entry) => entry.id === potionId);
  if (!potion) return { ok: false, reason: "missing" };
  if (!state.potionsUnlocked) return { ok: false, reason: "locked" };
  state.brewing ??= { queue: [], progress: 0 };
  if (state.brewing.queue.length >= 3) return { ok: false, reason: "queue-full" };
  if (!orderCanAfford(state, potion.inputs)) return { ok: false, reason: "cost" };
  orderSpend(state, potion.inputs);
  state.brewing.queue.push(potionId);
  return { ok: true, queue: state.brewing.queue.length };
}

export function tickBrewing(state, deltaSeconds) {
  const brewing = state.brewing ?? { queue: [], progress: 0 };
  if (!brewing.queue.length) {
    brewing.progress = 0;
    return { produced: null };
  }
  const potion = POTIONS.find((entry) => entry.id === brewing.queue[0]);
  if (!potion) {
    brewing.queue.shift();
    return { produced: null };
  }
  brewing.progress = (brewing.progress ?? 0) + deltaSeconds;
  if (brewing.progress < potion.seconds) return { produced: null };
  brewing.progress = 0;
  brewing.queue.shift();
  state.potions ??= {};
  state.potions[potion.id] = (state.potions[potion.id] ?? 0) + 1;
  addPlayerXp(state, 4);
  return { produced: potion.id };
}

export function applyPotion(state, potionId, villagerId) {
  const potion = POTIONS.find((entry) => entry.id === potionId);
  const villager = state.villagers[villagerId];
  if (!potion || !villager?.unlocked) return { ok: false, reason: "missing" };
  if ((state.potions?.[potionId] ?? 0) <= 0) return { ok: false, reason: "empty" };
  if (villager.activeBuff) return { ok: false, reason: "buffed" };
  state.potions[potionId] -= 1;
  villager.activeBuff = {
    id: potion.id,
    effect: potion.effect,
    remaining: potion.effectSeconds,
    total: potion.effectSeconds,
  };
  if (potion.effect === "meal") {
    villager.hungry = false;
    villager.workSeconds = 0;
    if (villager.state === "HUNGRY") villager.state = "IDLE";
  }
  return { ok: true };
}

export function tickBuffs(state, deltaSeconds) {
  Object.values(state.villagers).forEach((villager) => {
    if (!villager.activeBuff) return;
    if (villager.state !== "WORKING") return;
    villager.activeBuff.remaining -= deltaSeconds;
    if (villager.activeBuff.remaining <= 0) villager.activeBuff = null;
  });
}

export function villagerSpeed(state, villagerId) {
  return state.villagers[villagerId]?.activeBuff?.effect === "speed" ? 1.6 : 1;
}

export function getProduction(state, buildingId) {
  const building = state.buildings[buildingId];
  const queue = building?.productionQueue ?? [];
  const recipe = queue.length ? RECIPES.find((entry) => entry.id === queue[0]) : null;
  return {
    queue: [...queue],
    progress: building?.productionProgress ?? 0,
    current: recipe,
    seconds: recipe?.seconds ?? 0,
  };
}

export function getConstruction(state, id) {
  return state.constructions?.[id] ?? null;
}

export function tickConstructions(state, deltaSeconds) {
  const constructions = state.constructions ?? {};
  const completed = [];
  Object.entries(constructions).forEach(([id, entry]) => {
    entry.remaining -= deltaSeconds;
    if (entry.remaining <= 0) {
      delete constructions[id];
      if (state.buildings[id]) state.buildings[id].status = "ACTIVE";
      if (id === "house-ii" && state.villagers.sophie) {
        state.villagers.sophie.unlocked = true;
      }
      addPlayerXp(state, 20);
      completed.push(id);
    }
  });
  return { completed };
}

export function getBuildingLevel(state, id) {
  return state.buildings[id]?.level ?? 1;
}

export function getUpgradeInfo(state, id) {
  const spec = BUILDING_UPGRADES[id];
  if (!spec || !state.placed[id]) return null;
  const level = getBuildingLevel(state, id);
  const cost = spec.costs[level] ?? null;
  return {
    id,
    label: spec.label,
    level,
    maxLevel: spec.costs.length,
    atMax: !cost,
    cost,
    cap: spec.caps?.[level - 1] ?? null,
    nextCap: spec.caps?.[level] ?? null,
    affordable: cost ? canAfford(state, cost) : false,
    effect: spec.effect,
  };
}

export function upgradeBuilding(state, id) {
  const info = getUpgradeInfo(state, id);
  if (!info) return { ok: false, reason: "missing" };
  if (info.atMax) return { ok: false, reason: "max" };
  if (!info.affordable) return { ok: false, reason: "cost" };
  const spec = BUILDING_UPGRADES[id];
  spendCost(state, info.cost);
  if (!state.buildings[id]) {
    state.buildings[id] = { id, typeId: id, level: 1, status: "ACTIVE", assignedVillagerIds: [], productionQueue: [] };
  }
  const nextLevel = info.level + 1;
  state.buildings[id].level = nextLevel;
  if (spec.capKey) {
    state.village[spec.capKey] = spec.caps[nextLevel - 1];
  }
  addPlayerXp(state, 20);
  return { ok: true, id, level: nextLevel, cap: spec.caps?.[nextLevel - 1] ?? null };
}

export function getNodeStatus(state, nodeId) {
  const node = getResearchNode(nodeId);
  if (!node) return "locked";
  if (state.nodes[nodeId] === "done") return "done";
  if (state.research.activeId === nodeId) return "researching";
  if (node.later || node.completable === false) return "locked";
  const ready = node.requires.every((id) => state.nodes[id] === "done");
  return ready ? "ready" : "locked";
}

export function startResearch(state, nodeId) {
  const node = getResearchNode(nodeId);
  if (!node) return { ok: false, reason: "missing" };
  const status = getNodeStatus(state, nodeId);
  if (status !== "ready") return { ok: false, reason: status };
  if (!canAfford(state, node.cost)) {
    return { ok: false, reason: "cost" };
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
  const status = getNodeStatus(state, nodeId);
  if (status !== "ready" && status !== "researching") {
    return { ok: false, reason: status };
  }
  if (!canAfford(state, node.cost)) {
    return { ok: false, reason: "cost" };
  }
  spendCost(state, node.cost);
  state.nodes[nodeId] = "done";
  state.research.activeId = null;
  state.research.progress = 0;
  if (node.unlocksBuilding) state.unlocked[node.unlocksBuilding] = true;
  if (node.unlocksValley) state.valleyUnlocked = true;
  if (node.unlocksPotions) state.potionsUnlocked = true;
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
  if (villager.activeBuff?.effect !== "meal") {
    villager.workSeconds += delta;
  }
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

function orderEligible(state, order) {
  return !order.requiresPlaced || Boolean(state.placed[order.requiresPlaced]);
}

function drawOrder(state) {
  const orders = state.orders;
  for (let step = 0; step < ORDER_DECK.length; step += 1) {
    const index = (orders.next + step) % ORDER_DECK.length;
    const template = ORDER_DECK[index];
    if (orderEligible(state, template)) {
      orders.next = index + 1;
      return { key: index, ...clone(template) };
    }
  }
  const index = orders.next % ORDER_DECK.length;
  orders.next += 1;
  return { key: index, ...clone(ORDER_DECK[index]) };
}

export function ensureOrders(state) {
  if (!state.orders || !Array.isArray(state.orders.slots)) {
    state.orders = { next: 0, slots: [] };
  }
  while (state.orders.slots.length < ORDER_SLOTS) {
    state.orders.slots.push(drawOrder(state));
  }
  return state.orders.slots;
}

export function listOrders(state) {
  return ensureOrders(state);
}

function orderCanAfford(state, requests = {}) {
  return Object.entries(requests).every(
    ([key, value]) => (state.village[villageField(key)] ?? 0) >= value,
  );
}

function orderSpend(state, requests = {}) {
  Object.entries(requests).forEach(([key, value]) => {
    const field = villageField(key);
    state.village[field] = Math.max(0, (state.village[field] ?? 0) - value);
  });
}

export function canFillOrder(state, slotIndex) {
  const order = ensureOrders(state)[slotIndex];
  return Boolean(order && orderCanAfford(state, order.requests));
}

export function fillOrder(state, slotIndex) {
  const order = ensureOrders(state)[slotIndex];
  if (!order) return { ok: false, reason: "missing" };
  if (!orderCanAfford(state, order.requests)) return { ok: false, reason: "items" };
  orderSpend(state, order.requests);
  state.village.gold += order.rewardGold ?? 0;
  state.village.scrolls += order.rewardScrolls ?? 0;
  state.village.reputation += order.rewardRep ?? 0;
  if (state.buildings.kitchen?.storedResources) {
    state.buildings.kitchen.storedResources.soup = state.village.soup;
  }
  if (state.buildings.pumpkinPatch?.storedResources) {
    state.buildings.pumpkinPatch.storedResources.pumpkin = state.village.pumpkins;
  }
  addPlayerXp(state, 8);
  state.orders.slots[slotIndex] = drawOrder(state);
  return {
    ok: true,
    gold: state.village.gold,
    scrolls: state.village.scrolls,
    reputation: state.village.reputation,
  };
}

export function applyOfflineProgress(state, elapsedSeconds) {
  const result = { seconds: 0, constructions: [], researchDone: null };
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return result;
  const elapsed = Math.min(elapsedSeconds, 4 * 3600);
  result.seconds = elapsed;
  Object.entries(state.constructions ?? {}).forEach(([id, entry]) => {
    entry.remaining -= elapsed;
    if (entry.remaining <= 0) {
      delete state.constructions[id];
      if (state.buildings[id]) state.buildings[id].status = "ACTIVE";
      if (id === "house-ii" && state.villagers.sophie) {
        state.villagers.sophie.unlocked = true;
      }
      addPlayerXp(state, 20);
      result.constructions.push(id);
    }
  });
  if (state.research.activeId) {
    const nodeId = state.research.activeId;
    state.research.progress += elapsed;
    if (state.research.progress >= state.research.required) {
      const done = completeResearch(state, nodeId);
      if (done.ok) {
        result.researchDone = nodeId;
      } else {
        state.research.progress = state.research.required;
      }
    }
  }
  return result;
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
  if (state.nodes["clay-pit"] !== "done") {
    return { id: "research-clay", text: "Sammle 10 Holz und erforsche die Lehmgrube im Labor." };
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
  if (state.nodes["house-ii"] !== "done") {
    return { id: "research-house", text: "Erforsche ein neues Wohnhaus — Sophie zieht ein." };
  }
  if (state.nodes["house-ii"] === "done" && !state.villagers.sophie?.unlocked) {
    return { id: "build-house", text: "Baue das neue Wohnhaus — Sophie zieht dann ein." };
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

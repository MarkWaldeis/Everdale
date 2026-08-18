import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BUILDING_CATALOG,
  RESEARCH_NODES,
  createDefaultState,
  canPlaceBuilding,
  listHudControls,
} from "../src/world/simulation.js";

const html = readFileSync(resolve("index.html"), "utf8");
const study = readFileSync(resolve("src/world/models/study-hall.js"), "utf8");
const assets = readFileSync(resolve("src/world/assets.js"), "utf8");

const requiredHud = [
  "hud-level",
  "hud-gold",
  "hud-soup",
  "btn-build",
  "btn-inventory",
  "btn-research",
  "btn-settings",
  "btn-valley",
];

const missing = requiredHud.filter((id) => !html.includes(`id="${id}"`));
const hasFileGuard = html.includes("is-file-mode") && html.includes("file-open-notice");
const hasWaldprototyp = /Waldprototyp/.test(html);
const studyIsBoxOnly = /^\s*box\(root/.test(study) && (study.match(/box\(/g) || []).length < 4;
const studyRegistered = assets.includes("study-hall.glb");
const valleyRegistered = assets.includes("valley-harbor.glb");

const state = createDefaultState();
const freshLocked = !canPlaceBuilding(state, "clay-pit") && !state.placed.study;

const report = {
  missingHudIds: missing,
  hasFileGuard,
  hasWaldprototyp,
  studyIsBoxOnly,
  studyRegistered,
  valleyRegistered,
  catalog: BUILDING_CATALOG.map((item) => item.id),
  laterNodes: RESEARCH_NODES.filter((node) => node.later).map((node) => node.id),
  freshLocked,
  controls: listHudControls(),
};

const ok =
  missing.length === 0 &&
  hasFileGuard &&
  !hasWaldprototyp &&
  !studyIsBoxOnly &&
  studyRegistered &&
  valleyRegistered &&
  freshLocked;

console.log(JSON.stringify(report, null, 2));
if (!ok) {
  console.error("static checks failed");
  process.exit(1);
}
console.log("static checks passed");
writeFileSync(resolve(process.argv[2] || "static-report.json"), JSON.stringify(report, null, 2));

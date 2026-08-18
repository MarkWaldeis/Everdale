import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportGroupToGlb } from "../src/world/models/glb-writer.js";
import { buildKitchenCauldron } from "../src/world/models/kitchen-cauldron.js";
import { buildPumpkinPatch } from "../src/world/models/pumpkin-patch.js";
import { buildVillageWell } from "../src/world/models/village-well.js";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../3d Assets");
mkdirSync(outDir, { recursive: true });

const jobs = [
  ["kitchen-cauldron.glb", buildKitchenCauldron],
  ["pumpkin-patch.glb", buildPumpkinPatch],
  ["village-well.glb", buildVillageWell],
];

for (const [fileName, build] of jobs) {
  const group = build();
  const bytes = exportGroupToGlb(group);
  const path = resolve(outDir, fileName);
  writeFileSync(path, bytes);
  console.log(`wrote ${fileName} (${bytes.byteLength} bytes)`);
}

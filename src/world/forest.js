import * as THREE from "three";
import { TREE_WEIGHTS } from "./assets.js";

const WORLD_SIZE = 60;
const TREE_COUNT = 720;
const CLEARING_SCALE_X = 0.34;
const CLEARING_SCALE_Z = 0.31;

function seededRandom(seed = 7419) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function chooseTree(randomValue) {
  return TREE_WEIGHTS.find((entry) => randomValue <= entry.until)?.id ?? "tree";
}

function createGround(groundAsset) {
  const group = new THREE.Group();
  group.name = "ground";

  const bounds = new THREE.Box3().setFromObject(groundAsset);
  const size = bounds.getSize(new THREE.Vector3());
  const tileStepX = Math.max(size.x, 0.01);
  const tileStepZ = Math.max(size.z, 0.01);
  const tileScaleX = 1.012;
  const tileScaleZ = 1.012;
  const half = (WORLD_SIZE - 1) / 2;

  // Keep the original 3D asset only around the perimeter. Its sculpted dirt
  // sides give the island a finished edge without drawing hundreds of hidden
  // tile tops below the continuous meadow.
  for (let z = 0; z < WORLD_SIZE; z += 1) {
    for (let x = 0; x < WORLD_SIZE; x += 1) {
      const isPerimeter = x === 0 || z === 0 || x === WORLD_SIZE - 1 || z === WORLD_SIZE - 1;
      if (!isPerimeter) continue;

      const tile = groundAsset.clone(true);
      tile.scale.x *= tileScaleX;
      tile.scale.z *= tileScaleZ;
      tile.position.set((x - half) * tileStepX, 0, (z - half) * tileStepZ);
      group.add(tile);
    }
  }

  const worldWidth = WORLD_SIZE * tileStepX;
  const worldDepth = WORLD_SIZE * tileStepZ;

  const substrate = new THREE.Mesh(
    new THREE.BoxGeometry(worldWidth, size.y, worldDepth),
    new THREE.MeshStandardMaterial({ color: 0x8a633f, roughness: 0.98 }),
  );
  substrate.name = "earth-substrate";
  substrate.position.y = size.y * 0.5 - 0.01;
  substrate.receiveShadow = true;
  group.add(substrate);

  // One uninterrupted surface removes every tile seam. Broad, interpolated
  // vertex colors add the quiet tonal variation seen in Everdale-style grass
  // without introducing a visible texture or build grid.
  const meadowGeometry = new THREE.PlaneGeometry(worldWidth, worldDepth, 72, 72);
  meadowGeometry.rotateX(-Math.PI / 2);

  const positions = meadowGeometry.attributes.position;
  const colors = [];
  // Slightly deeper than the final target color because the warm sun and
  // ACES tone mapping lift it into Everdale's soft meadow green.
  const baseColor = new THREE.Color(0x78ad42);

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const broadVariation =
      Math.sin(x * 0.34) * 0.012 +
      Math.cos(z * 0.29) * 0.01 +
      Math.sin((x + z) * 0.17) * 0.008;
    const color = baseColor.clone().offsetHSL(0, 0, broadVariation);
    colors.push(color.r, color.g, color.b);
  }

  meadowGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  const meadowSurface = new THREE.Mesh(
    meadowGeometry,
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.94,
      metalness: 0,
    }),
  );
  const surfaceY = size.y + 0.016;
  meadowSurface.name = "seamless-meadow-surface";
  meadowSurface.position.y = surfaceY;
  meadowSurface.receiveShadow = true;
  group.add(meadowSurface);

  return { group, worldWidth, worldDepth, surfaceY };
}

function generateTreePositions(worldWidth, worldDepth) {
  const random = seededRandom();
  const points = [];
  const maxX = worldWidth * 0.485;
  const maxZ = worldDepth * 0.485;
  const clearingX = worldWidth * CLEARING_SCALE_X;
  const clearingZ = worldDepth * CLEARING_SCALE_Z;
  const minimumDistance = Math.max(2.15, Math.min(worldWidth, worldDepth) * 0.036);
  let attempts = 0;

  const canPlace = (x, z) => {
    const insideClearing = (x / clearingX) ** 2 + (z / clearingZ) ** 2 < 1;
    if (insideClearing) return false;

    return !points.some(
      (point) => Math.hypot(point.x - x, point.z - z) < minimumDistance,
    );
  };

  const addTree = (x, z, flags = {}) => {
    if (!flags.force && !canPlace(x, z)) return;
    points.push({
      x,
      z,
      scale: flags.scale ?? 0.92 + random() * 0.22,
      rotation: flags.rotation ?? random() * Math.PI * 2,
      assetId: flags.assetId ?? chooseTree(random()),
      phase: random() * Math.PI * 2,
      enclosure: Boolean(flags.enclosure),
      showcase: Boolean(flags.showcase),
    });
  };

  // A guaranteed outer wall keeps every camera direction enclosed by trees.
  const edgeStep = minimumDistance * 1.08;
  for (let x = -maxX; x <= maxX; x += edgeStep) {
    addTree(x + (random() - 0.5) * 0.16, -maxZ + random() * 0.26, { enclosure: true });
    addTree(x + (random() - 0.5) * 0.16, maxZ - random() * 0.26, { enclosure: true });
  }

  for (let z = -maxZ + edgeStep; z <= maxZ - edgeStep; z += edgeStep) {
    addTree(-maxX + random() * 0.26, z + (random() - 0.5) * 0.16, { enclosure: true });
    addTree(maxX - random() * 0.26, z + (random() - 0.5) * 0.16, { enclosure: true });
  }

  while (points.length < TREE_COUNT && attempts < 24000) {
    attempts += 1;
    const x = (random() * 2 - 1) * maxX;
    const z = (random() * 2 - 1) * maxZ;
    addTree(x, z);
  }

  return points;
}

function createStoneNode(point, index, assets, surfaceY) {
  const useSplit = Boolean(assets.stoneSplit) && index % 2 === 0;
  const source = (useSplit ? assets.stoneSplit : assets.stone) ?? assets.stone ?? assets.stoneSplit;
  const stone = new THREE.Group();
  const model = source.clone(true);
  model.scale.multiplyScalar(0.88 + (index % 5) * 0.04);
  stone.add(model);
  stone.position.set(point.x, surfaceY - 0.06, point.z);
  stone.rotation.y = point.rotation;
  stone.userData.id = `stone-${index}`;
  stone.userData.assetId = useSplit ? "stoneSplit" : "stone";
  stone.userData.phase = point.phase;
  stone.userData.sway = 0;
  stone.userData.enclosure = false;
  stone.userData.harvestable = true;
  stone.userData.harvestState = "idle";
  stone.userData.isHarvestStone = true;
  stone.userData.harvestKind = "stone";
  stone.userData.baseYaw = point.rotation;
  return stone;
}

function createForest(assets, worldWidth, worldDepth, surfaceY) {
  const group = new THREE.Group();
  const animatedTrees = [];
  const animatedStones = [];
  group.name = "forest";
  const canPlaceStone = Boolean(assets.stone || assets.stoneSplit);

  generateTreePositions(worldWidth, worldDepth).forEach((point, index) => {
    if (canPlaceStone && !point.enclosure && index % 12 === 5) {
      const stone = createStoneNode(point, index, assets, surfaceY);
      animatedStones.push(stone);
      group.add(stone);
      return;
    }

    const tree = new THREE.Group();
    const model = assets[point.assetId].clone(true);
    model.scale.multiplyScalar(point.scale);
    tree.add(model);
    tree.position.set(point.x, surfaceY - 0.015, point.z);
    tree.rotation.y = point.rotation;
    tree.userData.id = index;
    tree.userData.assetId = point.assetId;
    tree.userData.phase = point.phase;
    tree.userData.sway = 0.006 + (index % 5) * 0.0009;
    tree.userData.enclosure = Boolean(point.enclosure);
    tree.userData.harvestable = true;
    tree.userData.harvestState = "idle";
    tree.userData.isHarvestTree = true;
    tree.userData.harvestKind = "wood";
    tree.userData.baseYaw = point.rotation;
    animatedTrees.push(tree);
    group.add(tree);
  });

  return { group, animatedTrees, animatedStones };
}

export function buildForestWorld(assets) {
  const root = new THREE.Group();
  root.name = "everdale-forest-world";

  const ground = createGround(assets.ground);
  const forest = createForest(assets, ground.worldWidth, ground.worldDepth, ground.surfaceY);

  root.add(ground.group, forest.group);

  return {
    root,
    animatedTrees: forest.animatedTrees,
    animatedStones: forest.animatedStones,
    size: Math.max(ground.worldWidth, ground.worldDepth),
    walkArea: {
      radiusX: ground.worldWidth * CLEARING_SCALE_X - 1.15,
      radiusZ: ground.worldDepth * CLEARING_SCALE_Z - 1.15,
      surfaceY: ground.surfaceY,
    },
  };
}

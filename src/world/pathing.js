import * as THREE from "three";

const CELL = 0.26;
const COTTAGE_MARGIN = 0.58;
const TREE_RADIUS = 0.62;
const SAMPLE = 0.1;

const scratchPoint = new THREE.Vector3();

function segmentHitsAabb(ax, az, bx, bz, left, right, back, front) {
  const minX = Math.min(ax, bx);
  const maxX = Math.max(ax, bx);
  const minZ = Math.min(az, bz);
  const maxZ = Math.max(az, bz);
  if (maxX < left || minX > right || maxZ < back || minZ > front) return false;

  const steps = Math.max(2, Math.ceil(Math.hypot(bx - ax, bz - az) / SAMPLE));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const z = az + (bz - az) * t;
    if (x >= left && x <= right && z >= back && z <= front) return true;
  }
  return false;
}

export function createWalkability(cottage, trees = [], options = {}) {
  const ignoreTree = options.ignoreTree ?? null;
  const cottageMargin = options.cottageMargin ?? COTTAGE_MARGIN;
  const treeRadius = options.treeRadius ?? TREE_RADIUS;

  function blocked(point) {
    if (cottage?.containsPoint(point, cottageMargin)) return true;
    for (const tree of trees) {
      if (tree === ignoreTree) continue;
      if (!tree.visible || tree.userData.harvestState === "gone") continue;
      const dx = tree.position.x - point.x;
      const dz = tree.position.z - point.z;
      const radius = treeRadius + (tree.userData.enclosure ? 0.12 : 0);
      if (dx * dx + dz * dz < radius * radius) return true;
    }
    return false;
  }

  function lineClear(a, b) {
    const distance = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(2, Math.ceil(distance / SAMPLE));
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      scratchPoint.set(a.x + (b.x - a.x) * t, a.y ?? b.y, a.z + (b.z - a.z) * t);
      if (blocked(scratchPoint)) return false;
    }
    return true;
  }

  return { blocked, lineClear };
}

export function cottageHullPath(from, to, cottage, surfaceY, walkability) {
  const path = [];
  if (!cottage) {
    path.push(to.clone());
    return path;
  }

  const halfX = cottage.size.x * 0.5 + 0.78;
  const halfZ = cottage.size.z * 0.5 + 0.78;
  const center = cottage.root.position;
  const left = center.x - halfX;
  const right = center.x + halfX;
  const front = center.z + halfZ;
  const back = center.z - halfZ;

  if (!segmentHitsAabb(from.x, from.z, to.x, to.z, left, right, back, front)) {
    path.push(to.clone());
    return path;
  }

  const preferRight = (from.x + to.x) * 0.5 >= center.x;
  const sides = preferRight ? [right, left] : [left, right];
  let sideX = sides[0];
  if (walkability?.lineClear) {
    const candidate = (x) => {
      const a = new THREE.Vector3(x, surfaceY, from.z >= center.z ? front : back);
      const b = new THREE.Vector3(x, surfaceY, to.z >= center.z ? front : back);
      return walkability.lineClear(from, a) && walkability.lineClear(a, b);
    };
    sideX = candidate(sides[0]) ? sides[0] : sides[1];
  }
  const fromFront = from.z >= center.z;
  const toFront = to.z >= center.z;

  if (fromFront !== toFront) {
    path.push(new THREE.Vector3(sideX, surfaceY, fromFront ? front : back));
    path.push(new THREE.Vector3(sideX, surfaceY, toFront ? front : back));
  } else {
    path.push(new THREE.Vector3(sideX, surfaceY, from.z));
  }
  if (!segmentHitsAabb(path[path.length - 1]?.x ?? from.x, path[path.length - 1]?.z ?? from.z, to.x, to.z, left, right, back, front)) {
    path.push(to.clone());
  } else {
    path.push(new THREE.Vector3(sideX, surfaceY, toFront ? front : back));
    path.push(to.clone());
  }
  return path;
}

function pullString(from, cells, to, walkability) {
  const pulled = [];
  let anchor = from;
  const points = [...cells, to];
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    if (next && walkability.lineClear(anchor, next)) continue;
    pulled.push(current.clone());
    anchor = current;
  }
  if (!pulled.length || pulled[pulled.length - 1].distanceToSquared(to) > 0.0004) {
    pulled.push(to.clone());
  }
  return pulled;
}

export function findWalkPath(from, to, walkability, cottage, surfaceY) {
  if (walkability.lineClear(from, to)) return [to.clone()];

  const center = cottage?.root.position;
  const pad = 2.4;
  const minX = Math.min(from.x, to.x, center ? center.x - 4 : from.x) - pad;
  const maxX = Math.max(from.x, to.x, center ? center.x + 4 : from.x) + pad;
  const minZ = Math.min(from.z, to.z, center ? center.z - 4 : from.z) - pad;
  const maxZ = Math.max(from.z, to.z, center ? center.z + 4 : from.z) + pad;

  const toCell = (x, z) => [
    Math.round((x - minX) / CELL),
    Math.round((z - minZ) / CELL),
  ];
  const toWorld = (cx, cz) =>
    new THREE.Vector3(minX + cx * CELL, surfaceY, minZ + cz * CELL);

  const width = Math.ceil((maxX - minX) / CELL) + 1;
  const depth = Math.ceil((maxZ - minZ) / CELL) + 1;
  const start = toCell(from.x, from.z);
  const goal = toCell(to.x, to.z);
  const keyOf = (x, z) => `${x},${z}`;

  const walkable = (cx, cz) => {
    if (cx < 0 || cz < 0 || cx >= width || cz >= depth) return false;
    if (cx === start[0] && cz === start[1]) return true;
    if (cx === goal[0] && cz === goal[1]) return true;
    return !walkability.blocked(toWorld(cx, cz));
  };

  const open = [[start[0], start[1], 0]];
  const came = new Map();
  const best = new Map([[keyOf(start[0], start[1]), 0]]);
  const heuristic = (x, z) => Math.hypot(x - goal[0], z - goal[1]);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  let found = null;
  for (let guard = 0; open.length && guard < 9000; guard += 1) {
    let bestIndex = 0;
    let bestScore = Infinity;
    for (let i = 0; i < open.length; i += 1) {
      const score = open[i][2] + heuristic(open[i][0], open[i][1]);
      if (score < bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    const current = open.splice(bestIndex, 1)[0];
    if (current[0] === goal[0] && current[1] === goal[1]) {
      found = current;
      break;
    }

    for (const [dx, dz] of dirs) {
      const nx = current[0] + dx;
      const nz = current[1] + dz;
      if (!walkable(nx, nz)) continue;
      if (dx !== 0 && dz !== 0 && (!walkable(current[0] + dx, current[1]) || !walkable(current[0], current[1] + dz))) {
        continue;
      }
      const step = dx !== 0 && dz !== 0 ? 1.414 : 1;
      const tentative = current[2] + step;
      const nextKey = keyOf(nx, nz);
      if (tentative >= (best.get(nextKey) ?? Infinity)) continue;
      came.set(nextKey, keyOf(current[0], current[1]));
      best.set(nextKey, tentative);
      open.push([nx, nz, tentative]);
    }
  }

  if (!found) return cottageHullPath(from, to, cottage, surfaceY, walkability);

  const cells = [];
  let cursor = keyOf(goal[0], goal[1]);
  const startKey = keyOf(start[0], start[1]);
  while (cursor && cursor !== startKey) {
    const [cx, cz] = cursor.split(",").map(Number);
    cells.push(toWorld(cx, cz));
    cursor = came.get(cursor);
  }
  cells.reverse();
  return pullString(from, cells, to, walkability);
}

export function resolveStandPoint(preferred, walkability, surfaceY) {
  if (!walkability.blocked(preferred)) return preferred.clone();

  const sample = preferred.clone();
  for (let ring = 1; ring <= 10; ring += 1) {
    const radius = ring * 0.18;
    for (let step = 0; step < 12; step += 1) {
      const angle = (step / 12) * Math.PI * 2;
      sample.set(
        preferred.x + Math.cos(angle) * radius,
        surfaceY,
        preferred.z + Math.sin(angle) * radius,
      );
      if (!walkability.blocked(sample)) return sample.clone();
    }
  }
  return preferred.clone();
}

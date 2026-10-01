import * as THREE from "three";

const EDGE_COLOR = 0x9d7c4e;
const FILL_COLOR = 0xcfa873;
const PEBBLE_COLOR = 0xa8895c;
const EDGE_WIDTH = 1.05;
const FILL_WIDTH = 0.72;

function mulberry(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildRibbon(points, width, y, material) {
  const count = points.length;
  const positions = new Float32Array(count * 6);
  const indices = [];
  for (let index = 0; index < count; index += 1) {
    const point = points[index];
    const next = points[Math.min(index + 1, count - 1)];
    const prev = points[Math.max(index - 1, 0)];
    const dirX = next.x - prev.x;
    const dirZ = next.z - prev.z;
    const len = Math.hypot(dirX, dirZ) || 1;
    const perpX = (-dirZ / len) * width * 0.5;
    const perpZ = (dirX / len) * width * 0.5;
    positions[index * 6 + 0] = point.x + perpX;
    positions[index * 6 + 1] = y;
    positions[index * 6 + 2] = point.z + perpZ;
    positions[index * 6 + 3] = point.x - perpX;
    positions[index * 6 + 4] = y;
    positions[index * 6 + 5] = point.z - perpZ;
    if (index < count - 1) {
      const a = index * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

function curveBetween(a, b, rand) {
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = Math.hypot(dir.x, dir.z);
  if (len < 0.6) return null;
  const bow = (rand() - 0.5) * Math.min(len * 0.45, 1.4);
  const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
  mid.addScaledVector(perp, bow);
  mid.y = a.y;
  return new THREE.CatmullRomCurve3([a.clone(), mid, b.clone()]);
}

export function createDirtPaths() {
  const group = new THREE.Group();
  group.name = "dirt-paths";
  const edgeMaterial = new THREE.MeshStandardMaterial({
    color: EDGE_COLOR,
    roughness: 0.96,
    metalness: 0,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const fillMaterial = new THREE.MeshStandardMaterial({
    color: FILL_COLOR,
    roughness: 0.94,
    metalness: 0,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const pebbleMaterial = new THREE.MeshStandardMaterial({
    color: PEBBLE_COLOR,
    roughness: 1,
    metalness: 0,
  });
  const pebbleGeometry = new THREE.CylinderGeometry(1, 1, 0.03, 7);

  function clear() {
    while (group.children.length) {
      const child = group.children.pop();
      child.geometry?.dispose?.();
      group.remove(child);
    }
  }

  function rebuild(anchors, surfaceY) {
    clear();
    const nodes = anchors
      .map((point) => new THREE.Vector3(point.x, surfaceY, point.z))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.z));
    if (nodes.length < 2) return;

    const connected = [0];
    const links = [];
    while (connected.length < nodes.length) {
      let bestFrom = -1;
      let bestTo = -1;
      let bestDist = Infinity;
      connected.forEach((fromIndex) => {
        nodes.forEach((node, toIndex) => {
          if (connected.includes(toIndex)) return;
          const dist = nodes[fromIndex].distanceTo(node);
          if (dist < bestDist) {
            bestDist = dist;
            bestFrom = fromIndex;
            bestTo = toIndex;
          }
        });
      });
      if (bestTo < 0) break;
      links.push([bestFrom, bestTo]);
      connected.push(bestTo);
    }

    const rand = mulberry(2026);
    links.forEach(([fromIndex, toIndex]) => {
      const curve = curveBetween(nodes[fromIndex], nodes[toIndex], rand);
      if (!curve) return;
      const samples = curve.getPoints(14);
      group.add(buildRibbon(samples, EDGE_WIDTH, surfaceY + 0.012, edgeMaterial));
      group.add(buildRibbon(samples, FILL_WIDTH, surfaceY + 0.018, fillMaterial));

      const count = Math.max(2, Math.floor(samples[0].distanceTo(samples[samples.length - 1]) * 1.4));
      for (let index = 0; index < count; index += 1) {
        const t = 0.12 + rand() * 0.76;
        const point = curve.getPoint(t);
        const pebble = new THREE.Mesh(pebbleGeometry, pebbleMaterial);
        const offset = (rand() - 0.5) * FILL_WIDTH * 0.55;
        const tangent = curve.getTangent(t);
        pebble.position.set(
          point.x + -tangent.z * offset,
          surfaceY + 0.03,
          point.z + tangent.x * offset,
        );
        const scale = 0.04 + rand() * 0.09;
        pebble.scale.set(scale, 1, scale * (0.7 + rand() * 0.5));
        pebble.rotation.y = rand() * Math.PI;
        pebble.receiveShadow = true;
        group.add(pebble);
      }
    });
  }

  return { group, rebuild };
}

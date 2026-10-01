import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const TUFT_COUNT = 420;
const FLOWER_COUNT = 90;
const CLOVER_COUNT = 26;
const FLOWER_PALETTE = [0xfffdf4, 0xffd166, 0xf7a7c3, 0xc8a4f7, 0xff9a62];

function scatterPositions(area, zones, count, edgeBias) {
  const positions = [];
  let guard = count * 40;
  while (positions.length < count && guard-- > 0) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random());
    const r = edgeBias ? 0.35 + radius * 0.62 : radius;
    const x = Math.cos(angle) * area.radiusX * r;
    const z = Math.sin(angle) * area.radiusZ * r;
    const blocked = zones.some((zone) => {
      const dx = x - zone.x;
      const dz = z - zone.z;
      return dx * dx + dz * dz < zone.r * zone.r;
    });
    if (!blocked) positions.push({ x, z });
  }
  return positions;
}

function tuftGeometry() {
  const blade = new THREE.ConeGeometry(0.035, 0.26, 5);
  blade.translate(0, 0.13, 0);
  const parts = [];
  for (let i = 0; i < 3; i += 1) {
    const tilt = (i - 1) * 0.38;
    const yaw = (i / 3) * Math.PI * 2;
    const rotated = blade.clone();
    rotated.rotateZ(tilt);
    rotated.rotateY(yaw);
    parts.push(rotated);
  }
  return mergeGeometries(parts);
}

function flowerGeometry() {
  const stem = new THREE.CylinderGeometry(0.008, 0.012, 0.14, 4).toNonIndexed();
  stem.translate(0, 0.07, 0);
  const head = new THREE.IcosahedronGeometry(0.045, 0);
  head.scale(1, 0.7, 1);
  head.translate(0, 0.16, 0);
  return mergeGeometries([stem, head]);
}

export function createFoliage({ area, zones = [] }) {
  const group = new THREE.Group();
  group.name = "village-foliage";
  const surfaceY = area.surfaceY;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  const tuftMaterial = new THREE.MeshStandardMaterial({
    color: 0x5d8c3a,
    roughness: 0.95,
    flatShading: true,
  });
  const tuftPositions = scatterPositions(area, zones, TUFT_COUNT, false);
  const tufts = new THREE.InstancedMesh(tuftGeometry(), tuftMaterial, tuftPositions.length);
  tuftPositions.forEach((pos, index) => {
    dummy.position.set(pos.x, surfaceY, pos.z);
    dummy.rotation.set((Math.random() - 0.5) * 0.12, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.12);
    const scale = 0.6 + Math.random() * 0.9;
    dummy.scale.set(scale, scale * (0.8 + Math.random() * 0.5), scale);
    dummy.updateMatrix();
    tufts.setMatrixAt(index, dummy.matrix);
    color.setHSL(0.26 + Math.random() * 0.06, 0.42 + Math.random() * 0.15, 0.3 + Math.random() * 0.12);
    tufts.setColorAt(index, color);
  });
  tufts.castShadow = false;
  tufts.receiveShadow = false;
  group.add(tufts);

  const flowerZones = [...zones, ...tuftPositions.map((pos) => ({ x: pos.x, z: pos.z, r: 0.28 }))];
  const flowerPositions = scatterPositions(area, flowerZones, FLOWER_COUNT, true);
  const flowerMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.85,
    flatShading: true,
  });
  const flowers = new THREE.InstancedMesh(flowerGeometry(), flowerMaterial, flowerPositions.length);
  flowerPositions.forEach((pos, index) => {
    dummy.position.set(pos.x, surfaceY, pos.z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    const scale = 0.75 + Math.random() * 0.6;
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    flowers.setMatrixAt(index, dummy.matrix);
    color.set(FLOWER_PALETTE[Math.floor(Math.random() * FLOWER_PALETTE.length)]);
    flowers.setColorAt(index, color);
  });
  flowers.castShadow = false;
  group.add(flowers);

  const cloverMaterial = new THREE.MeshStandardMaterial({
    color: 0x3f6b2a,
    roughness: 1,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const cloverPositions = scatterPositions(area, zones, CLOVER_COUNT, true);
  const clover = new THREE.InstancedMesh(
    new THREE.CircleGeometry(1, 18),
    cloverMaterial,
    cloverPositions.length,
  );
  cloverPositions.forEach((pos, index) => {
    dummy.position.set(pos.x, surfaceY + 0.012, pos.z);
    dummy.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
    dummy.scale.set(0.5 + Math.random() * 0.7, 0.5 + Math.random() * 0.7, 1);
    dummy.updateMatrix();
    clover.setMatrixAt(index, dummy.matrix);
  });
  clover.renderOrder = 1;
  group.add(clover);

  return { root: group };
}

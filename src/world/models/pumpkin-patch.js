import * as THREE from "three";
import { addMesh, box, cyl, sphere } from "./mesh-kit.js";

function makePumpkinGeometry(radius) {
  const geometry = new THREE.SphereGeometry(radius, 18, 12);
  const position = geometry.getAttribute("position");
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const angle = Math.atan2(z, x);
    const ridge = 1 + Math.cos(angle * 8) * 0.085;
    position.setXYZ(index, x * ridge, y * 0.78, z * ridge);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function addLeaf(parent, name, x, y, z, yaw, scale = 1) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.16, 0.05, 0.15, 0.18);
  shape.quadraticCurveTo(0.04, 0.28, 0, 0.36);
  shape.quadraticCurveTo(-0.04, 0.28, -0.15, 0.18);
  shape.quadraticCurveTo(-0.16, 0.05, 0, 0);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.012,
    bevelEnabled: false,
  });
  geometry.rotateX(-Math.PI * 0.55);
  return addMesh(parent, geometry, 0x4f8a32, {
    name,
    x,
    y,
    z,
    ry: yaw,
    sx: scale,
    sy: scale,
    sz: scale,
    side: THREE.DoubleSide,
    roughness: 0.86,
    vary: 0.08,
  });
}

function addPlant(root, name, x, z, pumpkinScale, ripe) {
  const plant = new THREE.Group();
  plant.name = name;
  plant.position.set(x, 0, z);
  root.add(plant);

  cyl(plant, 0.018, 0.026, 0.16, 0x3f6a28, {
    name: `${name}-stem-base`,
    y: 0.08,
    radial: 6,
  });

  for (let vine = 0; vine < 3; vine += 1) {
    const yaw = vine * 2.1 + x;
    cyl(plant, 0.012, 0.016, 0.34 + vine * 0.04, 0x4d7a30, {
      name: `${name}-vine-${vine}`,
      y: 0.16,
      z: 0.08,
      rx: 1.15,
      ry: yaw,
      centerY: false,
      radial: 6,
    });
    addLeaf(plant, `${name}-leaf-${vine}`, Math.cos(yaw) * 0.18, 0.14, Math.sin(yaw) * 0.18, yaw, 0.85);
  }

  const pumpkin = addMesh(plant, makePumpkinGeometry(0.16 * pumpkinScale), ripe ? 0xe07020 : 0xc4a14a, {
    name: `${name}-fruit`,
    y: 0.2 * pumpkinScale + 0.08,
    roughness: 0.62,
    vary: 0.05,
  });
  pumpkin.userData.ripe = ripe;
  cyl(plant, 0.012, 0.016, 0.07, 0x3c5c24, {
    name: `${name}-stump`,
    y: 0.2 * pumpkinScale + 0.16,
    radial: 6,
  });
  return plant;
}

export function buildPumpkinPatch() {
  const root = new THREE.Group();
  root.name = "pumpkin-patch";

  box(root, 2.48, 0.1, 2.08, 0x5a3a22, { name: "bed-frame", y: 0 });
  addMesh(root, new THREE.BoxGeometry(2.28, 0.16, 1.88), 0x6b4a28, {
    name: "soil",
    y: 0.16,
    vary: 0.1,
    roughness: 0.96,
  });
  addMesh(root, new THREE.BoxGeometry(2.12, 0.08, 1.72), 0x4e3420, {
    name: "soil-top",
    y: 0.22,
    vary: 0.08,
    roughness: 0.97,
  });

  const rails = [
    { w: 2.52, h: 0.12, d: 0.1, z: -1.04 },
    { w: 2.52, h: 0.12, d: 0.1, z: 1.04 },
    { w: 0.1, h: 0.12, d: 2.12, x: -1.24 },
    { w: 0.1, h: 0.12, d: 2.12, x: 1.24 },
  ];
  rails.forEach((rail, index) => {
    box(root, rail.w, rail.h, rail.d, 0x7a4e28, {
      name: `rail-${index}`,
      x: rail.x ?? 0,
      y: 0.08,
      z: rail.z ?? 0,
    });
  });

  const plants = [
    [-0.72, -0.55, 1.05, true],
    [0.05, -0.62, 0.92, true],
    [0.78, -0.48, 1.12, true],
    [-0.62, 0.18, 0.88, true],
    [0.22, 0.28, 1.18, true],
    [0.74, 0.42, 0.84, false],
    [-0.18, 0.68, 0.96, true],
    [0.48, -0.08, 0.78, false],
  ];
  plants.forEach((entry, index) => {
    addPlant(root, `pumpkin-plant-${index}`, entry[0], entry[1], entry[2], entry[3]);
  });

  cyl(root, 0.03, 0.04, 0.92, 0x6a4222, { name: "stake", x: 1.02, y: 0.12, z: 0.86, radial: 6 });
  box(root, 0.22, 0.14, 0.02, 0xd8c27a, {
    name: "plot-tag",
    x: 1.02,
    y: 0.86,
    z: 0.86,
    vary: 0.03,
  });

  return root;
}

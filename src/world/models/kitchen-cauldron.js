import * as THREE from "three";
import { addMesh, box, cyl, lathe, sphere } from "./mesh-kit.js";

function addShingleRoof(parent, width, depth, rise, hex, y, z = 0) {
  const halfW = width * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-halfW, 0);
  shape.lineTo(0, rise);
  shape.lineTo(halfW, 0);
  shape.lineTo(halfW - 0.08, 0);
  shape.lineTo(0, rise - 0.09);
  shape.lineTo(-halfW + 0.08, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 1,
  });
  geometry.translate(0, 0, -depth * 0.5);
  return addMesh(parent, geometry, hex, {
    name: "kitchen-roof",
    y,
    z,
    roughness: 0.88,
    vary: 0.05,
  });
}

export function buildKitchenCauldron() {
  const root = new THREE.Group();
  root.name = "kitchen-cauldron";

  box(root, 2.15, 0.08, 1.72, 0x6d5334, { name: "hearth-deck", y: 0, vary: 0.05 });
  box(root, 1.86, 0.07, 1.18, 0x7a5a38, { name: "hearth-inner", y: 0.07, vary: 0.06 });

  for (let index = 0; index < 14; index += 1) {
    const angle = (index / 14) * Math.PI * 2;
    const radius = 0.46 + (index % 3) * 0.03;
    box(root, 0.16, 0.18 + (index % 2) * 0.04, 0.11, index % 2 ? 0x8a8074 : 0x6f675c, {
      name: `hearth-stone-${index}`,
      x: Math.cos(angle) * radius,
      y: 0.12,
      z: Math.sin(angle) * radius * 0.86,
      ry: -angle,
      vary: 0.08,
    });
  }

  cyl(root, 0.22, 0.28, 0.08, 0x2a2118, {
    name: "embers",
    y: 0.16,
    radial: 10,
    roughness: 0.95,
  });
  sphere(root, 0.07, 0xc45a22, { name: "ember-glow", y: 0.24, roughness: 0.4 });

  const pot = lathe(
    root,
    [
      [0.02, 0.28],
      [0.22, 0.3],
      [0.34, 0.38],
      [0.4, 0.56],
      [0.38, 0.78],
      [0.32, 0.9],
      [0.34, 0.94],
      [0.3, 0.97],
    ],
    0xb15a2c,
    { name: "cauldron", y: 0, roughness: 0.36, metalness: 0.42, vary: 0.04 },
  );
  pot.position.y = 0;

  lathe(
    root,
    [
      [0.3, 0.97],
      [0.36, 0.99],
      [0.35, 1.03],
      [0.29, 1.04],
    ],
    0x8a3e1c,
    { name: "cauldron-rim", roughness: 0.32, metalness: 0.5, vary: 0.03 },
  );

  for (let leg = 0; leg < 3; leg += 1) {
    const angle = (leg / 3) * Math.PI * 2 + 0.4;
    cyl(root, 0.035, 0.05, 0.28, 0x4a2c1c, {
      name: `cauldron-leg-${leg}`,
      x: Math.cos(angle) * 0.28,
      y: 0.16,
      z: Math.sin(angle) * 0.24,
      rx: 0.18,
      roughness: 0.45,
      metalness: 0.3,
    });
  }

  addMesh(root, new THREE.CircleGeometry(0.29, 22), 0xd9782a, {
    name: "soup-surface",
    y: 0.92,
    rx: -Math.PI * 0.5,
    roughness: 0.28,
    metalness: 0.05,
    vary: 0.04,
  });

  const ladle = new THREE.Group();
  ladle.name = "ladle";
  ladle.position.set(0.18, 0.98, 0.04);
  ladle.rotation.z = -0.55;
  root.add(ladle);
  cyl(ladle, 0.018, 0.016, 0.72, 0x6a4224, {
    name: "ladle-handle",
    y: 0,
    rx: 0.08,
    roughness: 0.72,
  });
  sphere(ladle, 0.09, 0x8d4e24, {
    name: "ladle-bowl",
    y: 0.02,
    x: 0.02,
    z: 0.18,
    roughness: 0.4,
    metalness: 0.28,
  });

  const posts = [
    [-0.92, -0.62],
    [0.92, -0.62],
    [-0.92, 0.68],
    [0.92, 0.68],
  ];
  posts.forEach(([x, z], index) => {
    cyl(root, 0.055, 0.062, 1.62, 0x6b4326, {
      name: `post-${index}`,
      x,
      y: 0.08,
      z,
      radial: 8,
      roughness: 0.86,
    });
  });

  box(root, 1.96, 0.08, 0.08, 0x5a361c, { name: "beam-front", y: 1.64, z: -0.62 });
  box(root, 1.96, 0.08, 0.08, 0x5a361c, { name: "beam-back", y: 1.64, z: 0.68 });
  box(root, 0.08, 0.08, 1.42, 0x5a361c, { name: "beam-left", x: -0.92, y: 1.64 });
  box(root, 0.08, 0.08, 1.42, 0x5a361c, { name: "beam-right", x: 0.92, y: 1.64 });

  addShingleRoof(root, 2.28, 1.72, 0.78, 0xc45d3a, 1.7);
  box(root, 0.18, 0.07, 1.76, 0x8a3a22, { name: "ridge", y: 2.4, centerY: true });

  box(root, 0.38, 1.15, 0.38, 0x8d6a52, { name: "chimney-stack", x: 0.72, y: 1.55, z: 0.42 });
  box(root, 0.46, 0.12, 0.46, 0x6f5342, { name: "chimney-cap", x: 0.72, y: 2.7, z: 0.42 });
  box(root, 0.18, 0.16, 0.18, 0x4a382c, { name: "chimney-pot", x: 0.72, y: 2.82, z: 0.42 });

  box(root, 0.92, 0.08, 0.46, 0x7a4e2a, { name: "table-top", x: -0.58, y: 0.72, z: -0.58 });
  cyl(root, 0.035, 0.04, 0.72, 0x5c381c, { name: "table-leg-a", x: -0.92, y: 0.08, z: -0.74 });
  cyl(root, 0.035, 0.04, 0.72, 0x5c381c, { name: "table-leg-b", x: -0.24, y: 0.08, z: -0.74 });
  cyl(root, 0.035, 0.04, 0.72, 0x5c381c, { name: "table-leg-c", x: -0.92, y: 0.08, z: -0.42 });
  cyl(root, 0.035, 0.04, 0.72, 0x5c381c, { name: "table-leg-d", x: -0.24, y: 0.08, z: -0.42 });
  box(root, 0.16, 0.08, 0.2, 0xd8c7a2, { name: "cutting-board", x: -0.62, y: 0.8, z: -0.58 });
  cyl(root, 0.07, 0.08, 0.1, 0x8f3a22, { name: "herb-bowl", x: -0.34, y: 0.8, z: -0.5, radial: 8 });

  for (let bundle = 0; bundle < 3; bundle += 1) {
    cyl(root, 0.018, 0.03, 0.22, bundle === 1 ? 0x4f7a32 : 0x6a8b3d, {
      name: `herbs-${bundle}`,
      x: -0.78 + bundle * 0.08,
      y: 1.42,
      z: -0.58,
      rx: 0.15,
      side: THREE.DoubleSide,
    });
  }

  for (let log = 0; log < 5; log += 1) {
    cyl(root, 0.045, 0.05, 0.42, log % 2 ? 0x6a4222 : 0x7a5330, {
      name: `firewood-${log}`,
      x: 0.78,
      y: 0.16 + Math.floor(log / 3) * 0.09,
      z: -0.42 + (log % 3) * 0.1,
      rz: Math.PI * 0.5,
      ry: 0.2 * log,
      centerY: true,
      radial: 7,
    });
  }

  box(root, 0.22, 0.18, 0.18, 0xc9b48a, { name: "flour-sack", x: 0.86, y: 0.12, z: 0.62 });
  sphere(root, 0.07, 0xe07a2a, { name: "spare-pumpkin", x: -0.86, y: 0.22, z: 0.58, sy: 0.78 });

  return root;
}

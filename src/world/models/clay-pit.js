import * as THREE from "three";
import { addMesh, box, cyl, lathe, sphere } from "./mesh-kit.js";

function addClayLump(parent, name, x, y, z, scale, hex = 0xb56a38) {
  const lump = sphere(parent, 0.11 * scale, hex, {
    name,
    x,
    y,
    z,
    sx: 1.15,
    sy: 0.62,
    sz: 0.92,
    roughness: 0.92,
    vary: 0.09,
  });
  return lump;
}

function addShovel(parent) {
  const shovel = new THREE.Group();
  shovel.name = "clay-shovel";
  shovel.position.set(0.78, 0.08, 0.42);
  shovel.rotation.set(0.35, -0.55, 0.18);
  parent.add(shovel);
  cyl(shovel, 0.016, 0.02, 0.78, 0x6a4222, { name: "shovel-haft", y: 0, radial: 7 });
  sphere(shovel, 0.028, 0x4a2c16, { name: "shovel-knob", y: 0.8 });
  box(shovel, 0.16, 0.012, 0.22, 0x8a8a86, {
    name: "shovel-blade",
    y: 0,
    z: 0.12,
    rx: 0.18,
    roughness: 0.45,
    metalness: 0.28,
  });
  box(shovel, 0.12, 0.01, 0.06, 0x6f6f6a, {
    name: "shovel-step",
    y: 0.08,
    z: 0.02,
    roughness: 0.5,
    metalness: 0.22,
  });
}

function addWheelbarrow(parent) {
  const cart = new THREE.Group();
  cart.name = "clay-barrow";
  cart.position.set(-0.92, 0.08, 0.62);
  cart.rotation.y = 0.55;
  parent.add(cart);

  box(cart, 0.58, 0.06, 0.34, 0x7a4e28, { name: "barrow-bed", y: 0.22 });
  box(cart, 0.58, 0.14, 0.03, 0x6a3e1c, { name: "barrow-side-a", y: 0.26, z: -0.16 });
  box(cart, 0.58, 0.14, 0.03, 0x6a3e1c, { name: "barrow-side-b", y: 0.26, z: 0.16 });
  box(cart, 0.03, 0.14, 0.34, 0x5c3418, { name: "barrow-front", x: 0.28, y: 0.26 });
  cyl(cart, 0.014, 0.016, 0.62, 0x5a361c, {
    name: "barrow-handle-l",
    x: -0.42,
    y: 0.3,
    z: -0.12,
    rz: Math.PI * 0.5,
    centerY: true,
    radial: 6,
  });
  cyl(cart, 0.014, 0.016, 0.62, 0x5a361c, {
    name: "barrow-handle-r",
    x: -0.42,
    y: 0.3,
    z: 0.12,
    rz: Math.PI * 0.5,
    centerY: true,
    radial: 6,
  });
  cyl(cart, 0.09, 0.09, 0.05, 0x3a3228, {
    name: "barrow-wheel",
    x: 0.18,
    y: 0.1,
    z: 0,
    rz: Math.PI * 0.5,
    centerY: true,
    radial: 10,
  });
  addClayLump(cart, "barrow-clay-a", 0.04, 0.36, 0.02, 0.9, 0xc2743c);
  addClayLump(cart, "barrow-clay-b", -0.1, 0.34, -0.04, 0.7, 0xa85a2c);
}

export function buildClayPit() {
  const root = new THREE.Group();
  root.name = "clay-pit";

  addMesh(root, new THREE.CylinderGeometry(1.28, 1.42, 0.16, 18), 0x6a4a28, {
    name: "earth-berm",
    y: 0.08,
    roughness: 0.96,
    vary: 0.1,
  });
  addMesh(root, new THREE.CylinderGeometry(1.02, 1.16, 0.18, 16), 0x8a5530, {
    name: "clay-wall",
    y: 0.12,
    roughness: 0.94,
    vary: 0.08,
  });
  addMesh(root, new THREE.CylinderGeometry(0.78, 0.92, 0.12, 16), 0xb46834, {
    name: "clay-floor",
    y: 0.08,
    roughness: 0.78,
    vary: 0.06,
  });
  addMesh(root, new THREE.CircleGeometry(0.34, 16), 0x6a8a7a, {
    name: "clay-puddle",
    y: 0.145,
    rx: -Math.PI * 0.5,
    roughness: 0.22,
    metalness: 0.08,
    vary: 0.04,
  });
  addMesh(root, new THREE.CircleGeometry(0.16, 12), 0x5f7e72, {
    name: "clay-puddle-small",
    x: 0.32,
    y: 0.148,
    z: -0.22,
    rx: -Math.PI * 0.5,
    roughness: 0.24,
  });

  for (let step = 0; step < 7; step += 1) {
    const angle = (step / 7) * Math.PI * 2 + 0.2;
    box(root, 0.22, 0.07, 0.14, step % 2 ? 0xa86234 : 0x8f4e28, {
      name: `clay-step-${step}`,
      x: Math.cos(angle) * 0.86,
      y: 0.1,
      z: Math.sin(angle) * 0.78,
      ry: -angle,
      vary: 0.08,
    });
  }

  const walk = [
    { x: 0, z: -1.12, w: 1.35, d: 0.22, ry: 0 },
    { x: 1.12, z: -0.18, w: 0.22, d: 1.05, ry: 0 },
    { x: -0.15, z: 1.14, w: 0.92, d: 0.2, ry: 0.12 },
  ];
  walk.forEach((plank, index) => {
    box(root, plank.w, 0.05, plank.d, index % 2 ? 0x7a5330 : 0x6a4222, {
      name: `boardwalk-${index}`,
      x: plank.x,
      y: 0.18,
      z: plank.z,
      ry: plank.ry,
      roughness: 0.88,
    });
  });

  for (let peg = 0; peg < 8; peg += 1) {
    const angle = (peg / 8) * Math.PI * 2 + 0.4;
    cyl(root, 0.018, 0.022, 0.42, 0x5a361c, {
      name: `stake-${peg}`,
      x: Math.cos(angle) * 1.22,
      y: 0.08,
      z: Math.sin(angle) * 1.12,
      radial: 6,
    });
    if (peg < 7) {
      const next = ((peg + 1) / 8) * Math.PI * 2 + 0.4;
      const midX = (Math.cos(angle) + Math.cos(next)) * 0.61;
      const midZ = (Math.sin(angle) + Math.sin(next)) * 0.56;
      cyl(root, 0.006, 0.006, 0.86, 0x8a6a40, {
        name: `guide-rope-${peg}`,
        x: midX,
        y: 0.38,
        z: midZ,
        rz: Math.PI * 0.5,
        ry: -angle + 0.4,
        centerY: true,
        radial: 5,
      });
    }
  }

  cyl(root, 0.05, 0.06, 1.72, 0x6b4326, {
    name: "hoist-post-a",
    x: -0.48,
    y: 0.16,
    z: -0.72,
    rx: 0.18,
    radial: 8,
  });
  cyl(root, 0.05, 0.06, 1.72, 0x6b4326, {
    name: "hoist-post-b",
    x: 0.48,
    y: 0.16,
    z: -0.72,
    rx: 0.18,
    radial: 8,
  });
  box(root, 1.12, 0.08, 0.08, 0x5a361c, { name: "hoist-beam", y: 1.68, z: -0.56 });
  cyl(root, 0.04, 0.04, 0.28, 0x4a3018, {
    name: "hoist-spindle",
    y: 1.62,
    z: -0.56,
    rz: Math.PI * 0.5,
    centerY: true,
    radial: 8,
  });
  cyl(root, 0.012, 0.012, 0.16, 0x3a2414, {
    name: "hoist-crank",
    x: 0.22,
    y: 1.62,
    z: -0.48,
    rx: 0.6,
    radial: 6,
  });
  sphere(root, 0.024, 0x5a3a1c, { name: "hoist-knob", x: 0.24, y: 1.52, z: -0.4 });
  cyl(root, 0.008, 0.008, 1.18, 0x4d3a28, { name: "hoist-rope", y: 0.92, z: -0.18, radial: 6 });
  lathe(
    root,
    [
      [0.02, 0],
      [0.09, 0.02],
      [0.11, 0.08],
      [0.1, 0.16],
      [0.12, 0.18],
    ],
    0x8a4e26,
    { name: "hoist-bucket", y: 0.42, z: -0.18, roughness: 0.86 },
  );
  addMesh(root, new THREE.CircleGeometry(0.08, 10), 0xb46834, {
    name: "bucket-clay",
    y: 0.56,
    z: -0.18,
    rx: -Math.PI * 0.5,
    roughness: 0.7,
  });

  const lumps = [
    [0.18, 0.16, 0.12, 1.15, 0xc2743c],
    [-0.22, 0.15, 0.28, 0.92, 0xa85a2c],
    [0.36, 0.15, -0.08, 0.78, 0xb86a38],
    [-0.08, 0.16, -0.32, 1.05, 0x9a5228],
    [0.02, 0.17, 0.36, 0.7, 0xc47a42],
    [-0.38, 0.15, -0.06, 0.84, 0xb05e30],
  ];
  lumps.forEach((entry, index) => {
    addClayLump(root, `clay-lump-${index}`, entry[0], entry[1], entry[2], entry[3], entry[4]);
  });

  box(root, 0.72, 0.06, 0.28, 0x6a4222, { name: "drying-bench", x: 0.98, y: 0.22, z: 0.72 });
  for (let brick = 0; brick < 4; brick += 1) {
    box(root, 0.14, 0.05, 0.08, brick % 2 ? 0xc47a42 : 0xb46834, {
      name: `pit-brick-${brick}`,
      x: 0.74 + brick * 0.15,
      y: 0.28,
      z: 0.68 + (brick % 2) * 0.04,
      ry: brick * 0.08,
    });
  }

  addShovel(root);
  addWheelbarrow(root);

  sphere(root, 0.07, 0x5f7a32, { name: "reed-a", x: -1.18, y: 0.1, z: -0.42, sy: 1.4, roughness: 0.9 });
  sphere(root, 0.06, 0x6a8a3a, { name: "reed-b", x: 1.08, y: 0.1, z: 0.22, sy: 1.2, roughness: 0.9 });
  sphere(root, 0.05, 0x4e6a28, { name: "reed-c", x: -0.72, y: 0.08, z: 1.02, sy: 1.1, roughness: 0.9 });

  return root;
}

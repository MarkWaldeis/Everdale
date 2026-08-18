import * as THREE from "three";
import { addMesh, box, cyl, sphere } from "./mesh-kit.js";

function addTileRoof(parent, width, depth, rise, y) {
  const half = width * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(-0.08, rise);
  shape.lineTo(0.08, rise);
  shape.lineTo(half, 0);
  shape.lineTo(half - 0.07, 0);
  shape.lineTo(0.04, rise - 0.08);
  shape.lineTo(-0.04, rise - 0.08);
  shape.lineTo(-half + 0.07, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.012,
    bevelSegments: 1,
  });
  geometry.translate(0, 0, -depth * 0.5);
  addMesh(parent, geometry, 0xc45a32, {
    name: "drying-roof",
    y,
    roughness: 0.86,
    vary: 0.05,
  });

  for (let row = 0; row < 5; row += 1) {
    const t = row / 4;
    box(parent, width * (0.92 - t * 0.18), 0.018, 0.07, row % 2 ? 0xd06a3a : 0xb44c28, {
      name: `roof-tile-row-${row}`,
      y: y + rise * t + 0.02,
      z: 0,
      centerY: true,
    });
  }
}

function addBasket(parent, name, x, y, z, filled) {
  cyl(parent, 0.12, 0.1, 0.14, 0x8a6234, { name: `${name}-body`, x, y, z, radial: 9, roughness: 0.9 });
  cyl(parent, 0.125, 0.125, 0.025, 0x6a4624, { name: `${name}-rim`, x, y: y + 0.14, z, radial: 9 });
  if (filled) {
    sphere(parent, 0.09, 0xc2743c, {
      name: `${name}-clay`,
      x,
      y: y + 0.16,
      z,
      sy: 0.55,
      roughness: 0.88,
    });
  }
}

function addBrickStack(parent, name, x, y, z, count, yaw = 0) {
  for (let index = 0; index < count; index += 1) {
    const layer = Math.floor(index / 2);
    const side = index % 2;
    box(parent, 0.16, 0.055, 0.08, index % 2 ? 0xc47a42 : 0xb05e30, {
      name: `${name}-${index}`,
      x: x + (side - 0.5) * 0.09,
      y: y + layer * 0.058,
      z: z + (layer % 2) * 0.02,
      ry: yaw + side * 0.04,
    });
  }
}

export function buildClayStorage(fill = 0) {
  const root = new THREE.Group();
  root.name = fill >= 1 ? "clay-storage-full" : fill >= 0.5 ? "clay-storage-half" : "clay-storage-empty";

  box(root, 1.72, 0.08, 1.12, 0x6d5334, { name: "yard-deck", y: 0, vary: 0.05 });
  box(root, 1.58, 0.16, 0.12, 0xb46834, { name: "dwarf-wall-front", y: 0.08, z: 0.46 });
  box(root, 1.58, 0.16, 0.12, 0xa85a2c, { name: "dwarf-wall-back", y: 0.08, z: -0.46 });
  box(root, 0.12, 0.16, 0.92, 0x9a5228, { name: "dwarf-wall-left", x: -0.8, y: 0.08 });
  box(root, 0.12, 0.16, 0.92, 0x9a5228, { name: "dwarf-wall-right", x: 0.8, y: 0.08 });

  const posts = [
    [-0.72, -0.42],
    [0.72, -0.42],
    [-0.72, 0.42],
    [0.72, 0.42],
  ];
  posts.forEach(([x, z], index) => {
    box(root, 0.14, 0.08, 0.14, 0x7a6a58, { name: `footing-${index}`, x, y: 0.08, z });
    cyl(root, 0.045, 0.052, 1.28, 0x6b4326, {
      name: `post-${index}`,
      x,
      y: 0.16,
      z,
      radial: 8,
      roughness: 0.86,
    });
  });

  box(root, 1.56, 0.07, 0.07, 0x5a361c, { name: "beam-front", y: 1.38, z: 0.42 });
  box(root, 1.56, 0.07, 0.07, 0x5a361c, { name: "beam-back", y: 1.38, z: -0.42 });
  box(root, 0.07, 0.07, 0.96, 0x5a361c, { name: "beam-left", x: -0.72, y: 1.38 });
  box(root, 0.07, 0.07, 0.96, 0x5a361c, { name: "beam-right", x: 0.72, y: 1.38 });

  addTileRoof(root, 1.88, 1.22, 0.42, 1.42);
  box(root, 0.1, 0.05, 1.26, 0x8a3a22, { name: "roof-ridge", y: 1.86, centerY: true });

  for (let shelf = 0; shelf < 3; shelf += 1) {
    box(root, 1.36, 0.03, 0.34, 0x7a5330, {
      name: `slat-shelf-${shelf}`,
      y: 0.42 + shelf * 0.3,
      z: -0.08,
    });
    for (let slat = 0; slat < 5; slat += 1) {
      box(root, 1.32, 0.012, 0.04, slat % 2 ? 0x8a6238 : 0x6f4a26, {
        name: `willow-${shelf}-${slat}`,
        y: 0.44 + shelf * 0.3,
        z: -0.22 + slat * 0.08,
      });
    }
  }

  addBasket(root, "basket-left", -0.58, 0.16, 0.28, fill >= 0.5);
  addBasket(root, "basket-right", 0.58, 0.16, 0.28, fill >= 1);

  if (fill >= 0.5) {
    addBrickStack(root, "shelf-brick-low", -0.28, 0.46, -0.08, 4, 0.05);
    addBrickStack(root, "shelf-brick-mid", 0.22, 0.76, -0.06, 3, -0.08);
    sphere(root, 0.08, 0xb86a38, {
      name: "shelf-lump",
      x: 0.48,
      y: 0.5,
      z: -0.1,
      sy: 0.55,
      roughness: 0.9,
    });
  }

  if (fill >= 1) {
    addBrickStack(root, "shelf-brick-high", -0.12, 1.06, -0.04, 4, 0.12);
    addBrickStack(root, "ground-stack-a", -0.22, 0.24, 0.28, 6, 0.2);
    addBrickStack(root, "ground-stack-b", 0.18, 0.24, 0.32, 5, -0.15);
    box(root, 0.42, 0.02, 0.28, 0xd8c7a2, {
      name: "linen-cover",
      x: 0.02,
      y: 1.16,
      z: -0.08,
      ry: 0.08,
      roughness: 0.86,
    });
    sphere(root, 0.1, 0xc47a42, {
      name: "overflow-lump-a",
      x: 0.42,
      y: 0.28,
      z: 0.18,
      sy: 0.6,
    });
    sphere(root, 0.08, 0xa85a2c, {
      name: "overflow-lump-b",
      x: -0.48,
      y: 0.26,
      z: 0.12,
      sy: 0.52,
    });
  }

  box(root, 0.18, 0.22, 0.04, 0xd8c27a, {
    name: "yard-tag",
    x: 0.86,
    y: 0.72,
    z: 0.42,
    vary: 0.03,
  });

  return root;
}

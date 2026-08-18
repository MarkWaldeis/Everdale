import * as THREE from "three";
import { addMesh, box, cyl, sphere } from "./mesh-kit.js";

function gableRoof(parent, width, depth, rise, hex, y, name = "roof") {
  const halfW = width * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-halfW, 0);
  shape.lineTo(0, rise);
  shape.lineTo(halfW, 0);
  shape.lineTo(halfW - 0.1, 0);
  shape.lineTo(0, rise - 0.12);
  shape.lineTo(-halfW + 0.1, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.02,
    bevelSegments: 1,
  });
  geometry.translate(0, 0, -depth * 0.5);
  return addMesh(parent, geometry, hex, {
    name,
    y,
    roughness: 0.86,
    vary: 0.045,
  });
}

function windowPane(parent, name, x, y, z, w, h) {
  box(parent, w, h, 0.04, 0x8ec8d8, {
    name: `${name}-glass`,
    x,
    y,
    z,
    roughness: 0.22,
    metalness: 0.18,
    vary: 0.03,
  });
  box(parent, 0.03, h + 0.06, 0.06, 0x5a3a22, { name: `${name}-frame-l`, x: x - w * 0.5, y, z });
  box(parent, 0.03, h + 0.06, 0.06, 0x5a3a22, { name: `${name}-frame-r`, x: x + w * 0.5, y, z });
  box(parent, w + 0.06, 0.03, 0.06, 0x5a3a22, { name: `${name}-frame-t`, x, y: y + h * 0.5, z });
  box(parent, w + 0.06, 0.03, 0.06, 0x5a3a22, { name: `${name}-frame-b`, x, y: y - h * 0.02, z });
  box(parent, 0.025, h, 0.05, 0x6a4628, { name: `${name}-mullion`, x, y, z: z + 0.01 });
}

export function buildStudyHall() {
  const root = new THREE.Group();
  root.name = "study-hall";

  box(root, 2.62, 0.16, 2.18, 0x8a7a68, { name: "plinth", y: 0, vary: 0.05 });
  box(root, 2.48, 0.08, 2.04, 0x6f5340, { name: "floor", y: 0.16, vary: 0.04 });

  box(root, 2.36, 1.42, 0.12, 0xf3e2c4, { name: "wall-back", y: 0.22, z: -0.92, vary: 0.03 });
  box(root, 2.36, 1.42, 0.12, 0xf0dcb8, { name: "wall-front", y: 0.22, z: 0.92, vary: 0.03 });
  box(root, 0.12, 1.42, 1.96, 0xefe0bc, { name: "wall-left", x: -1.12, y: 0.22, vary: 0.03 });
  box(root, 0.12, 1.42, 1.96, 0xefe0bc, { name: "wall-right", x: 1.12, y: 0.22, vary: 0.03 });

  const posts = [
    [-1.14, -0.94],
    [1.14, -0.94],
    [-1.14, 0.94],
    [1.14, 0.94],
  ];
  posts.forEach(([x, z], index) => {
    box(root, 0.14, 1.58, 0.14, 0x6b4324, { name: `timber-${index}`, x, y: 0.16, z, vary: 0.05 });
  });
  box(root, 2.42, 0.1, 0.1, 0x5c381c, { name: "plate-front", y: 1.62, z: 0.94 });
  box(root, 2.42, 0.1, 0.1, 0x5c381c, { name: "plate-back", y: 1.62, z: -0.94 });
  box(root, 0.1, 0.1, 2.02, 0x5c381c, { name: "plate-left", x: -1.14, y: 1.62 });
  box(root, 0.1, 0.1, 2.02, 0x5c381c, { name: "plate-right", x: 1.14, y: 1.62 });

  box(root, 0.08, 1.2, 0.08, 0x7a5330, { name: "brace-l", x: -0.42, y: 0.28, z: 0.94, rz: 0.18 });
  box(root, 0.08, 1.2, 0.08, 0x7a5330, { name: "brace-r", x: 0.42, y: 0.28, z: 0.94, rz: -0.18 });

  box(root, 0.52, 1.08, 0.08, 0x5a361c, { name: "door", x: 0, y: 0.22, z: 0.99 });
  box(root, 0.56, 0.06, 0.1, 0x4a2814, { name: "door-lintel", y: 1.3, z: 0.99 });
  sphere(root, 0.035, 0xd4a24a, { name: "door-knob", x: 0.18, y: 0.74, z: 1.05, metalness: 0.45, roughness: 0.35 });
  box(root, 0.16, 0.18, 0.03, 0xc9a46a, { name: "door-book", x: 0, y: 0.86, z: 1.04 });

  windowPane(root, "win-l", -0.72, 0.92, 0.99, 0.36, 0.42);
  windowPane(root, "win-r", 0.72, 0.92, 0.99, 0.36, 0.42);
  windowPane(root, "win-side", 1.19, 0.98, 0.12, 0.32, 0.38);

  box(root, 0.7, 0.1, 0.42, 0x6a4a2c, { name: "step-1", y: 0.02, z: 1.28 });
  box(root, 0.58, 0.08, 0.28, 0x7a5634, { name: "step-2", y: 0.1, z: 1.18 });

  gableRoof(root, 2.78, 2.28, 0.92, 0x4d6480, 1.68, "slate-roof");
  box(root, 0.16, 0.07, 2.32, 0x3d5168, { name: "ridge-cap", y: 2.56, centerY: true });

  const barge = [
    [-1.18, 0],
    [1.18, 0],
  ];
  barge.forEach(([x], index) => {
    box(root, 0.06, 0.92, 0.08, 0x6b4324, {
      name: `barge-${index}`,
      x,
      y: 1.7,
      z: 1.12,
      rz: x < 0 ? 0.62 : -0.62,
    });
  });

  box(root, 0.36, 0.72, 0.36, 0xc4b39a, { name: "chimney", x: 0.82, y: 2.05, z: -0.42 });
  box(root, 0.44, 0.1, 0.44, 0x8a7a68, { name: "chimney-cap", x: 0.82, y: 2.77, z: -0.42 });
  box(root, 0.16, 0.14, 0.16, 0x5a4a3c, { name: "chimney-pot", x: 0.82, y: 2.87, z: -0.42 });
  sphere(root, 0.07, 0xd8d0c4, { name: "smoke-puff", x: 0.82, y: 3.12, z: -0.42, opacity: 0.45, roughness: 1 });

  box(root, 0.72, 0.08, 0.4, 0x6a4222, { name: "lectern-top", x: -1.42, y: 0.86, z: 0.55 });
  cyl(root, 0.05, 0.07, 0.86, 0x5a361c, { name: "lectern-post", x: -1.42, y: 0.08, z: 0.55, radial: 8 });
  box(root, 0.34, 0.04, 0.26, 0xe8d6a8, { name: "open-book", x: -1.42, y: 0.95, z: 0.55, rx: -0.18 });
  box(root, 0.02, 0.03, 0.22, 0x8a3a22, { name: "book-spine", x: -1.42, y: 0.96, z: 0.55 });

  for (let index = 0; index < 3; index += 1) {
    cyl(root, 0.11, 0.12, 0.22, index === 1 ? 0xc9a46a : 0xb48a4a, {
      name: `scroll-barrel-${index}`,
      x: 1.42,
      y: 0.12 + index * 0.01,
      z: 0.22 + index * 0.22,
      rz: Math.PI * 0.5,
      ry: 0.3 * index,
      centerY: true,
      radial: 10,
    });
  }
  cyl(root, 0.015, 0.015, 0.28, 0xd8c7a2, {
    name: "loose-scroll",
    x: 1.42,
    y: 0.42,
    z: 0.18,
    rz: 0.9,
    centerY: true,
  });

  box(root, 0.46, 0.16, 0.18, 0x4f8a32, { name: "flower-box-l", x: -0.72, y: 0.62, z: 1.08 });
  box(root, 0.46, 0.16, 0.18, 0x4f8a32, { name: "flower-box-r", x: 0.72, y: 0.62, z: 1.08 });
  for (let bloom = 0; bloom < 3; bloom += 1) {
    sphere(root, 0.045, bloom === 1 ? 0xe07a8a : 0xf2c14d, {
      name: `bloom-l-${bloom}`,
      x: -0.84 + bloom * 0.12,
      y: 0.84,
      z: 1.08,
    });
    sphere(root, 0.045, bloom === 2 ? 0xe07a8a : 0xf2c14d, {
      name: `bloom-r-${bloom}`,
      x: 0.6 + bloom * 0.12,
      y: 0.84,
      z: 1.08,
    });
  }

  cyl(root, 0.03, 0.035, 0.72, 0x4a3220, { name: "lantern-post", x: -0.92, y: 0.16, z: 1.22, radial: 6 });
  sphere(root, 0.07, 0xf4d27a, { name: "lantern-glow", x: -0.92, y: 0.92, z: 1.22, roughness: 0.3, metalness: 0.1 });
  box(root, 0.12, 0.04, 0.12, 0x3a2818, { name: "lantern-cap", x: -0.92, y: 1.0, z: 1.22 });

  box(root, 0.9, 0.06, 0.34, 0x7a5330, { name: "desk-inside", y: 0.72, z: -0.42 });
  box(root, 0.16, 0.22, 0.12, 0x355e9a, { name: "book-blue", x: -0.22, y: 0.78, z: -0.42 });
  box(root, 0.14, 0.2, 0.11, 0x8a3a22, { name: "book-red", x: -0.06, y: 0.78, z: -0.4 });
  box(root, 0.15, 0.18, 0.1, 0xd8c27a, { name: "book-tan", x: 0.1, y: 0.78, z: -0.42 });
  cyl(root, 0.05, 0.055, 0.12, 0xc45d28, { name: "ink-pot", x: 0.28, y: 0.78, z: -0.38, radial: 8 });

  return root;
}

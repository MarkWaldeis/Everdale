import * as THREE from "three";
import { addMesh, box, cyl, lathe, sphere } from "./mesh-kit.js";

export function buildValleyHarbor() {
  const root = new THREE.Group();
  root.name = "valley-harbor";

  box(root, 3.4, 0.22, 2.2, 0x8a8680, { name: "quay", y: 0, vary: 0.05 });
  box(root, 3.2, 0.08, 0.9, 0x6f5340, { name: "quay-edge", y: 0.22, z: 0.62, vary: 0.04 });

  for (let plank = 0; plank < 7; plank += 1) {
    box(root, 0.22, 0.06, 1.85, plank % 2 ? 0x7a5330 : 0x6a4222, {
      name: `pier-plank-${plank}`,
      x: -0.72 + plank * 0.24,
      y: 0.28,
      z: 1.42,
      vary: 0.06,
    });
  }
  cyl(root, 0.07, 0.08, 0.7, 0x5a361c, { name: "pier-post-l", x: -0.78, y: -0.12, z: 2.18, radial: 8 });
  cyl(root, 0.07, 0.08, 0.7, 0x5a361c, { name: "pier-post-r", x: 0.78, y: -0.12, z: 2.18, radial: 8 });

  const hull = lathe(
    root,
    [
      [0.02, 0.18],
      [0.22, 0.2],
      [0.38, 0.28],
      [0.42, 0.48],
      [0.4, 0.62],
      [0.22, 0.7],
      [0.02, 0.72],
    ],
    0x6b4324,
    { name: "hull", y: 0.22, z: 1.55, roughness: 0.78, vary: 0.04 },
  );
  hull.rotation.x = Math.PI * 0.5;
  hull.rotation.z = Math.PI * 0.5;
  hull.scale.set(1.15, 1.7, 0.85);

  box(root, 1.15, 0.06, 0.48, 0x8a5a32, { name: "deck", y: 0.62, z: 1.55 });
  cyl(root, 0.035, 0.04, 1.15, 0xd8c7a2, { name: "mast", y: 0.62, z: 1.52, radial: 8 });
  box(root, 0.72, 0.62, 0.03, 0xf3efe2, {
    name: "sail",
    x: 0.22,
    y: 1.12,
    z: 1.52,
    roughness: 0.9,
    vary: 0.02,
  });
  box(root, 0.78, 0.04, 0.04, 0x5a361c, { name: "yardarm", y: 1.72, z: 1.52 });
  box(root, 0.18, 0.12, 0.04, 0x3d7a4a, { name: "pennant", x: 0.08, y: 1.82, z: 1.52 });

  const crateColors = [0xb48a4a, 0x8a5a32, 0xc45d28];
  for (let index = 0; index < 3; index += 1) {
    box(root, 0.28, 0.22, 0.22, crateColors[index], {
      name: `cargo-${index}`,
      x: -1.22 + index * 0.34,
      y: 0.3,
      z: 0.22,
      ry: index * 0.18,
    });
  }

  cyl(root, 0.05, 0.07, 0.28, 0x4a4a46, { name: "bollard-a", x: -1.42, y: 0.22, z: 0.82, radial: 8 });
  cyl(root, 0.05, 0.07, 0.28, 0x4a4a46, { name: "bollard-b", x: 1.42, y: 0.22, z: 0.82, radial: 8 });

  box(root, 0.16, 0.72, 0.16, 0x8a3a22, { name: "beacon-post", x: 1.48, y: 0.22, z: -0.62 });
  sphere(root, 0.09, 0xf0c14d, { name: "beacon-lamp", x: 1.48, y: 1.02, z: -0.62, roughness: 0.28 });

  box(root, 1.1, 0.08, 0.7, 0x6a8b3d, { name: "grass-tuft", x: -1.1, y: 0.22, z: -0.62, vary: 0.08 });
  sphere(root, 0.08, 0xe07a2a, { name: "dock-pumpkin", x: -1.22, y: 0.38, z: -0.5, sy: 0.75 });

  return root;
}

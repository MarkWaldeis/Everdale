import * as THREE from "three";
import { addMesh, box, cyl, sphere } from "./mesh-kit.js";

export function buildBakery() {
  const root = new THREE.Group();
  root.name = "bakery";

  const stone = 0xb9a488;
  const stoneDark = 0x8d7b62;
  const brick = 0xa9663e;
  const ember = 0x2b1a10;
  const wood = 0x7a4e28;
  const woodDark = 0x5a361c;
  const crust = 0xd9945a;
  const awning = 0xc45d3a;

  // Fundament
  box(root, 2.0, 0.12, 1.8, 0x9a8a72, { name: "bakery-floor", y: 0, centerY: true, roughness: 0.9 });

  // Ofen-Kuppel
  sphere(root, 0.95, stone, { name: "oven-dome", y: 0.42, sy: 0.82, segW: 16, segH: 12, roughness: 0.9 });
  // Dome unten abgeflacht -> Sockel
  cyl(root, 0.98, 1.02, 0.3, stoneDark, { name: "oven-base", y: 0.12, radial: 16 });

  // Ofen-Mund + Backrahmung
  box(root, 0.66, 0.5, 0.3, ember, { name: "oven-mouth", y: 0.28, z: 0.72, roughness: 1, vary: 0.02 });
  box(root, 0.14, 0.62, 0.24, brick, { name: "arch-left", x: -0.41, y: 0, z: 0.72 });
  box(root, 0.14, 0.62, 0.24, brick, { name: "arch-right", x: 0.41, y: 0, z: 0.72 });
  box(root, 0.98, 0.14, 0.24, brick, { name: "arch-top", y: 0.58, z: 0.72, centerY: true });
  // Glut im Ofenmund
  sphere(root, 0.05, 0xe8762a, { name: "ember-1", x: -0.12, y: 0.3, z: 0.85, segW: 8, segH: 6 });
  sphere(root, 0.04, 0xf0a03c, { name: "ember-2", x: 0.08, y: 0.27, z: 0.86, segW: 8, segH: 6 });

  // Schornstein
  cyl(root, 0.13, 0.17, 0.95, brick, { name: "chimney", x: -0.52, y: 0.9, z: -0.28, radial: 10 });
  box(root, 0.42, 0.09, 0.42, stoneDark, { name: "chimney-cap", x: -0.52, y: 1.85, z: -0.28, centerY: true });

  // Brotkasten-Regal rechts
  box(root, 0.85, 0.05, 0.42, wood, { name: "shelf-top", x: 1.1, y: 0.62, z: 0.35, centerY: true });
  box(root, 0.85, 0.05, 0.42, wood, { name: "shelf-mid", x: 1.1, y: 0.32, z: 0.35, centerY: true });
  box(root, 0.06, 0.62, 0.06, woodDark, { name: "shelf-leg-1", x: 0.72, y: 0, z: 0.18 });
  box(root, 0.06, 0.62, 0.06, woodDark, { name: "shelf-leg-2", x: 1.48, y: 0, z: 0.18 });
  box(root, 0.06, 0.62, 0.06, woodDark, { name: "shelf-leg-3", x: 0.72, y: 0, z: 0.52 });
  box(root, 0.06, 0.62, 0.06, woodDark, { name: "shelf-leg-4", x: 1.48, y: 0, z: 0.52 });
  // Brote
  sphere(root, 0.1, crust, { name: "bread-1", x: 0.92, y: 0.67, z: 0.3, sy: 0.62, segW: 10, segH: 8 });
  sphere(root, 0.09, crust, { name: "bread-2", x: 1.18, y: 0.66, z: 0.42, sy: 0.6, segW: 10, segH: 8, vary: 0.12 });
  sphere(root, 0.09, crust, { name: "bread-3", x: 1.05, y: 0.37, z: 0.32, sy: 0.6, segW: 10, segH: 8 });

  // Holzstapel links
  for (let i = 0; i < 4; i += 1) {
    cyl(root, 0.065, 0.065, 0.62, i % 2 ? 0x8a5a30 : 0x96683c, {
      name: `log-${i}`,
      x: -1.02 + (i % 2) * 0.13,
      y: 0.05 + Math.floor(i / 2) * 0.13,
      z: 0.55,
      rx: Math.PI / 2,
      radial: 8,
    });
  }

  // kleine Markise über dem Regal
  const awningMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.04, 0.5),
    undefined,
  );
  awningMesh.geometry = new THREE.BoxGeometry(1.0, 0.04, 0.5);
  addMesh(root, awningMesh.geometry, awning, {
    name: "awning",
    x: 1.1,
    y: 0.95,
    z: 0.35,
    rx: 0.12,
    roughness: 0.85,
  });

  return root;
}

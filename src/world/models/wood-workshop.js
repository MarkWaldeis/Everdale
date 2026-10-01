import * as THREE from "three";
import { addMesh, box, cyl, sphere } from "./mesh-kit.js";

export function buildWoodWorkshop() {
  const root = new THREE.Group();
  root.name = "wood-workshop";

  const wood = 0x7a4e28;
  const woodDark = 0x5a361c;
  const plank = 0xa8794a;
  const plankLight = 0xc09a68;
  const metal = 0x9a9aa4;
  const roofGreen = 0x5a7a3a;
  const floor = 0x8a7a62;

  // Fundament
  box(root, 2.1, 0.12, 1.8, floor, { name: "workshop-floor", centerY: true, roughness: 0.9 });

  // Werkbank mit Schraubstock
  box(root, 1.5, 0.08, 0.65, wood, { name: "bench-top", y: 0.7, z: -0.25, centerY: true });
  box(root, 0.1, 0.7, 0.1, woodDark, { name: "bench-leg-1", x: -0.62, y: 0.06, z: -0.45 });
  box(root, 0.1, 0.7, 0.1, woodDark, { name: "bench-leg-2", x: 0.62, y: 0.06, z: -0.45 });
  box(root, 0.1, 0.7, 0.1, woodDark, { name: "bench-leg-3", x: -0.62, y: 0.06, z: -0.05 });
  box(root, 0.1, 0.7, 0.1, woodDark, { name: "bench-leg-4", x: 0.62, y: 0.06, z: -0.05 });
  // Schraubstock
  box(root, 0.18, 0.16, 0.16, metal, { name: "vise", x: 0.55, y: 0.74, z: -0.2 });
  cyl(root, 0.02, 0.02, 0.3, metal, { name: "vise-handle", x: 0.55, y: 0.82, z: -0.2, rz: Math.PI / 2, radial: 6 });
  // eingespanntes Brett
  box(root, 0.7, 0.05, 0.22, plankLight, { name: "bench-plank", x: 0.15, y: 0.74, z: -0.22, ry: 0.06 });

  // Hobel + Säge auf der Bank
  box(root, 0.22, 0.09, 0.1, woodDark, { name: "plane", x: -0.4, y: 0.74, z: -0.25 });
  box(root, 0.4, 0.02, 0.06, metal, { name: "saw-blade", x: -0.15, y: 0.74, z: 0.0, ry: -0.4 });
  cyl(root, 0.03, 0.03, 0.14, wood, { name: "saw-grip", x: -0.32, y: 0.76, z: 0.12, radial: 6 });

  // Bretterstapel hinten rechts
  for (let i = 0; i < 4; i += 1) {
    box(root, 1.05, 0.06, 0.24, i % 2 ? plank : plankLight, {
      name: `stack-${i}`,
      x: 0.55,
      y: 0.06 + i * 0.07,
      z: -0.62,
      ry: (i % 2 ? -1 : 1) * 0.05,
    });
  }

  // Sägebock vorne links + eingespanntes Rundholz
  box(root, 0.09, 0.5, 0.09, woodDark, { name: "buck-leg-1", x: -0.85, y: 0.06, z: 0.42, rz: 0.22 });
  box(root, 0.09, 0.5, 0.09, woodDark, { name: "buck-leg-2", x: -0.35, y: 0.06, z: 0.42, rz: -0.22 });
  cyl(root, 0.11, 0.11, 1.0, 0x96683c, {
    name: "log-on-buck",
    x: -0.6,
    y: 0.52,
    z: 0.42,
    rz: Math.PI / 2,
    radial: 10,
  });
  // abgeschnittene Scheiben davor
  cyl(root, 0.11, 0.11, 0.06, 0xc7a87a, { name: "disc-1", x: -0.95, y: 0.06, z: 0.62, radial: 10 });
  cyl(root, 0.1, 0.1, 0.06, 0xc7a87a, { name: "disc-2", x: -0.8, y: 0.06, z: 0.72, radial: 10 });

  // Eimer
  cyl(root, 0.14, 0.11, 0.22, wood, { name: "bucket", x: 0.8, y: 0.06, z: 0.6, radial: 10 });
  cyl(root, 0.145, 0.145, 0.02, metal, { name: "bucket-rim", x: 0.8, y: 0.26, z: 0.6, radial: 10 });

  // Schrägdach über der Bank (offen vorne)
  const roof = new THREE.Shape();
  roof.moveTo(-1.15, 0);
  roof.lineTo(1.15, 0);
  roof.lineTo(1.05, -0.08);
  roof.lineTo(-1.05, -0.08);
  roof.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(roof, { depth: 1.2, bevelEnabled: false });
  roofGeo.translate(0, 0, -0.95);
  addMesh(root, roofGeo, roofGreen, { name: "roof", y: 2.0, rx: -0.28, roughness: 0.9 });
  // Dach-Pfosten hinten
  cyl(root, 0.06, 0.07, 1.95, woodDark, { name: "roof-post-l", x: -0.95, y: 0.06, z: -0.75, radial: 8 });
  cyl(root, 0.06, 0.07, 1.95, woodDark, { name: "roof-post-r", x: 0.95, y: 0.06, z: -0.75, radial: 8 });

  return root;
}

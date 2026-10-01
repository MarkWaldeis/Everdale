import * as THREE from "three";
import { addMesh, box, cyl, sphere } from "./mesh-kit.js";

export function buildOrderBoard() {
  const root = new THREE.Group();
  root.name = "order-board";

  const wood = 0x7a4e28;
  const woodDark = 0x5a361c;
  const parchment = 0xf2e3b8;
  const parchmentShade = 0xe0cda0;
  const roofRed = 0xc45d3a;
  const roofRidge = 0x8a3a22;

  // Pfosten + Rahmen
  cyl(root, 0.055, 0.065, 1.62, woodDark, { name: "post-left", x: -0.62, y: 0, radial: 8 });
  cyl(root, 0.055, 0.065, 1.62, woodDark, { name: "post-right", x: 0.62, y: 0, radial: 8 });
  box(root, 1.42, 0.1, 0.12, wood, { name: "frame-top", y: 1.52, centerY: true });
  box(root, 1.42, 0.1, 0.12, wood, { name: "frame-bottom", y: 0.58, centerY: true });
  box(root, 1.3, 0.9, 0.07, 0x9a6a3a, { name: "board-face", y: 1.05, centerY: true, roughness: 0.85 });

  // Zelt-Dach
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-0.82, 0);
  roofShape.lineTo(0, 0.34);
  roofShape.lineTo(0.82, 0);
  roofShape.lineTo(0.74, 0);
  roofShape.lineTo(0, 0.26);
  roofShape.lineTo(-0.74, 0);
  roofShape.closePath();
  const roof = new THREE.ExtrudeGeometry(roofShape, { depth: 0.5, bevelEnabled: false });
  roof.translate(0, 0, -0.25);
  addMesh(root, roof, roofRed, { name: "board-roof", y: 1.66, roughness: 0.86 });
  box(root, 0.1, 0.05, 0.54, roofRidge, { name: "roof-ridge", y: 1.98, centerY: true });

  // Auftrags-Zettel: drei Pergamente, leicht versetzt
  const notes = [
    { x: -0.4, y: 1.14, w: 0.34, h: 0.46, ry: 0.06, hex: parchment },
    { x: 0.02, y: 1.08, w: 0.36, h: 0.52, ry: -0.04, hex: parchmentShade },
    { x: 0.42, y: 1.16, w: 0.32, h: 0.42, ry: 0.08, hex: parchment },
  ];
  notes.forEach((note, index) => {
    addMesh(root, new THREE.BoxGeometry(note.w, note.h, 0.012), note.hex, {
      name: `order-note-${index}`,
      x: note.x,
      y: note.y,
      z: 0.045,
      ry: note.ry,
      roughness: 0.9,
      vary: 0.03,
    });
    // Text-Zeilen als dunkle Striche
    for (let line = 0; line < 3; line += 1) {
      box(root, note.w * 0.62, 0.018, 0.006, 0x8a7050, {
        name: `note-line-${index}-${line}`,
        x: note.x,
        y: note.y + note.h * 0.24 - line * 0.07,
        z: 0.055,
        ry: note.ry,
        roughness: 1,
        vary: 0.02,
      });
    }
    // rotes Wachs-Siegel
    sphere(root, 0.028, 0xa8352a, {
      name: `seal-${index}`,
      x: note.x + note.w * 0.28,
      y: note.y - note.h * 0.3,
      z: 0.058,
      sy: 0.4,
    });
  });

  // Kiste mit Leergut + Stapel Planke
  box(root, 0.34, 0.26, 0.3, 0x8a5a30, { name: "order-crate", x: -0.78, y: 0, z: 0.22 });
  box(root, 0.38, 0.045, 0.34, woodDark, { name: "crate-rim", x: -0.78, y: 0.24, z: 0.22, centerY: true });
  box(root, 0.5, 0.05, 0.12, 0xa8794a, { name: "plank-1", x: 0.72, y: 0, z: 0.18, ry: 0.35 });
  box(root, 0.46, 0.05, 0.12, 0x96683c, { name: "plank-2", x: 0.72, y: 0.05, z: 0.18, ry: 0.18 });

  // Federkiel im Tintenfass am Brett
  cyl(root, 0.05, 0.06, 0.1, 0x3a2c1c, { name: "ink-pot", x: 0.52, y: 0.62, z: 0.09, radial: 8 });
  cyl(root, 0.006, 0.006, 0.26, 0xf4f0e0, {
    name: "quill",
    x: 0.55,
    y: 0.66,
    z: 0.09,
    rz: -0.5,
    radial: 5,
  });

  return root;
}

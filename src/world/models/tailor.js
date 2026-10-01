import * as THREE from "three";
import { addMesh, box, cyl, sphere } from "./mesh-kit.js";

export function buildTailor() {
  const root = new THREE.Group();
  root.name = "tailor";

  const wood = 0x7a4e28;
  const woodDark = 0x5a361c;
  const clothRed = 0xc25a4a;
  const clothTeal = 0x4a8f8a;
  const clothCream = 0xe8d9b0;
  const clothViolet = 0x8a5a9a;
  const floor = 0x9a8a72;

  // Fundament + Holzrahmen (offene Werkstatt)
  box(root, 2.0, 0.12, 1.7, floor, { name: "tailor-floor", centerY: true, roughness: 0.9 });
  cyl(root, 0.06, 0.07, 1.7, woodDark, { name: "post-fl", x: -0.85, y: 0.06, z: 0.7, radial: 8 });
  cyl(root, 0.06, 0.07, 1.7, woodDark, { name: "post-fr", x: 0.85, y: 0.06, z: 0.7, radial: 8 });
  cyl(root, 0.06, 0.07, 1.7, woodDark, { name: "post-bl", x: -0.85, y: 0.06, z: -0.7, radial: 8 });
  cyl(root, 0.06, 0.07, 1.7, woodDark, { name: "post-br", x: 0.85, y: 0.06, z: -0.7, radial: 8 });

  // Zelt-Dach aus gestreiftem Stoff
  const roof = new THREE.Shape();
  roof.moveTo(-1.05, 0);
  roof.lineTo(0, 0.55);
  roof.lineTo(1.05, 0);
  roof.lineTo(0.95, 0);
  roof.lineTo(0, 0.44);
  roof.lineTo(-0.95, 0);
  roof.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(roof, { depth: 1.6, bevelEnabled: false });
  roofGeo.translate(0, 0, -0.8);
  addMesh(root, roofGeo, clothCream, { name: "roof", y: 1.72, roughness: 0.85 });
  // Querstreifen
  [-0.52, 0, 0.52].forEach((z, index) => {
    box(root, 2.1 - Math.abs(z) * 0.4, 0.045, 0.34, index % 2 ? clothTeal : clothRed, {
      name: `roof-stripe-${index}`,
      y: 1.86 + Math.abs(z) * 0.12,
      z,
      centerY: true,
      roughness: 0.85,
    });
  });

  // Werkbank
  box(root, 1.3, 0.07, 0.6, wood, { name: "bench-top", x: 0, y: 0.72, z: -0.15, centerY: true });
  box(root, 0.08, 0.72, 0.08, woodDark, { name: "bench-leg-1", x: -0.55, y: 0, z: -0.35 });
  box(root, 0.08, 0.72, 0.08, woodDark, { name: "bench-leg-2", x: 0.55, y: 0, z: -0.35 });
  box(root, 0.08, 0.72, 0.08, woodDark, { name: "bench-leg-3", x: -0.55, y: 0, z: 0.05 });
  box(root, 0.08, 0.72, 0.08, woodDark, { name: "bench-leg-4", x: 0.55, y: 0, z: 0.05 });
  // Stoffrollen auf der Bank
  cyl(root, 0.09, 0.09, 0.7, clothRed, { name: "roll-red", x: -0.3, y: 0.76, z: -0.15, rz: Math.PI / 2, radial: 10 });
  cyl(root, 0.08, 0.08, 0.7, clothTeal, { name: "roll-teal", x: -0.3, y: 0.9, z: -0.15, rz: Math.PI / 2, radial: 10 });
  // Schere als zwei dünne Querstreifen
  box(root, 0.34, 0.02, 0.03, 0xb8b8c4, { name: "shear-1", x: 0.32, y: 0.76, z: -0.1, ry: 0.5 });
  box(root, 0.34, 0.02, 0.03, 0xb8b8c4, { name: "shear-2", x: 0.32, y: 0.76, z: -0.2, ry: -0.5 });

  // Kleiderstange links mit hängenden Stoffen
  cyl(root, 0.05, 0.06, 1.15, woodDark, { name: "rod-post-1", x: -0.95, y: 0.06, z: 0.2, radial: 8 });
  cyl(root, 0.05, 0.06, 1.15, woodDark, { name: "rod-post-2", x: -0.35, y: 0.06, z: 0.2, radial: 8 });
  cyl(root, 0.03, 0.03, 0.68, wood, { name: "rod", x: -0.65, y: 1.16, z: 0.2, rz: Math.PI / 2, radial: 8 });
  box(root, 0.2, 0.55, 0.02, clothViolet, { name: "hang-violet", x: -0.8, y: 0.6, z: 0.2 });
  box(root, 0.2, 0.48, 0.02, clothTeal, { name: "hang-teal", x: -0.55, y: 0.66, z: 0.2 });
  box(root, 0.18, 0.4, 0.02, clothRed, { name: "hang-red", x: -0.42, y: 0.74, z: 0.2 });

  // Schneiderpuppe rechts
  cyl(root, 0.035, 0.035, 0.5, woodDark, { name: "dummy-pole", x: 0.85, y: 0.5, z: 0.35, radial: 8 });
  sphere(root, 0.16, clothCream, { name: "dummy-torso", x: 0.85, y: 1.0, z: 0.35, sy: 1.35 });
  cyl(root, 0.16, 0.18, 0.08, woodDark, { name: "dummy-base", x: 0.85, y: 0.06, z: 0.35, radial: 10 });
  // Messband über der Puppe
  addMesh(
    root,
    new THREE.TorusGeometry(0.2, 0.018, 6, 20, Math.PI * 1.2),
    0xe8c86a,
    { name: "tape", x: 0.85, y: 1.1, z: 0.35, rx: Math.PI / 2, roughness: 0.7 },
  );

  return root;
}

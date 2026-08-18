import * as THREE from "three";
import { addMesh, box, cyl, sphere } from "./mesh-kit.js";

export function buildVillageWell() {
  const root = new THREE.Group();
  root.name = "village-well";

  cyl(root, 0.52, 0.56, 0.16, 0x6d6848, { name: "moss-ring", y: 0, radial: 14, roughness: 0.95 });

  for (let ring = 0; ring < 5; ring += 1) {
    const radius = 0.42 - ring * 0.008;
    cyl(root, radius, radius + 0.02, 0.18, ring % 2 ? 0x8a8376 : 0x746d62, {
      name: `well-ring-${ring}`,
      y: 0.14 + ring * 0.17,
      radial: 16,
      vary: 0.08,
      roughness: 0.9,
    });
  }

  cyl(root, 0.34, 0.34, 0.06, 0x3a3328, { name: "well-inner", y: 0.92, radial: 16 });
  addMesh(root, new THREE.CircleGeometry(0.3, 18), 0x3d6d72, {
    name: "well-water",
    y: 0.78,
    rx: -Math.PI * 0.5,
    roughness: 0.22,
    metalness: 0.12,
    vary: 0.04,
  });

  for (let cap = 0; cap < 10; cap += 1) {
    const angle = (cap / 10) * Math.PI * 2;
    box(root, 0.16, 0.08, 0.11, cap % 2 ? 0x948c7e : 0x7a7368, {
      name: `coping-${cap}`,
      x: Math.cos(angle) * 0.4,
      y: 1.0,
      z: Math.sin(angle) * 0.4,
      ry: -angle,
      vary: 0.07,
    });
  }

  cyl(root, 0.045, 0.05, 1.18, 0x6a4224, { name: "post-left", x: -0.46, y: 1.02, z: 0, radial: 8 });
  cyl(root, 0.045, 0.05, 1.18, 0x6a4224, { name: "post-right", x: 0.46, y: 1.02, z: 0, radial: 8 });
  box(root, 1.08, 0.08, 0.08, 0x5a341c, { name: "crossbeam", y: 2.16, centerY: true });

  const roofShape = new THREE.Shape();
  roofShape.moveTo(-0.62, 0);
  roofShape.lineTo(0, 0.38);
  roofShape.lineTo(0.62, 0);
  roofShape.lineTo(0.54, 0);
  roofShape.lineTo(0, 0.3);
  roofShape.lineTo(-0.54, 0);
  roofShape.closePath();
  const roof = new THREE.ExtrudeGeometry(roofShape, {
    depth: 0.72,
    bevelEnabled: false,
  });
  roof.translate(0, 0, -0.36);
  addMesh(root, roof, 0xc45d3a, { name: "well-roof", y: 2.2, roughness: 0.86 });
  box(root, 0.1, 0.05, 0.76, 0x8a3a22, { name: "well-ridge", y: 2.56, centerY: true });

  cyl(root, 0.03, 0.03, 0.42, 0x4a3018, {
    name: "spindle",
    x: 0,
    y: 2.0,
    z: 0,
    rz: Math.PI * 0.5,
    centerY: true,
    radial: 8,
  });
  cyl(root, 0.012, 0.012, 0.18, 0x3a2814, {
    name: "crank-arm",
    x: 0.28,
    y: 2.0,
    z: 0.08,
    rx: 0.4,
    radial: 6,
  });
  sphere(root, 0.028, 0x5a3a1c, { name: "crank-knob", x: 0.3, y: 1.9, z: 0.16 });

  cyl(root, 0.008, 0.008, 0.72, 0x4d3a28, { name: "rope", y: 1.28, radial: 6 });
  cyl(root, 0.09, 0.07, 0.14, 0x7a4e28, { name: "bucket", y: 0.92, radial: 10 });
  cyl(root, 0.095, 0.095, 0.03, 0x5a361c, { name: "bucket-rim", y: 1.06, radial: 10 });
  addMesh(root, new THREE.CircleGeometry(0.07, 12), 0x4d7a86, {
    name: "bucket-water",
    y: 1.02,
    rx: -Math.PI * 0.5,
    roughness: 0.25,
  });

  box(root, 0.22, 0.08, 0.16, 0x7a6a48, { name: "step-stone", x: 0, y: 0, z: 0.62 });
  sphere(root, 0.05, 0x6f8a3a, { name: "moss-tuft", x: -0.48, y: 0.08, z: 0.36, sy: 0.5 });

  return root;
}

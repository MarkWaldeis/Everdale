import * as THREE from "three";

const WALL = new THREE.MeshStandardMaterial({ color: 0xf2ead9, roughness: 0.9, flatShading: true });
const WOOD = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.9, flatShading: true });
const WOOD_DARK = new THREE.MeshStandardMaterial({ color: 0x6f4527, roughness: 0.95, flatShading: true });
const ROOF = new THREE.MeshStandardMaterial({ color: 0x6f8fb4, roughness: 0.85, flatShading: true });
const TIN = new THREE.MeshStandardMaterial({ color: 0xb9c2c9, roughness: 0.4, metalness: 0.55, flatShading: true });
const CHEESE = new THREE.MeshStandardMaterial({ color: 0xf0c94a, roughness: 0.8, flatShading: true });
const CLOTH = new THREE.MeshStandardMaterial({ color: 0x6f8fb4, roughness: 0.85, flatShading: true, side: THREE.DoubleSide });

export function createDairyModel() {
  const g = new THREE.Group();
  const hut = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.85, 1.1), WALL);
  hut.position.y = 0.43;
  hut.castShadow = true;
  g.add(hut);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.55, 4), ROOF);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 1.1;
  roof.castShadow = true;
  g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.5, 0.05), WOOD_DARK);
  door.position.set(-0.3, 0.25, 0.56);
  g.add(door);
  const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.05), new THREE.MeshStandardMaterial({ color: 0xbfd9e8, roughness: 0.3, flatShading: true }));
  windowMesh.position.set(0.35, 0.5, 0.56);
  g.add(windowMesh);
  // awning over the work table
  const awning = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), CLOTH);
  awning.rotation.x = -0.5;
  awning.position.set(0.4, 0.95, 0.75);
  g.add(awning);
  const table = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.45), WOOD);
  table.position.set(0.4, 0.42, 0.72);
  g.add(table);
  [[0.12, 0.6], [0.68, 0.6], [0.12, 0.84], [0.68, 0.84]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 5), WOOD_DARK);
    leg.position.set(x, 0.21, z);
    g.add(leg);
  });
  // milk cans
  [[-0.75, 0.2], [-0.75, -0.15], [-0.95, 0.0]].forEach(([x, z]) => {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.32, 8), TIN);
    can.position.set(x, 0.16, z);
    can.castShadow = true;
    g.add(can);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 8), TIN);
    lid.position.set(x, 0.34, z);
    g.add(lid);
  });
  // cheese wheels on the table
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.09, 12), CHEESE);
  wheel.position.set(0.25, 0.5, 0.7);
  g.add(wheel);
  const wheel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 12), CHEESE);
  wheel2.position.set(0.55, 0.5, 0.72);
  g.add(wheel2);
  // butter churn
  const churn = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.3, 7), WOOD);
  churn.position.set(-0.4, 0.15, 0.62);
  g.add(churn);
  const plunger = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 5), WOOD_DARK);
  plunger.position.set(-0.4, 0.4, 0.62);
  g.add(plunger);
  g.userData.plunger = plunger;
  return g;
}

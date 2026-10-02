import * as THREE from "three";

const WOOD = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.9, flatShading: true });
const WOOD_DARK = new THREE.MeshStandardMaterial({ color: 0x6f4527, roughness: 0.95, flatShading: true });
const CANVAS = new THREE.MeshStandardMaterial({ color: 0xc9524a, roughness: 0.8, flatShading: true, side: THREE.DoubleSide });
const CRATE = new THREE.MeshStandardMaterial({ color: 0xa9804f, roughness: 0.95, flatShading: true });
const PUMPKIN = new THREE.MeshStandardMaterial({ color: 0xd97a28, roughness: 0.85, flatShading: true });

export function createTradeCart(surfaceY) {
  const root = new THREE.Group();
  root.name = "trade-cart";
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 0.7), WOOD);
  bed.position.y = 0.42;
  root.add(bed);
  [[-0.52, 0.3], [0.52, 0.3], [-0.52, -0.3], [0.52, -0.3]].forEach(([x, z]) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.08), WOOD_DARK);
    wall.position.set(x, 0.55, z);
    root.add(wall);
  });
  for (const z of [-0.37, 0.37]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.26, 0.05), WOOD);
    rail.position.set(0, 0.56, z);
    root.add(rail);
  }
  for (const x of [-0.42, 0.42]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.07, 12), WOOD_DARK);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, 0.24, 0.42);
    root.add(wheel);
    const wheel2 = wheel.clone();
    wheel2.position.z = -0.42;
    root.add(wheel2);
  }
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), WOOD_DARK);
  axle.rotation.x = Math.PI / 2;
  axle.position.set(-0.42, 0.24, 0);
  root.add(axle);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.85, 5), WOOD_DARK);
  handle.rotation.z = Math.PI / 2.6;
  handle.position.set(0.85, 0.32, 0);
  root.add(handle);
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.05, 8, 1, true, 0, Math.PI), CANVAS);
  canopy.rotation.z = Math.PI / 2;
  canopy.position.y = 0.92;
  root.add(canopy);
  [[-0.48, 0.62], [0.48, 0.62]].forEach(([x]) => {
    for (const z of [-0.24, 0.24]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4), WOOD_DARK);
      strut.position.set(x, 0.78, z);
      root.add(strut);
    }
  });
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.3), CRATE);
  crate.position.set(-0.25, 0.65, -0.12);
  root.add(crate);
  const sack = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshStandardMaterial({ color: 0xcbb088, roughness: 1, flatShading: true }));
  sack.scale.set(1, 0.8, 1);
  sack.position.set(0.28, 0.6, 0.14);
  root.add(sack);
  const pumpkin = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), PUMPKIN);
  pumpkin.scale.y = 0.75;
  pumpkin.position.set(0.05, 0.62, -0.2);
  root.add(pumpkin);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.14), CANVAS);
  flag.position.set(0.55, 1.32, 0);
  root.add(flag);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.95, 4), WOOD_DARK);
  pole.position.set(0.55, 0.9, 0);
  root.add(pole);
  root.traverse((node) => {
    if (node.isMesh) node.castShadow = true;
  });
  root.position.y = surfaceY;
  function update(delta, elapsed) {
    flag.rotation.y = Math.sin(elapsed * 4) * 0.35;
    root.position.y = surfaceY + Math.sin(elapsed * 1.7) * 0.008;
  }
  return { root, update };
}

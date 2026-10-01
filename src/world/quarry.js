import * as THREE from "three";

const ROCK = new THREE.MeshStandardMaterial({ color: 0x8d8a84, roughness: 0.95, flatShading: true });
const ROCK_DARK = new THREE.MeshStandardMaterial({ color: 0x6f6d68, roughness: 1, flatShading: true });
const GRASS = new THREE.MeshStandardMaterial({ color: 0x86a854, roughness: 1, flatShading: true });
const WOOD = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.9, flatShading: true });
const IRON = new THREE.MeshStandardMaterial({ color: 0x4a4640, roughness: 0.55, metalness: 0.5, flatShading: true });

function rock(r, seed) {
  const geo = new THREE.IcosahedronGeometry(r, 0);
  const m = new THREE.Mesh(geo, seed % 2 ? ROCK : ROCK_DARK);
  m.rotation.set(seed * 1.3, seed * 0.7, seed * 0.4);
  m.castShadow = true;
  return m;
}

export function createQuarry(surfaceY) {
  const root = new THREE.Group();
  root.name = "quarry";

  const ground = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.1, 10), GRASS);
  ground.position.y = 0.05;
  root.add(ground);

  const big = rock(0.85, 1);
  big.position.set(-0.45, 0.6, -0.3);
  big.scale.y = 1.15;
  root.add(big);
  const mid = rock(0.5, 2);
  mid.position.set(0.35, 0.4, -0.55);
  root.add(mid);
  const small = rock(0.28, 3);
  small.position.set(-0.95, 0.22, 0.35);
  root.add(small);
  const chip1 = rock(0.14, 4);
  chip1.position.set(0.75, 0.14, 0.3);
  root.add(chip1);

  const pickHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.7, 5), WOOD);
  pickHandle.position.set(0.55, 0.5, -0.1);
  pickHandle.rotation.z = 0.5;
  root.add(pickHandle);
  const pickHead = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.4, 5), IRON);
  pickHead.position.set(0.4, 0.8, -0.1);
  pickHead.rotation.z = Math.PI / 2 + 0.3;
  root.add(pickHead);

  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.3, 0.35), WOOD);
  crate.position.set(0.85, 0.25, 0.5);
  crate.rotation.y = 0.4;
  crate.castShadow = true;
  root.add(crate);
  for (let i = 0; i < 3; i += 1) {
    const lump = rock(0.09, 5 + i);
    lump.position.set(0.72 + i * 0.14, 0.44, 0.5 + (i % 2) * 0.1);
    root.add(lump);
  }

  const hitProxy = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 1.8, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitProxy.name = "hit-proxy";
  hitProxy.position.y = 0.8;
  root.add(hitProxy);

  const size = new THREE.Vector3(3, 1.6, 3);
  const stand = new THREE.Vector3();
  const look = new THREE.Vector3();
  const localStand = new THREE.Vector3(0.4, 0, 1.6);
  const localLook = new THREE.Vector3(-0.4, 0.7, -0.3);

  function refreshAnchors() {
    root.updateMatrixWorld(true);
    stand.copy(root.localToWorld(localStand.clone()));
    stand.y = surfaceY;
    look.copy(root.localToWorld(localLook.clone()));
    look.y = surfaceY + 0.6;
  }
  refreshAnchors();

  function setWorldPosition(x, z) {
    root.position.set(x, surfaceY, z);
    refreshAnchors();
  }
  function setYaw(yaw) {
    root.rotation.y = yaw;
    refreshAnchors();
  }
  function update(delta, elapsed) {
    small.rotation.y = Math.sin(elapsed * 0.6) * 0.05;
  }

  return { root, size, stand, look, setWorldPosition, setYaw, refreshAnchors, update };
}

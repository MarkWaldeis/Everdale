import * as THREE from "three";

const WOOD = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.9, flatShading: true });
const WOOD_DARK = new THREE.MeshStandardMaterial({ color: 0x6f4527, roughness: 0.95, flatShading: true });
const BUCKET = new THREE.MeshStandardMaterial({ color: 0x9aa5ad, roughness: 0.5, metalness: 0.3, flatShading: true });
const FISH = new THREE.MeshStandardMaterial({ color: 0x5e8fb5, roughness: 0.55, flatShading: true });
const ROD = new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 0.8, flatShading: true });
const LINE = new THREE.MeshStandardMaterial({ color: 0xd8e8ee, roughness: 0.4 });
const FLOAT = new THREE.MeshStandardMaterial({ color: 0xd64533, roughness: 0.5, flatShading: true });

export function createFishingDock(surfaceY) {
  const root = new THREE.Group();
  root.name = "fishing-dock";

  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.7, 0.08, 10),
    new THREE.MeshStandardMaterial({ color: 0x8aa457, roughness: 1, flatShading: true }),
  );
  ground.position.y = 0.04;
  root.add(ground);

  const deck = new THREE.Group();
  for (let i = 0; i < 5; i += 1) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 1.5), i % 2 ? WOOD : WOOD_DARK);
    plank.position.set(-0.68 + i * 0.34, 0.14, 0);
    plank.castShadow = true;
    plank.receiveShadow = true;
    deck.add(plank);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.07, 0.16), WOOD_DARK);
  beam.position.set(0, 0.1, -0.55);
  deck.add(beam);
  const beam2 = beam.clone();
  beam2.position.z = 0.55;
  deck.add(beam2);
  for (const [x, z] of [[-0.75, -0.6], [0.75, -0.6], [-0.75, 0.6], [0.75, 0.6]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.28, 5), WOOD_DARK);
    leg.position.set(x, 0.05, z);
    deck.add(leg);
  }
  deck.position.set(0, 0, -0.2);
  root.add(deck);

  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.22, 8, 1, true), BUCKET);
  bucket.material.side = THREE.DoubleSide;
  bucket.position.set(0.5, 0.27, 0.15);
  root.add(bucket);

  const fish = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 5), FISH);
  fish.scale.set(1.5, 0.6, 0.6);
  fish.position.set(0.5, 0.3, 0.15);
  fish.rotation.z = 0.4;
  root.add(fish);

  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, 1.6, 5), ROD);
  rod.rotation.x = Math.PI / 2.6;
  rod.position.set(-0.45, 0.95, -0.75);
  root.add(rod);

  const lineStart = new THREE.Vector3(-0.45, 1.6, -1.32);
  const lineEnd = new THREE.Vector3(-0.45, 0.1, -1.85);
  const lineGeom = new THREE.BufferGeometry().setFromPoints([lineStart, lineEnd]);
  const line = new THREE.Line(lineGeom, new THREE.LineBasicMaterial({ color: LINE.color }));
  root.add(line);

  const floatBob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), FLOAT);
  floatBob.position.copy(lineEnd);
  root.add(floatBob);

  const hitProxy = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 2.2, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitProxy.name = "hit-proxy";
  hitProxy.position.y = 1;
  root.add(hitProxy);

  const size = new THREE.Vector3(2.2, 1.9, 3.4);
  const stand = new THREE.Vector3();
  const look = new THREE.Vector3();
  const localStand = new THREE.Vector3(0, 0.19, -0.2);
  const localLook = new THREE.Vector3(0, 0.4, -1.85);

  function refreshAnchors() {
    root.updateMatrixWorld(true);
    stand.copy(root.localToWorld(localStand.clone()));
    stand.y = surfaceY + 0.14;
    look.copy(root.localToWorld(localLook.clone()));
    look.y = surfaceY + 0.1;
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
    floatBob.position.y = lineEnd.y + Math.sin(elapsed * 2.1) * 0.06;
    rod.rotation.z = Math.sin(elapsed * 0.9) * 0.02;
  }

  return { root, size, stand, look, setWorldPosition, setYaw, refreshAnchors, update };
}

import * as THREE from "three";

const STONE = new THREE.MeshStandardMaterial({ color: 0xb8ada0, roughness: 0.9, flatShading: true });
const WOOD = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.9, flatShading: true });
const ROOF = new THREE.MeshStandardMaterial({ color: 0x9c4f3a, roughness: 0.85, flatShading: true });
const GLASS = new THREE.MeshStandardMaterial({ color: 0xf7e8bd, emissive: 0xc9973f, emissiveIntensity: 0.2, roughness: 0.5 });
const FLAG = new THREE.MeshStandardMaterial({ color: 0xcf4f42, roughness: 0.8, side: THREE.DoubleSide });
const DOOR = new THREE.MeshStandardMaterial({ color: 0x5f3d25, roughness: 0.95, flatShading: true });
const GRASS = new THREE.MeshStandardMaterial({ color: 0x86a854, roughness: 1, flatShading: true });

export function createTownHall(surfaceY) {
  const root = new THREE.Group();
  root.name = "town-hall";

  const ground = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.3, 0.09, 10), GRASS);
  ground.position.y = 0.045;
  root.add(ground);

  // main block + gabled roof
  const hall = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.5, 1.9), STONE);
  hall.position.y = 0.84;
  hall.castShadow = true;
  root.add(hall);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.0, 0.9, 4), ROOF);
  roof.position.y = 2.0;
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.15, 1, 0.86);
  roof.castShadow = true;
  root.add(roof);

  // bell tower
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.7), STONE);
  tower.position.set(0.75, 2.55, 0);
  tower.castShadow = true;
  root.add(tower);
  const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.5, 4), ROOF);
  towerRoof.position.set(0.75, 3.3, 0);
  towerRoof.rotation.y = Math.PI / 4;
  root.add(towerRoof);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), GLASS);
  bell.position.set(0.75, 2.4, 0);
  root.add(bell);

  // door + windows
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.06), DOOR);
  door.position.set(0, 0.47, 0.98);
  root.add(door);
  for (const x of [-0.85, 0.85]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.4, 0.05), GLASS);
    win.position.set(x, 1.05, 0.97);
    root.add(win);
  }
  // flag pole on the roof ridge
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 5), WOOD);
  pole.position.set(-0.7, 2.7, 0);
  root.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.28), FLAG);
  flag.position.set(-0.44, 2.92, 0);
  root.add(flag);

  const hitProxy = new THREE.Mesh(
    new THREE.CylinderGeometry(2.0, 2.0, 2.8, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitProxy.name = "hit-proxy";
  hitProxy.position.y = 1.3;
  root.add(hitProxy);

  const size = new THREE.Vector3(4.4, 3.4, 3.8);
  const stand = new THREE.Vector3();
  const look = new THREE.Vector3();
  const localStand = new THREE.Vector3(0, 0, 1.9);
  const localLook = new THREE.Vector3(0, 0.9, 0.8);

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
    flag.rotation.y = Math.sin(elapsed * 2.2) * 0.22;
    bell.position.y = 2.4 + Math.sin(elapsed * 3.0) * 0.02;
  }
  return { root, size, stand, look, setWorldPosition, setYaw, refreshAnchors, update };
}

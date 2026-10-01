import * as THREE from "three";

const WOOD = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.9, flatShading: true });
const WOOD_LIGHT = new THREE.MeshStandardMaterial({ color: 0xb08448, roughness: 0.85, flatShading: true });
const STRAW = new THREE.MeshStandardMaterial({ color: 0xd9b95c, roughness: 1, flatShading: true });
const GRASS = new THREE.MeshStandardMaterial({ color: 0x86a854, roughness: 1, flatShading: true });
const HONEY = new THREE.MeshStandardMaterial({
  color: 0xf2b437,
  emissive: 0xb5760e,
  emissiveIntensity: 0.25,
  roughness: 0.6,
  flatShading: true,
});
const BEE_BODY = new THREE.MeshStandardMaterial({ color: 0xf5c542, roughness: 0.7, flatShading: true });
const BEE_DARK = new THREE.MeshStandardMaterial({ color: 0x3a2c1a, roughness: 0.8, flatShading: true });
const WING = new THREE.MeshStandardMaterial({
  color: 0xeef4f8,
  transparent: true,
  opacity: 0.55,
  roughness: 0.4,
});

function makeBee() {
  const bee = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 5), BEE_BODY);
  body.scale.set(1.25, 0.8, 0.8);
  bee.add(body);
  const stripe = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), BEE_DARK);
  stripe.scale.set(0.9, 0.75, 0.9);
  stripe.position.x = -0.015;
  bee.add(stripe);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.035), WING);
    wing.position.set(0, 0.045, side * 0.03);
    wing.rotation.y = side * 0.4;
    bee.add(wing);
  }
  return bee;
}

export function createApiary(surfaceY) {
  const root = new THREE.Group();
  root.name = "apiary";

  const ground = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.55, 0.09, 10), GRASS);
  ground.position.y = 0.045;
  root.add(ground);

  const stand1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.5), WOOD);
  stand1.position.set(-0.3, 0.42, 0);
  stand1.castShadow = true;
  root.add(stand1);
  for (const [x, z] of [[-0.62, -0.18], [0.02, -0.18], [-0.62, 0.18], [0.02, 0.18]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), WOOD);
    leg.position.set(x, 0.22, z);
    root.add(leg);
  }
  for (let i = 0; i < 2; i += 1) {
    const hive = new THREE.Group();
    const box = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.34, 8), STRAW);
    box.castShadow = true;
    hive.add(box);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.16, 8), WOOD_LIGHT);
    cap.position.y = 0.25;
    hive.add(cap);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.02), WOOD);
    slot.position.set(0, -0.05, 0.3);
    hive.add(slot);
    hive.position.set(-0.45 + i * 0.5, 0.62, 0);
    hive.rotation.y = i * 0.5;
    root.add(hive);
  }

  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.22, 8), HONEY);
  jar.position.set(0.6, 0.2, 0.35);
  jar.castShadow = true;
  root.add(jar);

  const flowers = new THREE.Group();
  for (let i = 0; i < 7; i += 1) {
    const angle = (i / 7) * Math.PI * 2 + 0.3;
    const f = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 5),
      new THREE.MeshStandardMaterial({
        color: [0xf26d7f, 0xffffff, 0xffd166][i % 3],
        roughness: 0.8,
        flatShading: true,
      }),
    );
    f.position.set(Math.cos(angle) * (0.9 + (i % 2) * 0.3), 0.16, Math.sin(angle) * (0.9 + (i % 2) * 0.3));
    flowers.add(f);
  }
  root.add(flowers);

  const bees = [];
  for (let i = 0; i < 4; i += 1) {
    const bee = makeBee();
    bee.userData.seed = i * 1.7;
    root.add(bee);
    bees.push(bee);
  }

  const hitProxy = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.4, 1.8, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitProxy.name = "hit-proxy";
  hitProxy.position.y = 0.85;
  root.add(hitProxy);

  const size = new THREE.Vector3(2.9, 1.7, 2.9);
  const stand = new THREE.Vector3();
  const look = new THREE.Vector3();
  const localStand = new THREE.Vector3(-0.3, 0, 1.5);
  const localLook = new THREE.Vector3(-0.2, 0.6, 0);

  function refreshAnchors() {
    root.updateMatrixWorld(true);
    stand.copy(root.localToWorld(localStand.clone()));
    stand.y = surfaceY;
    look.copy(root.localToWorld(localLook.clone()));
    look.y = surfaceY + 0.5;
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
    bees.forEach((bee) => {
      const t = elapsed * 2.2 + bee.userData.seed;
      bee.position.set(
        -0.25 + Math.sin(t) * 0.75 + Math.sin(t * 2.7) * 0.15,
        0.85 + Math.sin(t * 1.6) * 0.28,
        Math.cos(t * 0.9) * 0.7,
      );
      bee.rotation.y = -t;
    });
  }

  return { root, size, stand, look, setWorldPosition, setYaw, refreshAnchors, update };
}

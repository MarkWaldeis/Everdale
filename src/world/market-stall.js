import * as THREE from "three";

const WOOD = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.9, flatShading: true });
const WOOD_DARK = new THREE.MeshStandardMaterial({ color: 0x6f4527, roughness: 0.9, flatShading: true });
const AWNING_A = new THREE.MeshStandardMaterial({ color: 0xd9503f, roughness: 0.85, flatShading: true });
const AWNING_B = new THREE.MeshStandardMaterial({ color: 0xf2ede0, roughness: 0.85, flatShading: true });
const GRASS = new THREE.MeshStandardMaterial({ color: 0x86a854, roughness: 1, flatShading: true });
const GOLD = new THREE.MeshStandardMaterial({
  color: 0xf2c14e,
  emissive: 0xa8720e,
  emissiveIntensity: 0.3,
  roughness: 0.4,
  metalness: 0.6,
  flatShading: true,
});
const CRATE = new THREE.MeshStandardMaterial({ color: 0xa5793f, roughness: 0.95, flatShading: true });
const GOODS = new THREE.MeshStandardMaterial({ color: 0xe0a04a, roughness: 0.9, flatShading: true });

export function createMarketStall(surfaceY) {
  const root = new THREE.Group();
  root.name = "market-stall";

  const ground = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.8, 0.09, 10), GRASS);
  ground.position.y = 0.045;
  root.add(ground);

  // counter
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 0.6), WOOD);
  counter.position.set(0, 0.42, 0.35);
  counter.castShadow = true;
  root.add(counter);

  // posts + striped awning
  for (const x of [-0.85, 0.85]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.9, 6), WOOD_DARK);
    post.position.set(x, 0.95, -0.1);
    root.add(post);
  }
  const roof = new THREE.Group();
  for (let i = 0; i < 5; i += 1) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.05, 1.1),
      i % 2 ? AWNING_B : AWNING_A,
    );
    stripe.position.set(-0.88 + i * 0.44, 0, 0);
    roof.add(stripe);
  }
  roof.position.set(0, 1.95, 0.1);
  roof.rotation.x = -0.16;
  roof.castShadow = true;
  root.add(roof);

  // goods crates behind
  for (let i = 0; i < 2; i += 1) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.5), CRATE);
    crate.position.set(-0.6 + i * 0.55, 0.26, -0.55);
    crate.rotation.y = i * 0.3;
    crate.castShadow = true;
    root.add(crate);
    const goods = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), GOODS);
    goods.position.set(crate.position.x, 0.5, -0.55);
    root.add(goods);
  }

  // scale + coin purse on the counter
  const scale = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.03), GOLD);
  scale.add(beam);
  for (const x of [-0.22, 0.22]) {
    const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.03, 7), GOLD);
    pan.position.set(x, -0.09, 0);
    scale.add(pan);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 4), GOLD);
    chain.position.set(x, -0.045, 0);
    scale.add(chain);
  }
  scale.position.set(0.45, 0.85, 0.35);
  root.add(scale);
  const purse = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 6), GOLD);
  purse.scale.set(1, 0.8, 1);
  purse.position.set(-0.4, 0.78, 0.35);
  root.add(purse);

  const hitProxy = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 2.1, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitProxy.name = "hit-proxy";
  hitProxy.position.y = 0.95;
  root.add(hitProxy);

  const size = new THREE.Vector3(3.4, 2.1, 2.6);
  const stand = new THREE.Vector3();
  const look = new THREE.Vector3();
  const localStand = new THREE.Vector3(0, 0, -0.75);
  const localLook = new THREE.Vector3(0, 0.7, 0.35);

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
    scale.rotation.z = Math.sin(elapsed * 1.4) * 0.12;
  }

  return { root, size, stand, look, setWorldPosition, setYaw, refreshAnchors, update };
}

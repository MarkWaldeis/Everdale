import * as THREE from "three";

const WOOD = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.9, flatShading: true });
const WOOD_DARK = new THREE.MeshStandardMaterial({ color: 0x6f4527, roughness: 0.95, flatShading: true });
const ROOF = new THREE.MeshStandardMaterial({ color: 0xb4552f, roughness: 0.85, flatShading: true });
const HAY = new THREE.MeshStandardMaterial({ color: 0xd9b64a, roughness: 1, flatShading: true });
const BODY = new THREE.MeshStandardMaterial({ color: 0xf5efe2, roughness: 0.85, flatShading: true });
const COMB = new THREE.MeshStandardMaterial({ color: 0xd64533, roughness: 0.6, flatShading: true });
const BEAK = new THREE.MeshStandardMaterial({ color: 0xe8a33a, roughness: 0.7, flatShading: true });

function createChicken(seed, tint) {
  const hen = new THREE.Group();
  const bodyMat = tint
    ? new THREE.MeshStandardMaterial({ color: tint, roughness: 0.85, flatShading: true })
    : BODY;

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), bodyMat);
  body.scale.set(1, 0.95, 1.25);
  body.position.y = 0.2;
  body.castShadow = true;
  hen.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 5), bodyMat);
  head.position.set(0, 0.38, 0.16);
  hen.add(head);

  const comb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.1), COMB);
  comb.position.set(0, 0.47, 0.15);
  hen.add(comb);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 5), BEAK);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.37, 0.27);
  hen.add(beak);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 6), bodyMat);
  tail.rotation.x = -Math.PI / 3;
  tail.position.set(0, 0.3, -0.19);
  hen.add(tail);

  hen.userData.seed = seed;
  return hen;
}

export function createChickenCoop(surfaceY) {
  const root = new THREE.Group();
  root.name = "chicken-coop";

  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.6, 0.08, 10),
    new THREE.MeshStandardMaterial({ color: 0x8aa457, roughness: 1, flatShading: true }),
  );
  ground.position.y = 0.04;
  root.add(ground);

  const coop = new THREE.Group();
  const hut = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.7), WOOD);
  hut.position.y = 0.3;
  hut.castShadow = true;
  coop.add(hut);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.4, 4), ROOF);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 0.82;
  roof.castShadow = true;
  coop.add(roof);
  const door = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 8), WOOD_DARK);
  door.rotation.x = Math.PI / 2;
  door.position.set(0, 0.22, 0.36);
  coop.add(door);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.5), WOOD_DARK);
  ramp.rotation.x = 0.5;
  ramp.position.set(0, 0.06, 0.55);
  coop.add(ramp);
  coop.position.set(-0.5, 0, -0.45);
  coop.rotation.y = 0.6;
  root.add(coop);

  const nest = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.12, 7), HAY);
  nest.position.set(0.55, 0.12, 0.35);
  root.add(nest);
  for (let i = 0; i < 2; i += 1) {
    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), BODY);
    egg.scale.y = 1.25;
    egg.position.set(0.5 + i * 0.1, 0.22, 0.35 + i * 0.03);
    root.add(egg);
  }

  const postPositions = [];
  for (let i = 0; i < 7; i += 1) {
    const angle = (i / 7) * Math.PI * 1.6 - 0.4;
    postPositions.push([Math.cos(angle) * 1.35, Math.sin(angle) * 1.25]);
  }
  postPositions.forEach(([x, z]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.42, 5), WOOD_DARK);
    post.position.set(x, 0.25, z);
    post.castShadow = true;
    root.add(post);
  });
  for (let i = 0; i < postPositions.length - 1; i += 1) {
    const [x1, z1] = postPositions[i];
    const [x2, z2] = postPositions[i + 1];
    const mid = new THREE.Vector3((x1 + x2) / 2, 0.3, (z1 + z2) / 2);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, Math.hypot(x2 - x1, z2 - z1)), WOOD);
    rail.position.copy(mid);
    rail.rotation.y = Math.atan2(x2 - x1, z2 - z1);
    root.add(rail);
  }

  const chickens = [
    createChicken(1, 0xf5efe2),
    createChicken(2, 0xd9c8a8),
    createChicken(3, 0x8a5a33),
  ];
  chickens[0].position.set(0.35, 0, -0.5);
  chickens[1].position.set(0.7, 0, 0.05);
  chickens[2].position.set(-0.2, 0, 0.65);
  chickens.forEach((hen) => root.add(hen));

  const hitProxy = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.4, 1.8, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitProxy.name = "hit-proxy";
  hitProxy.position.y = 0.8;
  root.add(hitProxy);

  const size = new THREE.Vector3(3, 1.9, 3);
  const stand = new THREE.Vector3();
  const look = new THREE.Vector3();
  const localStand = new THREE.Vector3(0, 0.05, -1.9);
  const localLook = new THREE.Vector3(0, 0.4, 0);

  function refreshAnchors() {
    root.updateMatrixWorld(true);
    stand.copy(root.localToWorld(localStand.clone()));
    stand.y = surfaceY;
    look.copy(root.localToWorld(localLook.clone()));
    look.y = surfaceY + 0.4;
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
    chickens.forEach((hen, i) => {
      const peck = Math.max(Math.sin(elapsed * 1.6 + i * 2.3), 0) ** 6;
      hen.rotation.x = peck * 0.5;
      hen.rotation.y += Math.sin(elapsed * 0.4 + i) * 0.001;
      hen.position.y = Math.abs(Math.sin(elapsed * 2.2 + i * 1.7)) * 0.02;
    });
  }

  return { root, size, stand, look, setWorldPosition, setYaw, refreshAnchors, update };
}

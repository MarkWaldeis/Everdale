import * as THREE from "three";

const WOOD = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.9, flatShading: true });
const WOOD_DARK = new THREE.MeshStandardMaterial({ color: 0x6f4527, roughness: 0.95, flatShading: true });
const ROOF = new THREE.MeshStandardMaterial({ color: 0xb4552f, roughness: 0.85, flatShading: true });
const HAY = new THREE.MeshStandardMaterial({ color: 0xd9b64a, roughness: 1, flatShading: true });
const WHITE = new THREE.MeshStandardMaterial({ color: 0xf5efe2, roughness: 0.85, flatShading: true });
const BROWN = new THREE.MeshStandardMaterial({ color: 0x7a4a28, roughness: 0.9, flatShading: true });
const PINK = new THREE.MeshStandardMaterial({ color: 0xe8b8a0, roughness: 0.85, flatShading: true });

function createCow(seed, spot) {
  const cow = new THREE.Group();
  const hide = spot ? WHITE : BROWN;
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), hide);
  body.scale.set(1.35, 0.85, 0.8);
  body.position.y = 0.42;
  body.castShadow = true;
  cow.add(body);
  if (spot) {
    [[0.18, 0.5, 0.22], [-0.12, 0.56, -0.24], [0.02, 0.3, 0.3]].forEach(([x, y, z]) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), BROWN);
      s.scale.set(1.4, 0.7, 0.5);
      s.position.set(x, y, z);
      cow.add(s);
    });
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), hide);
  head.scale.set(1.1, 0.9, 0.9);
  head.position.set(0.5, 0.52, 0);
  cow.add(head);
  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.16), PINK);
  muzzle.position.set(0.62, 0.44, 0);
  cow.add(muzzle);
  [-0.12, 0.12].forEach((z) => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.14, 5), WOOD_DARK);
    horn.rotation.z = -0.4;
    horn.position.set(0.5, 0.68, z);
    cow.add(horn);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), hide);
    ear.scale.set(1.4, 0.7, 0.5);
    ear.position.set(0.42, 0.6, z * 1.6);
    cow.add(ear);
  });
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.3, 3, 5), hide);
  tail.position.set(-0.45, 0.5, 0);
  tail.rotation.z = 0.5;
  cow.add(tail);
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), BROWN);
  tuft.position.set(-0.57, 0.33, 0);
  cow.add(tuft);
  [[0.2, 0.14], [0.2, -0.14], [-0.24, 0.14], [-0.24, -0.14]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.34, 5), hide);
    leg.position.set(x, 0.17, z);
    cow.add(leg);
  });
  cow.userData = { seed, head, tail };
  return cow;
}

export function createCowPasture(surfaceY) {
  const root = new THREE.Group();
  root.name = "cow-pasture";

  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(1.7, 1.8, 0.08, 10),
    new THREE.MeshStandardMaterial({ color: 0x8aa457, roughness: 1, flatShading: true }),
  );
  ground.position.y = 0.04;
  root.add(ground);

  const barn = new THREE.Group();
  const hut = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.75), WOOD);
  hut.position.y = 0.35;
  hut.castShadow = true;
  barn.add(hut);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.45, 4), ROOF);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 0.92;
  roof.castShadow = true;
  barn.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.04), WOOD_DARK);
  door.position.set(0, 0.2, 0.39);
  barn.add(door);
  barn.position.set(-0.6, 0, -0.55);
  barn.rotation.y = 0.7;
  root.add(barn);

  const trough = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.14, 0.26), WOOD_DARK);
  trough.position.set(0.55, 0.1, 0.5);
  root.add(trough);
  const hayInside = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.18), HAY);
  hayInside.position.set(0.55, 0.17, 0.5);
  root.add(hayInside);
  const hayBale = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8), HAY);
  hayBale.rotation.z = Math.PI / 2;
  hayBale.position.set(-0.15, 0.2, 0.7);
  root.add(hayBale);

  const postPositions = [];
  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 9) * Math.PI * 1.75 - 0.5;
    postPositions.push([Math.cos(angle) * 1.55, Math.sin(angle) * 1.45]);
  }
  postPositions.forEach(([x, z]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.5, 5), WOOD_DARK);
    post.position.set(x, 0.28, z);
    post.castShadow = true;
    root.add(post);
  });
  for (let i = 0; i < postPositions.length - 1; i += 1) {
    const [x1, z1] = postPositions[i];
    const [x2, z2] = postPositions[i + 1];
    const mid = new THREE.Vector3((x1 + x2) / 2, 0.35, (z1 + z2) / 2);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, Math.hypot(x2 - x1, z2 - z1)), WOOD);
    rail.position.copy(mid);
    rail.rotation.y = Math.atan2(x2 - x1, z2 - z1);
    root.add(rail);
  }

  const cows = [createCow(1, true), createCow(2, false)];
  cows[0].position.set(0.4, 0, -0.35);
  cows[0].rotation.y = -0.7;
  cows[1].position.set(-0.35, 0, 0.35);
  cows[1].rotation.y = 2.4;
  cows.forEach((cow) => root.add(cow));

  const hitProxy = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 1.9, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitProxy.name = "hit-proxy";
  hitProxy.position.y = 0.9;
  root.add(hitProxy);

  const size = new THREE.Vector3(3.4, 2.0, 3.4);
  const stand = new THREE.Vector3();
  const look = new THREE.Vector3();
  const localStand = new THREE.Vector3(0, 0.05, -2.0);
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
    cows.forEach((cow, i) => {
      // grazing: head dips down periodically, tail flicks
      const graze = Math.max(Math.sin(elapsed * 0.5 + cow.userData.seed * 2.1), 0) ** 3;
      cow.userData.head.position.y = 0.52 - graze * 0.22;
      cow.userData.head.position.x = 0.5 + graze * 0.06;
      cow.userData.tail.rotation.y = Math.sin(elapsed * 3 + i * 4) * 0.4;
      cow.position.y = Math.abs(Math.sin(elapsed * 1.4 + i * 2.2)) * 0.015;
      cow.rotation.y += Math.sin(elapsed * 0.2 + i) * 0.0008;
    });
  }

  return { root, size, stand, look, setWorldPosition, setYaw, refreshAnchors, update };
}

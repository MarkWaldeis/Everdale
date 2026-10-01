import * as THREE from "three";

const PEN_POSITION = new THREE.Vector3(6.8, 0, -7.2);
const PEN_YAW = 0.3;
const PEN_RADIUS = 1.35;

const WOOD = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.92, flatShading: true });
const WOOD_DARK = new THREE.MeshStandardMaterial({ color: 0x6b4225, roughness: 0.95, flatShading: true });
const WOOL = new THREE.MeshStandardMaterial({ color: 0xf2ede2, roughness: 1, flatShading: true });
const FACE = new THREE.MeshStandardMaterial({ color: 0x4a3b30, roughness: 0.9, flatShading: true });
const GRASS = new THREE.MeshStandardMaterial({ color: 0x7fa653, roughness: 1, flatShading: true });

function createSheep() {
  const sheep = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 7), WOOL);
  body.scale.set(1.25, 1, 0.95);
  body.position.y = 0.3;
  body.castShadow = true;
  sheep.add(body);

  const puff = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), WOOL);
  puff.position.set(0, 0.46, 0);
  sheep.add(puff);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 6), FACE);
  head.position.set(0.28, 0.33, 0);
  head.castShadow = true;
  sheep.add(head);

  const earGeo = new THREE.SphereGeometry(0.045, 5, 4);
  earGeo.scale(1, 0.6, 0.4);
  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(earGeo, FACE);
    ear.position.set(0.28, 0.42, side * 0.09);
    sheep.add(ear);
  });

  const legGeo = new THREE.CylinderGeometry(0.03, 0.035, 0.22, 5);
  [
    [0.14, 0.1],
    [0.14, -0.1],
    [-0.14, 0.1],
    [-0.14, -0.1],
  ].forEach(([x, z]) => {
    const leg = new THREE.Mesh(legGeo, FACE);
    leg.position.set(x, 0.11, z);
    sheep.add(leg);
  });
  return sheep;
}

export function createSheepPen(surfaceY) {
  const root = new THREE.Group();
  root.name = "sheep-pen";
  root.position.set(PEN_POSITION.x, surfaceY, PEN_POSITION.z);
  root.rotation.y = PEN_YAW;

  const ground = new THREE.Mesh(new THREE.CylinderGeometry(PEN_RADIUS, PEN_RADIUS + 0.08, 0.1, 20), GRASS);
  ground.position.y = 0.01;
  ground.receiveShadow = true;
  root.add(ground);

  const posts = 9;
  for (let i = 0; i < posts; i += 1) {
    const angle = (i / posts) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.5, 5), WOOD_DARK);
    post.position.set(Math.cos(angle) * PEN_RADIUS, 0.3, Math.sin(angle) * PEN_RADIUS);
    post.castShadow = true;
    root.add(post);
  }
  [0.22, 0.42].forEach((height) => {
    const rail = new THREE.Mesh(new THREE.TorusGeometry(PEN_RADIUS, 0.028, 5, 28), WOOD);
    rail.rotation.x = Math.PI / 2;
    rail.position.y = height;
    root.add(rail);
  });

  const trough = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.22), WOOD_DARK);
  trough.position.set(-0.85, 0.12, 0.4);
  trough.rotation.y = 0.4;
  trough.castShadow = true;
  root.add(trough);
  const hay = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 7, 5),
    new THREE.MeshStandardMaterial({ color: 0xd9b75c, roughness: 1, flatShading: true }),
  );
  hay.scale.set(1.3, 0.6, 0.7);
  hay.position.set(-0.85, 0.2, 0.4);
  hay.rotation.y = 0.4;
  root.add(hay);

  const sheep = [];
  const spots = [
    [0.45, -0.45, 0.6],
    [-0.3, -0.65, -0.9],
    [0.15, 0.55, 2.4],
  ];
  spots.forEach(([x, z, yaw], i) => {
    const lamb = createSheep();
    lamb.position.set(x, 0.05, z);
    lamb.rotation.y = yaw;
    lamb.userData.phase = i * 1.7;
    sheep.push(lamb);
    root.add(lamb);
  });

  const hitProxy = new THREE.Mesh(
    new THREE.CylinderGeometry(PEN_RADIUS + 0.3, PEN_RADIUS + 0.3, 1.3, 10),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitProxy.name = "hit-proxy";
  hitProxy.position.y = 0.65;
  root.add(hitProxy);

  root.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  center.y = surfaceY + 0.5;

  const stand = new THREE.Vector3(
    root.position.x,
    surfaceY,
    root.position.z + Math.max(size.z * 0.5, 1.4) + 0.6,
  );
  const look = center.clone();
  const localStand = root.worldToLocal(stand.clone());
  const localLook = root.worldToLocal(look.clone());

  function refreshAnchors() {
    root.updateWorldMatrix(true, true);
    stand.copy(root.localToWorld(localStand.clone()));
    stand.y = surfaceY;
    look.copy(root.localToWorld(localLook.clone()));
    look.y = surfaceY + 0.5;
  }
  refreshAnchors();

  function setWorldPosition(x, z) {
    root.position.x = x;
    root.position.y = surfaceY;
    root.position.z = z;
    refreshAnchors();
  }

  function setYaw(yaw) {
    root.rotation.y = yaw;
    refreshAnchors();
  }

  function update(delta, elapsed) {
    sheep.forEach((lamb) => {
      const phase = elapsed * 1.6 + lamb.userData.phase;
      lamb.position.y = 0.05 + Math.max(0, Math.sin(phase * 0.6)) * 0.02;
      const graze = Math.sin(phase);
      lamb.rotation.x = graze > 0.4 ? 0.22 : 0;
      lamb.children[2].position.y = graze > 0.4 ? 0.2 : 0.33;
    });
  }

  return { root, size, stand, look, setWorldPosition, setYaw, refreshAnchors, update };
}

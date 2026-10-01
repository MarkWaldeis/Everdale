import * as THREE from "three";

const TREE_POSITION = new THREE.Vector3(-8.6, 0, 6.6);
const TREE_YAW = 0.7;

const TRUNK = new THREE.MeshStandardMaterial({ color: 0x6f4a2a, roughness: 0.95, flatShading: true });
const LEAF = new THREE.MeshStandardMaterial({ color: 0x5f8f3e, roughness: 1, flatShading: true });
const LEAF_DARK = new THREE.MeshStandardMaterial({ color: 0x4e7a33, roughness: 1, flatShading: true });
const APPLE = new THREE.MeshStandardMaterial({ color: 0xd64533, roughness: 0.55, flatShading: true });
const SOIL = new THREE.MeshStandardMaterial({ color: 0x6d4a2e, roughness: 1, flatShading: true });

export function createAppleTree(surfaceY) {
  const root = new THREE.Group();
  root.name = "apple-tree";
  root.position.set(TREE_POSITION.x, surfaceY, TREE_POSITION.z);
  root.rotation.y = TREE_YAW;

  const mound = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.12, 12), SOIL);
  mound.position.y = 0.03;
  mound.receiveShadow = true;
  root.add(mound);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.15, 7), TRUNK);
  trunk.position.y = 0.62;
  trunk.castShadow = true;
  root.add(trunk);

  const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.7, 5), TRUNK);
  branch.position.set(0.28, 1.28, 0.1);
  branch.rotation.z = -0.7;
  branch.castShadow = true;
  root.add(branch);

  const canopy = new THREE.Group();
  [
    [0, 1.72, 0, 0.62, LEAF],
    [0.42, 1.55, 0.18, 0.44, LEAF_DARK],
    [-0.4, 1.58, -0.12, 0.46, LEAF],
    [0.1, 1.95, -0.1, 0.4, LEAF],
  ].forEach(([x, y, z, r, mat]) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 9, 7), mat);
    puff.position.set(x, y, z);
    puff.castShadow = true;
    canopy.add(puff);
  });
  root.add(canopy);

  const apples = [];
  const appleGeo = new THREE.SphereGeometry(0.07, 6, 5);
  const spots = [
    [0.55, 1.5, 0.3],
    [-0.5, 1.45, 0.15],
    [0.15, 1.95, 0.42],
    [-0.2, 1.7, -0.55],
    [0.45, 1.75, -0.3],
    [0, 1.35, 0.5],
    [-0.55, 1.75, -0.1],
    [0.3, 2.1, 0],
  ];
  spots.forEach(([x, y, z]) => {
    const apple = new THREE.Mesh(appleGeo, APPLE);
    apple.position.set(x, y, z);
    apple.castShadow = true;
    apples.push(apple);
    canopy.add(apple);
  });

  const hitProxy = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.1, 2.4, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitProxy.name = "hit-proxy";
  hitProxy.position.y = 1.2;
  root.add(hitProxy);

  root.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  center.y = surfaceY + 1.1;

  const stand = new THREE.Vector3(
    root.position.x,
    surfaceY,
    root.position.z + Math.max(size.z * 0.5, 0.9) + 0.6,
  );
  const look = center.clone();
  const localStand = root.worldToLocal(stand.clone());
  const localLook = root.worldToLocal(look.clone());

  function refreshAnchors() {
    root.updateWorldMatrix(true, true);
    stand.copy(root.localToWorld(localStand.clone()));
    stand.y = surfaceY;
    look.copy(root.localToWorld(localLook.clone()));
    look.y = surfaceY + 1.1;
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
    canopy.rotation.z = Math.sin(elapsed * 0.9) * 0.015;
    canopy.rotation.x = Math.cos(elapsed * 0.7) * 0.012;
  }

  return { root, size, stand, look, setWorldPosition, setYaw, refreshAnchors, update };
}

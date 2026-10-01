import * as THREE from "three";

const LEAF = new THREE.MeshStandardMaterial({ color: 0x4a7d35, roughness: 0.9, flatShading: true });
const LEAF_DARK = new THREE.MeshStandardMaterial({ color: 0x3a6428, roughness: 0.95, flatShading: true });
const BERRY = new THREE.MeshStandardMaterial({
  color: 0x5b2d8f,
  roughness: 0.55,
  flatShading: true,
  emissive: 0x1a0a30,
  emissiveIntensity: 0.3,
});
const TWIG = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.9, flatShading: true });

function createBush(scale, seed) {
  const bush = new THREE.Group();
  const rand = (i, a = 1) => ((Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1) * a;

  for (let i = 0; i < 3; i += 1) {
    const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.5, 5), TWIG);
    twig.position.set(rand(i, 0.3) - 0.15, 0.22, rand(i + 7, 0.3) - 0.15);
    twig.rotation.z = rand(i + 3, 0.7) - 0.35;
    twig.castShadow = true;
    bush.add(twig);
  }

  for (let i = 0; i < 5; i += 1) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 + rand(i, 0.1), 1), i % 2 ? LEAF : LEAF_DARK);
    puff.position.set(rand(i, 0.62) - 0.31, 0.42 + rand(i + 5, 0.3), rand(i + 11, 0.62) - 0.31);
    puff.scale.y = 0.8;
    puff.castShadow = true;
    bush.add(puff);
  }

  for (let i = 0; i < 14; i += 1) {
    const berry = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), BERRY);
    const angle = rand(i, Math.PI * 2);
    const height = 0.35 + rand(i + 4, 0.45);
    const spread = 0.34 + rand(i + 9, 0.18);
    berry.position.set(Math.cos(angle) * spread * rand(i + 2, 1), height, Math.sin(angle) * spread);
    bush.add(berry);
  }

  bush.scale.setScalar(scale);
  return bush;
}

export function createBerryBush(surfaceY) {
  const root = new THREE.Group();
  root.name = "berry-bush";

  const bushOffsets = [
    [0, 0, 1],
    [-0.62, 0.4, 0.85],
    [0.58, 0.42, 0.8],
  ];
  const bushes = bushOffsets.map(([x, z, s], i) => {
    const bush = createBush(s, i + 1);
    bush.position.set(x, 0, z);
    bush.rotation.y = i * 1.7;
    root.add(bush);
    return bush;
  });

  const mound = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.2, 0.09, 9),
    new THREE.MeshStandardMaterial({ color: 0x7c9a52, roughness: 1, flatShading: true }),
  );
  mound.position.y = 0.045;
  root.add(mound);

  const hitProxy = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 1.6, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitProxy.name = "hit-proxy";
  hitProxy.position.y = 0.7;
  root.add(hitProxy);

  const size = new THREE.Vector3(2.1, 1.6, 1.7);
  const stand = new THREE.Vector3();
  const look = new THREE.Vector3();
  const localStand = new THREE.Vector3(0, 0.05, -1.35);
  const localLook = new THREE.Vector3(0, 0.5, 0);

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
    bushes.forEach((bush, i) => {
      bush.rotation.z = Math.sin(elapsed * 1.1 + i * 1.9) * 0.02;
    });
  }

  return { root, size, stand, look, setWorldPosition, setYaw, refreshAnchors, update };
}

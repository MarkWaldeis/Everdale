import * as THREE from "three";

const PIT_POSITION = new THREE.Vector3(-3.65, 0, 3.85);
const PIT_YAW = 0.28;

export function createClayPit(model, surfaceY) {
  const root = new THREE.Group();
  root.name = "clay-pit";
  root.add(model);
  root.position.set(PIT_POSITION.x, surfaceY, PIT_POSITION.z);
  root.rotation.y = PIT_YAW;
  root.updateWorldMatrix(true, true);

  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());

  const lumps = [];
  root.traverse((child) => {
    if (child.name.startsWith("clay-lump-")) lumps.push(child);
  });
  const rope = root.getObjectByName("hoist-rope");
  const bucket = root.getObjectByName("hoist-bucket");
  const ropeBaseY = rope?.position.y ?? 0.92;
  const bucketBaseY = bucket?.position.y ?? 0.42;

  const stand = new THREE.Vector3(center.x, surfaceY, center.z + Math.max(size.z * 0.52, 0.7) + 0.55);
  const look = center.clone();
  look.y = surfaceY + 0.28;
  const localStand = root.worldToLocal(stand.clone());
  const localLook = root.worldToLocal(look.clone());

  let digging = false;
  let pulse = 0;

  function refreshAnchors() {
    root.updateWorldMatrix(true, true);
    stand.copy(root.localToWorld(localStand.clone()));
    stand.y = surfaceY;
    look.copy(root.localToWorld(localLook.clone()));
    look.y = surfaceY + 0.28;
  }

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

  function containsPoint(worldPoint, margin = 0.22) {
    const local = root.worldToLocal(worldPoint.clone());
    return Math.abs(local.x) <= size.x * 0.5 + margin && Math.abs(local.z) <= size.z * 0.5 + margin;
  }

  function setDigging(value) {
    digging = Boolean(value);
    lumps.forEach((lump, index) => {
      lump.visible = !(digging && index % 3 === 0);
    });
  }

  function impact() {
    pulse = 1;
  }

  function update(delta) {
    if (pulse > 0) pulse = Math.max(0, pulse - delta * 4.4);
    const bob = digging ? Math.sin(performance.now() * 0.008) * 0.03 : 0;
    if (rope) rope.position.y = ropeBaseY + bob + pulse * 0.02;
    if (bucket) bucket.position.y = bucketBaseY + bob + pulse * 0.03;
  }

  return {
    root,
    stand,
    look,
    size,
    surfaceY,
    containsPoint,
    refreshAnchors,
    setWorldPosition,
    setYaw,
    getYaw: () => root.rotation.y,
    setDigging,
    impact,
    update,
  };
}

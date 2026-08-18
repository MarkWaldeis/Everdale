import * as THREE from "three";

const WELL_POSITION = new THREE.Vector3(0.35, 0, 1.05);
const WELL_YAW = 0.15;

export function createWell(model, surfaceY) {
  const root = new THREE.Group();
  root.name = "village-well";
  root.add(model);
  root.position.set(WELL_POSITION.x, surfaceY, WELL_POSITION.z);
  root.rotation.y = WELL_YAW;
  root.updateWorldMatrix(true, true);

  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());

  const idle = new THREE.Vector3(center.x, surfaceY, center.z + Math.max(size.z * 0.72, 0.78));
  const look = center.clone();
  look.y = surfaceY + Math.max(size.y * 0.45, 0.9);
  const localIdle = root.worldToLocal(idle.clone());
  const localLook = root.worldToLocal(look.clone());

  const points = { idle, look, approach: idle };

  function refreshAnchors() {
    root.updateWorldMatrix(true, true);
    idle.copy(root.localToWorld(localIdle.clone()));
    idle.y = surfaceY;
    look.copy(root.localToWorld(localLook.clone()));
    look.y = surfaceY + Math.max(size.y * 0.45, 0.9);
    points.approach = idle;
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

  function containsPoint(worldPoint, margin = 0.2) {
    const local = root.worldToLocal(worldPoint.clone());
    return Math.abs(local.x) <= size.x * 0.5 + margin && Math.abs(local.z) <= size.z * 0.5 + margin;
  }

  return {
    root,
    points,
    stand: idle,
    look,
    size,
    surfaceY,
    containsPoint,
    refreshAnchors,
    setWorldPosition,
    setYaw,
    getYaw: () => root.rotation.y,
  };
}

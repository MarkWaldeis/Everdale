import * as THREE from "three";

const BOARD_POSITION = new THREE.Vector3(4.4, 0, 4.4);
const BOARD_YAW = -0.6;

export function createOrderBoard(model, surfaceY) {
  const root = new THREE.Group();
  root.name = "order-board";
  root.add(model);
  root.position.set(BOARD_POSITION.x, surfaceY, BOARD_POSITION.z);
  root.rotation.y = BOARD_YAW;
  root.updateWorldMatrix(true, true);

  const hitProxy = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 0.95, 2.0, 10),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitProxy.name = "hit-proxy";
  hitProxy.position.y = 1.0;
  root.add(hitProxy);

  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());

  const look = center.clone();
  look.y = surfaceY + Math.max(size.y * 0.5, 0.7);
  const localLook = root.worldToLocal(look.clone());

  function refreshAnchors() {
    root.updateWorldMatrix(true, true);
    look.copy(root.localToWorld(localLook.clone()));
    look.y = surfaceY + Math.max(size.y * 0.5, 0.7);
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

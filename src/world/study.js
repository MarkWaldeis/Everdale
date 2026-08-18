import * as THREE from "three";

const STUDY_POSITION = new THREE.Vector3(2.15, 0, 4.15);
const STUDY_YAW = 0.15;

export function createStudy(model, surfaceY) {
  const root = new THREE.Group();
  root.name = "study";
  root.add(model);
  root.position.set(STUDY_POSITION.x, surfaceY, STUDY_POSITION.z);
  root.userData.groundY = surfaceY;
  root.rotation.y = STUDY_YAW;
  root.updateWorldMatrix(true, true);

  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());

  const stand = new THREE.Vector3(center.x, surfaceY, center.z + Math.max(size.z * 0.55, 0.7) + 0.55);
  const look = center.clone();
  look.y = surfaceY + Math.max(size.y * 0.42, 1.1);
  const localStand = root.worldToLocal(stand.clone());
  const localLook = root.worldToLocal(look.clone());

  const depart = stand.clone().add(new THREE.Vector3(0, 0, 0.7));
  const points = {
    approach: stand,
    stand,
    look,
    inside: center.clone(),
    depart,
  };
  points.inside.y = surfaceY + 0.04;

  function refreshAnchors() {
    root.updateWorldMatrix(true, true);
    stand.copy(root.localToWorld(localStand.clone()));
    stand.y = surfaceY;
    look.copy(root.localToWorld(localLook.clone()));
    look.y = surfaceY + Math.max(size.y * 0.42, 1.1);
    points.approach = stand;
    points.depart.copy(stand).add(new THREE.Vector3(stand.x - center.x, 0, stand.z - center.z).setLength(0.7));
    points.inside.copy(root.localToWorld(new THREE.Vector3(0, 0.04, -0.2)));
    points.inside.y = surfaceY + 0.04;
  }

  function setWorldPosition(x, z) {
    root.position.x = x;
    root.position.y = surfaceY;
    root.userData.groundY = surfaceY;
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

  return {
    root,
    points,
    stand,
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

import * as THREE from "three";

const KITCHEN_POSITION = new THREE.Vector3(6.6, 0, 3.3);
const KITCHEN_YAW = -0.55;

function pointAlong(anchor, forward, distance, height, lateral = 0) {
  const point = anchor.clone().addScaledVector(forward, distance);
  if (lateral !== 0) {
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    point.addScaledVector(right, lateral);
  }
  point.y = height;
  return point;
}

export function createKitchen(model, surfaceY) {
  const root = new THREE.Group();
  root.name = "kitchen";
  root.add(model);
  root.position.set(KITCHEN_POSITION.x, surfaceY, KITCHEN_POSITION.z);
  root.rotation.y = KITCHEN_YAW;
  root.updateWorldMatrix(true, true);

  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const soupMesh = root.getObjectByName("soup-surface");
  const ladle = root.getObjectByName("ladle");
  const soupBase = soupMesh ? soupMesh.position.y : 0.92;
  const soupBaseScale = soupMesh ? soupMesh.scale.clone() : new THREE.Vector3(1, 1, 1);

  const stand = new THREE.Vector3(center.x, surfaceY, center.z + Math.max(size.z * 0.55, 0.55) + 0.85);
  const look = center.clone();
  look.y = surfaceY + Math.max(size.y * 0.42, 0.9);
  const localStand = root.worldToLocal(stand.clone());
  const localLook = root.worldToLocal(look.clone());

  const points = {
    approach: stand,
    stand,
    look,
  };

  let cooking = false;
  let cookTime = 0;

  function refreshAnchors() {
    root.updateWorldMatrix(true, true);
    stand.copy(root.localToWorld(localStand.clone()));
    stand.y = surfaceY;
    look.copy(root.localToWorld(localLook.clone()));
    look.y = surfaceY + Math.max(size.y * 0.42, 0.9);
    points.approach = stand;
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

  function setFill(ratio) {
    if (!soupMesh) return;
    const amount = THREE.MathUtils.clamp(ratio, 0.08, 1);
    soupMesh.scale.set(soupBaseScale.x * (0.72 + amount * 0.28), soupBaseScale.y, soupBaseScale.z * (0.72 + amount * 0.28));
    soupMesh.position.y = soupBase - (1 - amount) * 0.08;
    soupMesh.visible = ratio > 0.001;
  }

  function setCooking(value) {
    cooking = Boolean(value);
    if (!cooking) cookTime = 0;
  }

  function update(delta) {
    if (!cooking) return;
    cookTime += delta;
    if (ladle) ladle.rotation.y = Math.sin(cookTime * 2.4) * 0.35;
    if (soupMesh) {
      soupMesh.position.y = soupBase + Math.sin(cookTime * 3.1) * 0.012;
    }
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
    setFill,
    setCooking,
    update,
  };
}

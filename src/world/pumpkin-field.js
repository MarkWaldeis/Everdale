import * as THREE from "three";

const PATCH_POSITION = new THREE.Vector3(9.9, 0, 0.2);
const PATCH_YAW = 0.35;
const REGROW_SECONDS = 14;

export function createPumpkinField(model, surfaceY) {
  const root = new THREE.Group();
  root.name = "pumpkin-field";
  root.add(model);
  root.position.set(PATCH_POSITION.x, surfaceY, PATCH_POSITION.z);
  root.rotation.y = PATCH_YAW;
  root.updateWorldMatrix(true, true);

  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());

  const fruits = [];
  root.traverse((child) => {
    if (!child.name.endsWith("-fruit")) return;
    fruits.push({
      mesh: child,
      ripe: child.userData.ripe !== false,
      grow: 0,
    });
  });

  const stand = new THREE.Vector3(center.x, surfaceY, center.z + Math.max(size.z * 0.5, 0.5) + 0.8);
  const look = center.clone();
  look.y = surfaceY + 0.35;
  const localStand = root.worldToLocal(stand.clone());
  const localLook = root.worldToLocal(look.clone());

  function refreshAnchors() {
    root.updateWorldMatrix(true, true);
    stand.copy(root.localToWorld(localStand.clone()));
    stand.y = surfaceY;
    look.copy(root.localToWorld(localLook.clone()));
    look.y = surfaceY + 0.35;
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

  function ripeCount() {
    return fruits.filter((fruit) => fruit.ripe && fruit.mesh.visible).length;
  }

  function beginPick() {
    const next = fruits.find((fruit) => fruit.ripe && fruit.mesh.visible);
    if (!next) return false;
    next.mesh.userData.picking = true;
    return true;
  }

  function finishPick() {
    const next = fruits.find((fruit) => fruit.mesh.userData.picking) ?? fruits.find((fruit) => fruit.ripe);
    if (!next) return false;
    next.ripe = false;
    next.grow = 0;
    next.mesh.visible = false;
    next.mesh.userData.picking = false;
    return true;
  }

  function update(delta) {
    fruits.forEach((fruit) => {
      if (fruit.ripe) return;
      fruit.grow += delta;
      if (fruit.grow < REGROW_SECONDS) return;
      fruit.ripe = true;
      fruit.mesh.visible = true;
      fruit.mesh.scale.setScalar(0.2);
    });
    fruits.forEach((fruit) => {
      if (!fruit.ripe || !fruit.mesh.visible) return;
      const current = fruit.mesh.scale.x;
      if (current >= 0.999) return;
      const next = THREE.MathUtils.damp(current, 1, 4.2, delta);
      fruit.mesh.scale.setScalar(next);
    });
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
    ripeCount,
    beginPick,
    finishPick,
    update,
  };
}

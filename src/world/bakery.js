import * as THREE from "three";

const BAKERY_POSITION = new THREE.Vector3(-2.2, 0, 6.6);
const BAKERY_YAW = 0.4;

export function createBakery(model, surfaceY) {
  const root = new THREE.Group();
  root.name = "bakery";
  root.add(model);
  root.position.set(BAKERY_POSITION.x, surfaceY, BAKERY_POSITION.z);
  root.rotation.y = BAKERY_YAW;
  root.updateWorldMatrix(true, true);

  const hitProxy = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.25, 2.2, 10),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitProxy.name = "hit-proxy";
  hitProxy.position.y = 1.1;
  root.add(hitProxy);

  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());

  const look = center.clone();
  look.y = surfaceY + Math.max(size.y * 0.5, 0.7);
  const localLook = root.worldToLocal(look.clone());

  // Back-Station vor dem Ofenmund
  const approach = new THREE.Vector3(root.position.x, surfaceY, root.position.z + 1.7);
  const lookAt = center.clone();
  lookAt.y = surfaceY + size.y * 0.45;

  const barBack = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.14),
    new THREE.MeshBasicMaterial({ color: 0x241b10, transparent: true, opacity: 0.85 }),
  );
  const barFill = new THREE.Mesh(
    new THREE.PlaneGeometry(1.06, 0.12),
    new THREE.MeshBasicMaterial({ color: 0xffd75e }),
  );
  barFill.position.z = 0.001;
  const bar = new THREE.Group();
  bar.name = "bake-bar";
  bar.add(barBack, barFill);
  bar.visible = false;
  root.add(bar);

  function refreshAnchors() {
    root.updateWorldMatrix(true, true);
    look.copy(root.localToWorld(localLook.clone()));
    look.y = surfaceY + Math.max(size.y * 0.5, 0.7);
    bar.position.set(0, size.y + 0.5, 0);
  }
  refreshAnchors();

  function setWorldPosition(x, z) {
    root.position.x = x;
    root.position.y = surfaceY;
    root.position.z = z;
    approach.set(x, surfaceY, z + 1.7);
    refreshAnchors();
  }

  function setYaw(yaw) {
    root.rotation.y = yaw;
    refreshAnchors();
  }

  function setBaking(ratio) {
    const active = ratio !== null && ratio !== undefined;
    bar.visible = active;
    if (active) {
      const clamped = THREE.MathUtils.clamp(ratio, 0, 1);
      barFill.scale.x = Math.max(clamped, 0.001);
      barFill.position.x = -0.53 * (1 - clamped);
    }
  }

  function update(camera) {
    if (bar.visible && camera) {
      const worldPos = bar.getWorldPosition(new THREE.Vector3());
      bar.lookAt(camera.position.x, worldPos.y, camera.position.z);
    }
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
    setBaking,
    update,
    points: { approach, look: lookAt },
    getYaw: () => root.rotation.y,
  };
}

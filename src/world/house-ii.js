import * as THREE from "three";

const HOUSE_POSITION = new THREE.Vector3(0, 0, -4.4);
const HOUSE_YAW = 0.25;

function buildScaffold(size) {
  const group = new THREE.Group();
  group.name = "construction-scaffold";
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x8a6238, roughness: 0.9 });
  const plankMat = new THREE.MeshStandardMaterial({ color: 0xa5793f, roughness: 0.85 });
  const half = Math.max(size.x, size.z) * 0.5 + 0.25;
  const height = Math.max(size.y * 0.6, 1.2);
  const corners = [
    [-half, -half],
    [half, -half],
    [-half, half],
    [half, half],
  ];
  corners.forEach(([x, z]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, height, 6), poleMat);
    pole.position.set(x, height * 0.5, z);
    pole.castShadow = true;
    group.add(pole);
  });
  for (let index = 0; index < 3; index += 1) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 0.1, 0.05, 0.08), plankMat);
    rail.position.set(0, height * (0.3 + index * 0.28), -half);
    rail.castShadow = true;
    group.add(rail);
  }
  const plank = new THREE.Mesh(new THREE.BoxGeometry(half * 1.4, 0.05, 0.32), plankMat);
  plank.position.set(0, height * 0.55, half);
  plank.castShadow = true;
  group.add(plank);
  return group;
}

function buildProgressBar() {
  const group = new THREE.Group();
  group.name = "construction-bar";
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.14),
    new THREE.MeshBasicMaterial({ color: 0x241b10, transparent: true, opacity: 0.85 }),
  );
  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(1.06, 0.12),
    new THREE.MeshBasicMaterial({ color: 0xffd75e }),
  );
  fill.position.z = 0.001;
  group.add(back, fill);
  group.userData.fill = fill;
  return group;
}

export function createHouseIi(model, surfaceY) {
  const root = new THREE.Group();
  root.name = "house-ii";
  root.add(model);
  root.position.set(HOUSE_POSITION.x, surfaceY, HOUSE_POSITION.z);
  root.rotation.y = HOUSE_YAW;
  root.updateWorldMatrix(true, true);

  const hitProxy = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 2.4, 10),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitProxy.name = "hit-proxy";
  hitProxy.position.y = 1.2;
  root.add(hitProxy);

  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());

  const scaffold = buildScaffold(size);
  scaffold.visible = false;
  root.add(scaffold);

  const bar = buildProgressBar();
  bar.visible = false;
  root.add(bar);

  const look = center.clone();
  look.y = surfaceY + Math.max(size.y * 0.5, 0.7);
  const localLook = root.worldToLocal(look.clone());

  function refreshAnchors() {
    root.updateWorldMatrix(true, true);
    look.copy(root.localToWorld(localLook.clone()));
    look.y = surfaceY + Math.max(size.y * 0.5, 0.7);
    bar.position.set(0, size.y + 0.85, 0);
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

  function setConstruction(ratio) {
    const active = ratio !== null && ratio !== undefined;
    scaffold.visible = active;
    bar.visible = active;
    if (active) {
      const fill = bar.userData.fill;
      const clamped = THREE.MathUtils.clamp(ratio, 0, 1);
      fill.scale.x = Math.max(clamped, 0.001);
      fill.position.x = -0.53 * (1 - clamped);
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
    setConstruction,
    update,
    getYaw: () => root.rotation.y,
  };
}

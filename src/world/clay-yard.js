import * as THREE from "three";

const YARD_POSITION = new THREE.Vector3(-6.55, 0, 2.35);
const YARD_YAW = 0.42;
const CLAY_MAX = 20;
const CLAY_PER_LOAD = 5;

export function createClayYard(models, surfaceY) {
  const root = new THREE.Group();
  root.name = "clay-yard";
  root.position.set(YARD_POSITION.x, surfaceY, YARD_POSITION.z);
  root.rotation.y = YARD_YAW;

  const stages = {
    empty: models.empty,
    half: models.half,
    full: models.full ?? models.half,
  };

  Object.entries(stages).forEach(([name, model]) => {
    if (!model) return;
    model.name = `clay-storage-${name}`;
    model.visible = name === "empty";
    root.add(model);
  });

  root.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());

  const standReach = Math.max(size.z * 0.62, 0.42);
  const stand = new THREE.Vector3(center.x, surfaceY, center.z + standReach);
  const look = center.clone();
  look.y = surfaceY + Math.max(size.y * 0.45, 0.28);
  const localStand = root.worldToLocal(stand.clone());
  const localLook = root.worldToLocal(look.clone());

  let clay = 0;

  function stageFor(amount) {
    if (amount >= CLAY_MAX) return "full";
    if (amount >= CLAY_PER_LOAD) return "half";
    return "empty";
  }

  function setClay(amount) {
    clay = THREE.MathUtils.clamp(amount, 0, CLAY_MAX);
    const stage = stageFor(clay);
    Object.entries(stages).forEach(([name, model]) => {
      if (model) model.visible = name === stage;
    });
    return clay;
  }

  function deposit(amount = CLAY_PER_LOAD) {
    return setClay(clay + amount);
  }

  function refreshAnchors() {
    root.updateWorldMatrix(true, true);
    stand.copy(root.localToWorld(localStand.clone()));
    stand.y = surfaceY;
    look.copy(root.localToWorld(localLook.clone()));
    look.y = surfaceY + Math.max(size.y * 0.45, 0.28);
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

  function containsPoint(worldPoint, margin = 0.18) {
    const local = root.worldToLocal(worldPoint.clone());
    return Math.abs(local.x) <= size.x * 0.5 + margin && Math.abs(local.z) <= size.z * 0.5 + margin;
  }

  return {
    root,
    stand,
    look,
    size,
    getClay: () => clay,
    setClay,
    deposit,
    isFull: () => clay >= CLAY_MAX,
    containsPoint,
    refreshAnchors,
    setWorldPosition,
    setYaw,
    getYaw: () => root.rotation.y,
    max: CLAY_MAX,
    perLoad: CLAY_PER_LOAD,
  };
}

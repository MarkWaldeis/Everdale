import * as THREE from "three";

const YARD_POSITION = new THREE.Vector3(4.35, 0, -0.85);
const YARD_YAW = -0.55;
const WOOD_MAX = 20;
const WOOD_PER_TREE = 5;

export function createWoodYard(models, surfaceY) {
  const root = new THREE.Group();
  root.name = "wood-yard";
  root.position.set(YARD_POSITION.x, surfaceY, YARD_POSITION.z);
  root.rotation.y = YARD_YAW;

  const stages = {
    empty: models.empty,
    half: models.half,
    full: models.full ?? models.half,
  };

  Object.entries(stages).forEach(([name, model]) => {
    if (!model) return;
    model.name = `storage-${name}`;
    model.visible = name === "empty";
    root.add(model);
  });

  root.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());

  const stand = new THREE.Vector3(
    center.x - 0.15,
    surfaceY,
    center.z + Math.max(size.z * 0.55, 1.15),
  );
  const look = center.clone();
  look.y = surfaceY + 0.4;
  const localStand = stand.clone().sub(root.position);
  const localLook = look.clone().sub(root.position);

  let wood = 0;

  function stageFor(amount) {
    if (amount >= WOOD_MAX) return "full";
    if (amount >= WOOD_PER_TREE) return "half";
    return "empty";
  }

  function setWood(amount) {
    wood = THREE.MathUtils.clamp(amount, 0, WOOD_MAX);
    const stage = stageFor(wood);
    Object.entries(stages).forEach(([name, model]) => {
      if (model) model.visible = name === stage;
    });
    return wood;
  }

  function deposit(amount = WOOD_PER_TREE) {
    return setWood(wood + amount);
  }

  function refreshAnchors() {
    root.updateWorldMatrix(true, true);
    stand.copy(root.position).add(localStand);
    stand.y = surfaceY;
    look.copy(root.position).add(localLook);
    look.y = surfaceY + 0.4;
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

  function containsPoint(worldPoint, margin = 0.35) {
    const local = root.worldToLocal(worldPoint.clone());
    return Math.abs(local.x) <= size.x * 0.5 + margin && Math.abs(local.z) <= size.z * 0.5 + margin;
  }

  return {
    root,
    stand,
    look,
    size,
    getWood: () => wood,
    setWood,
    deposit,
    containsPoint,
    refreshAnchors,
    setWorldPosition,
    setYaw,
    getYaw: () => root.rotation.y,
    max: WOOD_MAX,
    perTree: WOOD_PER_TREE,
  };
}

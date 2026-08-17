import * as THREE from "three";

const YARD_POSITION = new THREE.Vector3(-6.15, 0, -1.05);
const YARD_YAW = 0.62;
const STONE_MAX = 20;
const STONE_PER_ROCK = 5;

export function createStoneYard(models, surfaceY) {
  const root = new THREE.Group();
  root.name = "stone-yard";
  root.position.set(YARD_POSITION.x, surfaceY, YARD_POSITION.z);
  root.rotation.y = YARD_YAW;

  const stages = {
    empty: models.empty,
    half: models.half,
    full: models.full ?? models.half,
  };

  Object.entries(stages).forEach(([name, model]) => {
    if (!model) return;
    model.name = `stone-storage-${name}`;
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

  let stone = 0;

  function stageFor(amount) {
    if (amount >= STONE_MAX) return "full";
    if (amount >= STONE_PER_ROCK) return "half";
    return "empty";
  }

  function setStone(amount) {
    stone = THREE.MathUtils.clamp(amount, 0, STONE_MAX);
    const stage = stageFor(stone);
    Object.entries(stages).forEach(([name, model]) => {
      if (model) model.visible = name === stage;
    });
    return stone;
  }

  function deposit(amount = STONE_PER_ROCK) {
    return setStone(stone + amount);
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
    getStone: () => stone,
    setStone,
    deposit,
    containsPoint,
    refreshAnchors,
    setWorldPosition,
    setYaw,
    getYaw: () => root.rotation.y,
    max: STONE_MAX,
    perRock: STONE_PER_ROCK,
  };
}

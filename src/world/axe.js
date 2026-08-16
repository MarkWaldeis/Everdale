import * as THREE from "three";

const TARGET_LENGTH = 0.28;
const scratch = {
  box: new THREE.Box3(),
  size: new THREE.Vector3(),
};

function findNamed(root, name) {
  let found = null;
  root.traverse((child) => {
    if (!found && child.name === name) found = child;
  });
  return found;
}

function poseChopKit(chopKit) {
  const clips = chopKit.userData.animationClips ?? [];
  const clip = clips.find((entry) => entry.name === "AN_Girl_ChopTree") ?? clips[0];
  if (!clip) {
    chopKit.updateWorldMatrix(true, true);
    return;
  }
  const mixer = new THREE.AnimationMixer(chopKit);
  const action = mixer.clipAction(clip);
  action.play();
  mixer.setTime(0);
  chopKit.updateWorldMatrix(true, true);
}

function extractHandLocalAxe(chopKit) {
  if (!chopKit) return null;
  poseChopKit(chopKit);
  const hand = findNamed(chopKit, "R_Hand");
  const sourceAxe = findNamed(chopKit, "Lumberjack_Axe");
  if (!hand || !sourceAxe) return null;

  const local = new THREE.Matrix4()
    .copy(hand.matrixWorld)
    .invert()
    .multiply(sourceAxe.matrixWorld);
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  local.decompose(position, quaternion, scale);
  return { position, quaternion, scale, sourceAxe };
}

export function createAxeWielder(model, fallbackAxe, chopKit) {
  const rightHand = model.getObjectByName("R_Hand");
  const grip = new THREE.Group();
  grip.name = "axe-grip";
  grip.visible = false;

  const extracted = extractHandLocalAxe(chopKit);
  const source = extracted?.sourceAxe ?? fallbackAxe;
  const axe = source.clone(true);
  axe.name = "carried-axe";
  axe.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  if (extracted) {
    grip.position.copy(extracted.position);
    grip.quaternion.copy(extracted.quaternion);
    grip.scale.copy(extracted.scale);
    axe.position.set(0, 0, 0);
    axe.quaternion.identity();
    axe.scale.set(1, 1, 1);
  } else {
    axe.position.set(0.014, 0.028, 0.004);
    axe.rotation.set(1.15, 0.05, 0.22);
  }

  grip.add(axe);
  rightHand?.add(grip);

  model.updateWorldMatrix(true, true);
  scratch.box.setFromObject(axe);
  scratch.box.getSize(scratch.size);
  const longest = Math.max(scratch.size.x, scratch.size.y, scratch.size.z, 0.001);
  grip.scale.multiplyScalar(TARGET_LENGTH / longest);

  let drawWeight = 0;

  function setCarried(carried) {
    const wanted = Boolean(carried && rightHand);
    grip.userData.wanted = wanted;
    grip.visible = wanted;
    drawWeight = wanted ? 1 : 0;
  }

  function updateDraw() {
    grip.visible = Boolean(grip.userData.wanted && rightHand);
  }

  return {
    setCarried,
    updateDraw,
    applyCarry: () => {},
    applyChop: () => 0,
    resetSpine: () => {},
    isCarried: () => grip.visible,
    getAxe: () => axe,
  };
}

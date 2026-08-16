import * as THREE from "three";

const TARGET_LENGTH = 0.28;
const scratch = {
  box: new THREE.Box3(),
  size: new THREE.Vector3(),
  center: new THREE.Vector3(),
  worldForward: new THREE.Vector3(),
  localForward: new THREE.Vector3(),
  handWorld: new THREE.Quaternion(),
};

export function createAxeWielder(model, axeModel) {
  const rightHand = model.getObjectByName("R_Hand");
  const grip = new THREE.Group();
  grip.name = "axe-grip";
  grip.visible = false;

  const axe = axeModel.clone(true);
  axe.name = "carried-axe";
  axe.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  // Source axe stands on Y: handle at min.y, blade at max.y.
  scratch.box.setFromObject(axe);
  scratch.box.getCenter(scratch.center);
  axe.position.set(-scratch.center.x, -scratch.box.min.y, -scratch.center.z);
  axe.quaternion.identity();
  grip.add(axe);
  grip.position.set(0.014, 0.028, 0.006);
  rightHand?.add(grip);

  model.updateWorldMatrix(true, true);
  scratch.box.setFromObject(axe);
  scratch.box.getSize(scratch.size);
  const longest = Math.max(scratch.size.x, scratch.size.y, scratch.size.z, 0.001);
  grip.scale.setScalar(TARGET_LENGTH / longest);

  function aimBladeForward(characterRoot) {
    if (!rightHand || !characterRoot) return;
    characterRoot.updateWorldMatrix(true, true);
    rightHand.updateWorldMatrix(true, true);
    scratch.worldForward.set(0, 0, 1).transformDirection(characterRoot.matrixWorld);
    rightHand.getWorldQuaternion(scratch.handWorld);
    scratch.localForward.copy(scratch.worldForward).applyQuaternion(scratch.handWorld.invert());
    if (scratch.localForward.lengthSq() < 0.000001) return;
    scratch.localForward.normalize();
    grip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), scratch.localForward);
  }

  function setCarried(carried, characterRoot) {
    const wanted = Boolean(carried && rightHand);
    grip.userData.wanted = wanted;
    grip.visible = wanted;
    if (wanted && characterRoot) aimBladeForward(characterRoot);
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

import * as THREE from "three";

const TARGET_LENGTH = 0.33;
const scratch = {
  box: new THREE.Box3(),
  size: new THREE.Vector3(),
  center: new THREE.Vector3(),
};

// Wrist bone is at the sleeve; the visible palm sits further along +Y (fingers).
const PALM_LOCAL = new THREE.Vector3(0.004, 0.102, 0.012);

export function createAxeWielder(model, axeModel, options = {}) {
  const targetLength = options.targetLength ?? TARGET_LENGTH;
  const holdAlong = options.holdAlong ?? 0.44;
  const handleAxis = new THREE.Vector3(1, 0, 0);
  if (options.handleAxis) handleAxis.copy(options.handleAxis);
  const rightHand = model.getObjectByName("R_Hand");
  const grip = new THREE.Group();
  grip.name = options.gripName ?? "axe-grip";
  grip.visible = false;

  const axe = axeModel.clone(true);
  axe.name = "carried-axe";
  axe.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  // Fit in isolation so character scale does not leak into the handle length.
  axe.position.set(0, 0, 0);
  axe.quaternion.identity();
  axe.updateMatrixWorld(true);
  scratch.box.setFromObject(axe);
  scratch.box.getCenter(scratch.center);
  scratch.box.getSize(scratch.size);
  axe.position.set(
    -scratch.center.x,
    -scratch.box.min.y - holdAlong * scratch.size.y,
    -scratch.center.z,
  );
  const longest = Math.max(scratch.size.x, scratch.size.y, scratch.size.z, 0.001);
  grip.add(axe);
  grip.scale.setScalar(targetLength / longest);

  if (rightHand) {
    grip.position.copy(PALM_LOCAL);
    // Handle across the palm (hand +X). Fingers run along +Y.
    grip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), handleAxis.normalize());
    rightHand.add(grip);
  }

  function setCarried(carried) {
    const wanted = Boolean(carried && rightHand);
    grip.userData.wanted = wanted;
    grip.visible = wanted;
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

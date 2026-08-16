import * as THREE from "three";

const scratch = {
  joint: new THREE.Vector3(),
  hand: new THREE.Vector3(),
  target: new THREE.Vector3(),
  currentDir: new THREE.Vector3(),
  targetDir: new THREE.Vector3(),
  currentWorld: new THREE.Quaternion(),
  parentWorld: new THREE.Quaternion(),
  desiredWorld: new THREE.Quaternion(),
  desiredLocal: new THREE.Quaternion(),
  delta: new THREE.Quaternion(),
  high: new THREE.Vector3(),
  low: new THREE.Vector3(),
  toward: new THREE.Vector3(),
  right: new THREE.Vector3(),
};

function createArmIk(model, side) {
  const chain = {
    upperarm: model.getObjectByName(`${side}_Upperarm`),
    forearm: model.getObjectByName(`${side}_Forearm`),
    hand: model.getObjectByName(`${side}_Hand`),
  };
  if (!chain.upperarm || !chain.forearm || !chain.hand) return null;

  function apply(targetPosition, weight) {
    if (weight < 0.002) return;

    for (let iteration = 0; iteration < 5; iteration += 1) {
      [chain.forearm, chain.upperarm].forEach((joint, jointIndex) => {
        joint.updateWorldMatrix(true, true);
        joint.getWorldPosition(scratch.joint);
        chain.hand.getWorldPosition(scratch.hand);
        scratch.currentDir.subVectors(scratch.hand, scratch.joint);
        scratch.targetDir.subVectors(targetPosition, scratch.joint);
        if (scratch.currentDir.lengthSq() < 0.000001 || scratch.targetDir.lengthSq() < 0.000001) {
          return;
        }

        scratch.currentDir.normalize();
        scratch.targetDir.normalize();
        scratch.delta.setFromUnitVectors(scratch.currentDir, scratch.targetDir);
        joint.getWorldQuaternion(scratch.currentWorld);
        joint.parent.getWorldQuaternion(scratch.parentWorld);
        scratch.desiredWorld.copy(scratch.delta).multiply(scratch.currentWorld);
        scratch.desiredLocal.copy(scratch.parentWorld.invert()).multiply(scratch.desiredWorld);
        joint.quaternion.slerp(scratch.desiredLocal, weight * (jointIndex === 0 ? 0.78 : 0.6));
        joint.updateWorldMatrix(false, true);
      });
    }
  }

  return { apply, hand: chain.hand };
}

export function createAxeWielder(model, axeModel) {
  const rightHand = model.getObjectByName("R_Hand");
  const spine = model.getObjectByName("Spine01");
  const rightIk = createArmIk(model, "R");
  const leftIk = createArmIk(model, "L");
  const grip = new THREE.Group();
  grip.name = "axe-grip";
  grip.visible = false;

  const axe = axeModel.clone(true);
  axe.name = "carried-axe";
  if (axeModel.name === "Lumberjack_Axe") {
    axe.position.set(0.012, 0.03, 0);
    axe.rotation.set(1.2, 0, 0.35);
    axe.scale.setScalar(1);
  } else {
    axe.position.set(0.03, 0.02, 0.01);
    axe.rotation.set(0.15, 0, 1.72);
  }
  grip.add(axe);

  const leftGrip = new THREE.Object3D();
  leftGrip.name = "axe-left-grip";
  leftGrip.position.set(0, 0.17, 0);
  axe.add(leftGrip);

  if (rightHand) {
    rightHand.add(grip);
  }

  const restSpine = spine?.quaternion.clone() ?? null;

  function setCarried(carried) {
    grip.visible = Boolean(carried && rightHand);
  }

  function applyCarry() {
    if (!grip.visible || !leftIk) return;
    model.updateWorldMatrix(true, true);
    leftGrip.updateWorldMatrix(true, false);
    leftGrip.getWorldPosition(scratch.target);
    leftIk.apply(scratch.target, 0.72);
  }

  function applyChop(root, treePosition, phase) {
    if (!grip.visible || !rightIk) return 0;

    model.updateWorldMatrix(true, true);
    scratch.toward.subVectors(treePosition, root.position);
    scratch.toward.y = 0;
    if (scratch.toward.lengthSq() < 0.000001) scratch.toward.set(0, 0, 1);
    scratch.toward.normalize();
    scratch.right.set(scratch.toward.z, 0, -scratch.toward.x);

    scratch.high.copy(root.position);
    scratch.high.y += 1.28;
    scratch.high.addScaledVector(scratch.toward, 0.08);
    scratch.high.addScaledVector(scratch.right, -0.16);

    scratch.low.copy(root.position);
    scratch.low.y += 0.46;
    scratch.low.addScaledVector(scratch.toward, 0.7);
    scratch.low.addScaledVector(scratch.right, -0.04);

    let raise = 0;
    if (phase < 0.4) {
      raise = phase / 0.4;
    } else if (phase < 0.5) {
      raise = 1;
    } else if (phase < 0.72) {
      raise = 1 - (phase - 0.5) / 0.22;
    } else {
      raise = -0.12 + ((phase - 0.72) / 0.28) * 0.22;
    }

    const blend = THREE.MathUtils.clamp(raise, -0.15, 1);
    scratch.target.lerpVectors(scratch.low, scratch.high, THREE.MathUtils.clamp(blend, 0, 1));
    if (blend < 0) {
      scratch.target.addScaledVector(scratch.toward, blend * 0.18);
      scratch.target.y += blend * 0.08;
    }

    rightIk.apply(scratch.target, 1);
    leftGrip.updateWorldMatrix(true, false);
    leftGrip.getWorldPosition(scratch.hand);
    leftIk?.apply(scratch.hand, 0.95);

    if (spine && restSpine) {
      const lean = THREE.MathUtils.clamp(1 - Math.max(blend, 0), 0, 1) * 0.18;
      spine.quaternion.copy(restSpine);
      spine.rotateX(lean);
    }

    const impactWindow = phase >= 0.66 && phase <= 0.74;
    return impactWindow ? 1 : 0;
  }

  function resetSpine() {
    if (spine && restSpine) spine.quaternion.copy(restSpine);
  }

  return {
    setCarried,
    applyCarry,
    applyChop,
    resetSpine,
    isCarried: () => grip.visible,
  };
}

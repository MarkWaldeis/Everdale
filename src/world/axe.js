import * as THREE from "three";

const TARGET_LENGTH = 0.28;
const scratch = {
  box: new THREE.Box3(),
  size: new THREE.Vector3(),
  handle: new THREE.Vector3(),
  blade: new THREE.Vector3(),
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

function collectLocalPoints(mesh, points) {
  const attribute = mesh.geometry?.attributes.position;
  if (!attribute) return;
  const vertex = new THREE.Vector3();
  for (let index = 0; index < attribute.count; index += 1) {
    points.push(vertex.fromBufferAttribute(attribute, index).clone());
  }
}

function classifyAxeEnds(axe) {
  const points = [];
  if (axe.isMesh) collectLocalPoints(axe, points);
  axe.traverse((child) => {
    if (child !== axe && child.isMesh) collectLocalPoints(child, points);
  });
  if (!points.length) return null;

  const box = new THREE.Box3().setFromPoints(points);
  box.getSize(scratch.size);
  let axis = "y";
  if (scratch.size.x >= scratch.size.y && scratch.size.x >= scratch.size.z) axis = "x";
  else if (scratch.size.z >= scratch.size.x && scratch.size.z >= scratch.size.y) axis = "z";

  const min = box.min[axis];
  const max = box.max[axis];
  const span = Math.max(max - min, 0.0001);
  const radiusNear = (from, to) => {
    const band = points.filter((point) => point[axis] >= from && point[axis] <= to);
    if (!band.length) return 0;
    const center = band
      .reduce((sum, point) => sum.add(point), new THREE.Vector3())
      .multiplyScalar(1 / band.length);
    return Math.max(
      ...band.map((point) => {
        const radial = point.clone();
        radial[axis] = center[axis];
        return radial.distanceTo(center);
      }),
    );
  };
  const handleIsMin =
    radiusNear(min, min + span * 0.22) <= radiusNear(max - span * 0.22, max);
  box.getCenter(scratch.handle);
  box.getCenter(scratch.blade);
  scratch.handle[axis] = handleIsMin ? min : max;
  scratch.blade[axis] = handleIsMin ? max : min;
  scratch.handle.lerp(scratch.blade, 0.16);
  return { handle: scratch.handle.clone(), blade: scratch.blade.clone() };
}

function plantHandleInPalm(axe) {
  const ends = classifyAxeEnds(axe);
  if (!ends) return;
  // Source rest pose aims the shaft across the body. Pivot on the handle so
  // the blade leads the downswing while the palm stays on the grip.
  const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  axe.quaternion.copy(turn);
  axe.position.copy(ends.handle).applyQuaternion(turn).multiplyScalar(-1);
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
    plantHandleInPalm(axe);
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

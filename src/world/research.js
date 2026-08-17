import * as THREE from "three";

const LAB_POSITION = new THREE.Vector3(2.2, 0, 3.3);
const LAB_YAW = 2.45;

function pointAlong(anchor, forward, distance, height, lateral = 0) {
  const point = anchor.clone().addScaledVector(forward, distance);
  if (lateral !== 0) {
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    point.addScaledVector(right, lateral);
  }
  point.y = height;
  return point;
}

export function createResearchLab(model, surfaceY) {
  const root = new THREE.Group();
  root.name = "research-lab";
  root.add(model);
  root.position.copy(LAB_POSITION);
  root.position.y = surfaceY;
  root.rotation.y = LAB_YAW;
  root.updateWorldMatrix(true, true);

  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());

  const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), LAB_YAW);
  forward.y = 0;
  forward.normalize();

  const front = center.clone();
  front.y = surfaceY;
  front.addScaledVector(forward, size.z * 0.22);

  const points = {
    approach: pointAlong(front, forward, 0.82, surfaceY),
    threshold: pointAlong(front, forward, 0.08, surfaceY + 0.02),
    inside: pointAlong(front, forward, -0.72, surfaceY + 0.04),
    depart: pointAlong(front, forward, 1.45, surfaceY),
    look: center.clone(),
  };
  points.look.y = surfaceY + 0.7;

  const local = {
    approach: points.approach.clone().sub(root.position),
    threshold: points.threshold.clone().sub(root.position),
    inside: points.inside.clone().sub(root.position),
    depart: points.depart.clone().sub(root.position),
    look: points.look.clone().sub(root.position),
  };

  function refreshAnchors() {
    root.updateWorldMatrix(true, true);
    const nextForward = new THREE.Vector3(0, 0, 1).transformDirection(root.matrixWorld);
    nextForward.y = 0;
    nextForward.normalize();
    const nextCenter = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());
    const nextFront = nextCenter.clone();
    nextFront.y = surfaceY;
    nextFront.addScaledVector(nextForward, size.z * 0.22);
    points.approach.copy(pointAlong(nextFront, nextForward, 0.82, surfaceY));
    points.threshold.copy(pointAlong(nextFront, nextForward, 0.08, surfaceY + 0.02));
    points.inside.copy(pointAlong(nextFront, nextForward, -0.72, surfaceY + 0.04));
    points.depart.copy(pointAlong(nextFront, nextForward, 1.45, surfaceY));
    points.look.copy(nextCenter);
    points.look.y = surfaceY + 0.7;
    local.approach.copy(points.approach).sub(root.position);
    local.threshold.copy(points.threshold).sub(root.position);
    local.inside.copy(points.inside).sub(root.position);
    local.depart.copy(points.depart).sub(root.position);
    local.look.copy(points.look).sub(root.position);
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

  function containsPoint(worldPoint, margin = 0.2) {
    root.updateWorldMatrix(true, false);
    const localPoint = root.worldToLocal(worldPoint.clone());
    return (
      Math.abs(localPoint.x) <= size.x * 0.5 + margin &&
      Math.abs(localPoint.z) <= size.z * 0.5 + margin
    );
  }

  return {
    root,
    points,
    size,
    surfaceY,
    containsPoint,
    refreshAnchors,
    setWorldPosition,
    setYaw,
    getYaw: () => root.rotation.y,
  };
}

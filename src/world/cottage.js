import * as THREE from "three";
import { extractOriginalCottageDoor } from "./original-door.js";

const HOUSE_POSITION = new THREE.Vector3(-1.75, 0, -2.55);
const HOUSE_YAW = 0;

function pointAlongEntrance(anchor, forward, distance, height, lateral = 0) {
  const point = anchor.clone().addScaledVector(forward, distance);
  if (lateral !== 0) {
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    point.addScaledVector(right, lateral);
  }
  point.y = height;
  return point;
}

function createInteriorShadow(door) {
  const size = door.bounds.getSize(new THREE.Vector3());
  const interior = new THREE.Group();
  interior.name = "cottage-interior-shadow";

  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(size.x * 5, size.y * 1.12),
    new THREE.MeshBasicMaterial({
      color: 0x291d16,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  backWall.name = "cottage-interior-back-wall";
  backWall.position.set(0, size.y * 0.5, -0.14);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(size.x * 3.2, 0.16),
    new THREE.MeshBasicMaterial({
      color: 0x51331f,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  floor.name = "cottage-interior-floor";
  floor.rotation.x = -Math.PI * 0.5;
  floor.position.set(0, 0.003, -0.075);

  interior.add(backWall, floor);
  door.entranceAnchor.add(interior);
  return interior;
}

export function createCottage(cottageModel, surfaceY) {
  const root = new THREE.Group();
  root.name = "wooden-cottage";
  root.add(cottageModel);

  const door = extractOriginalCottageDoor(cottageModel);
  const interiorShadow = createInteriorShadow(door);
  const closedBounds = new THREE.Box3().setFromObject(cottageModel);
  const size = closedBounds.getSize(new THREE.Vector3());

  root.position.copy(HOUSE_POSITION);
  root.position.y = surfaceY;
  root.rotation.y = HOUSE_YAW;
  root.updateWorldMatrix(true, true);

  const anchor = door.entranceAnchor.getWorldPosition(new THREE.Vector3());
  const forward = new THREE.Vector3(0, 0, 1).transformDirection(
    door.entranceAnchor.matrixWorld,
  );
  forward.y = 0;
  forward.normalize();

  const deckY = anchor.y + 0.006;
  const steps = pointAlongEntrance(anchor, forward, 0.78, surfaceY, 0.04);
  const approach = pointAlongEntrance(anchor, forward, 0.3, deckY, 0.04);
  const threshold = pointAlongEntrance(anchor, forward, 0.055, deckY);
  const inside = pointAlongEntrance(anchor, forward, -0.58, deckY);
  const exit = pointAlongEntrance(anchor, forward, 0.72, deckY);
  const close = pointAlongEntrance(anchor, forward, 0.58, deckY, -0.22);
  const depart = pointAlongEntrance(anchor, forward, 1.7, surfaceY);

  function containsPoint(worldPoint, margin = 0) {
    root.updateWorldMatrix(true, false);
    const localPoint = root.worldToLocal(worldPoint.clone());
    return (
      Math.abs(localPoint.x) <= size.x * 0.5 + margin &&
      Math.abs(localPoint.z) <= size.z * 0.5 + margin
    );
  }

  return {
    root,
    door,
    interiorShadow,
    points: { steps, approach, threshold, inside, exit, close, depart },
    containsPoint,
    size,
    surfaceY,
  };
}

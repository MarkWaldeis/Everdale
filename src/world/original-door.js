import * as THREE from "three";

const EXPECTED_TRIANGLE_COUNT = 8962;
const EXPECTED_VERTEX_COUNT = 7922;
const EXPECTED_DOOR_TRIANGLES = 86;
const EXPECTED_DOOR_VERTICES = 71;
const OPEN_ANGLE = THREE.MathUtils.degToRad(-92);
const BOUNDS_EPSILON = 0.000001;

// These runs were derived from the five disconnected door-leaf components in the
// unmodified cottage GLB. They are deliberately fixed: a changed source mesh
// must fail loudly instead of silently moving pieces of the wall or frame.
const DOOR_TRIANGLE_RUNS = Object.freeze([
  [4844, 4856],
  [4915, 4961],
  [5079, 5102],
  [5575, 5575],
  [5766, 5766],
]);

const DOOR_BOUNDS = Object.freeze({
  min: new THREE.Vector3(-0.0133609409, 0.047088623, 0.2206420749),
  max: new THREE.Vector3(0.1071701497, 0.2577972412, 0.2508850098),
});

const HINGE_LOCAL = new THREE.Vector3(
  DOOR_BOUNDS.min.x,
  DOOR_BOUNDS.min.y,
  (DOOR_BOUNDS.min.z + DOOR_BOUNDS.max.z) * 0.5,
);

function smootherStep(value) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function createDoorTriangleSet() {
  const triangles = new Set();
  DOOR_TRIANGLE_RUNS.forEach(([start, end]) => {
    for (let triangle = start; triangle <= end; triangle += 1) {
      triangles.add(triangle);
    }
  });
  return triangles;
}

function copyObjectTransform(source, target) {
  target.position.copy(source.position);
  target.quaternion.copy(source.quaternion);
  target.scale.copy(source.scale);
  target.matrixAutoUpdate = source.matrixAutoUpdate;
  if (!source.matrixAutoUpdate) target.matrix.copy(source.matrix);
}

function findSourceMesh(root) {
  let sourceMesh = null;
  root.traverse((child) => {
    if (!sourceMesh && child.isMesh && child.geometry?.getIndex()) sourceMesh = child;
  });
  return sourceMesh;
}

function validateSourceGeometry(geometry, doorTriangles) {
  const index = geometry.getIndex();
  const triangleCount = index.count / 3;
  const vertexCount = geometry.getAttribute("position")?.count ?? 0;

  if (
    triangleCount !== EXPECTED_TRIANGLE_COUNT ||
    vertexCount !== EXPECTED_VERTEX_COUNT ||
    doorTriangles.size !== EXPECTED_DOOR_TRIANGLES
  ) {
    throw new Error(
      `Das Holzhaus-Asset hat sich geändert (erwartet ${EXPECTED_TRIANGLE_COUNT} Dreiecke / ` +
        `${EXPECTED_VERTEX_COUNT} Vertices / ${EXPECTED_DOOR_TRIANGLES} Türdreiecke, erhalten ` +
        `${triangleCount} / ${vertexCount} / ${doorTriangles.size}).`,
    );
  }
}

function partitionIndices(geometry, doorTriangles) {
  const sourceIndex = geometry.getIndex();
  const bodyIndices = [];
  const doorIndices = [];
  const bodyVertices = new Set();
  const doorVertices = new Set();

  for (let triangle = 0; triangle < sourceIndex.count / 3; triangle += 1) {
    const destination = doorTriangles.has(triangle) ? doorIndices : bodyIndices;
    const vertexSet = doorTriangles.has(triangle) ? doorVertices : bodyVertices;

    for (let corner = 0; corner < 3; corner += 1) {
      const vertex = sourceIndex.getX(triangle * 3 + corner);
      destination.push(vertex);
      vertexSet.add(vertex);
    }
  }

  const sharedVertices = [...doorVertices].filter((vertex) => bodyVertices.has(vertex));
  if (
    doorIndices.length !== EXPECTED_DOOR_TRIANGLES * 3 ||
    doorVertices.size !== EXPECTED_DOOR_VERTICES ||
    sharedVertices.length !== 0 ||
    bodyIndices.length + doorIndices.length !== sourceIndex.count
  ) {
    throw new Error("Die Originaltür konnte nicht verlustfrei vom Haus-Mesh getrennt werden.");
  }

  return { bodyIndices, doorIndices, doorVertices };
}

function calculateVertexBounds(geometry, vertices) {
  const position = geometry.getAttribute("position");
  const bounds = new THREE.Box3();
  const vertexPosition = new THREE.Vector3();
  bounds.makeEmpty();

  vertices.forEach((vertex) => {
    vertexPosition.fromBufferAttribute(position, vertex);
    bounds.expandByPoint(vertexPosition);
  });
  return bounds;
}

function validateDoorBounds(bounds) {
  const boundsMatch = ["x", "y", "z"].every(
    (axis) =>
      Math.abs(bounds.min[axis] - DOOR_BOUNDS.min[axis]) <= BOUNDS_EPSILON &&
      Math.abs(bounds.max[axis] - DOOR_BOUNDS.max[axis]) <= BOUNDS_EPSILON,
  );
  if (!boundsMatch) {
    throw new Error("Die Geometrie-Signatur der Originaltür stimmt nicht mehr.");
  }
}

function cloneWithIndex(sourceGeometry, indices, indexedBounds = null) {
  const geometry = sourceGeometry.clone();
  geometry.setIndex(indices);
  if (indexedBounds) {
    geometry.boundingBox = indexedBounds.clone();
    geometry.boundingSphere = indexedBounds.getBoundingSphere(new THREE.Sphere());
  } else {
    geometry.computeBoundingSphere();
  }
  return geometry;
}

export function extractOriginalCottageDoor(cottageModel) {
  const sourceMesh = findSourceMesh(cottageModel);
  if (!sourceMesh) throw new Error("Im Holzhaus wurde kein indiziertes Mesh gefunden.");

  const doorTriangles = createDoorTriangleSet();
  validateSourceGeometry(sourceMesh.geometry, doorTriangles);
  const { bodyIndices, doorIndices, doorVertices } = partitionIndices(
    sourceMesh.geometry,
    doorTriangles,
  );
  const selectedDoorBounds = calculateVertexBounds(sourceMesh.geometry, doorVertices);
  validateDoorBounds(selectedDoorBounds);

  const parent = sourceMesh.parent;
  const bodyMesh = new THREE.Mesh(
    cloneWithIndex(sourceMesh.geometry, bodyIndices),
    sourceMesh.material,
  );
  bodyMesh.name = "wooden-cottage-body";
  copyObjectTransform(sourceMesh, bodyMesh);
  bodyMesh.castShadow = sourceMesh.castShadow;
  bodyMesh.receiveShadow = sourceMesh.receiveShadow;

  const doorMaterial = Array.isArray(sourceMesh.material)
    ? sourceMesh.material.map((material) => material.clone())
    : sourceMesh.material.clone();
  const doorMaterials = Array.isArray(doorMaterial) ? doorMaterial : [doorMaterial];
  doorMaterials.forEach((material) => {
    material.side = THREE.DoubleSide;
    material.needsUpdate = true;
  });

  const doorMesh = new THREE.Mesh(
    cloneWithIndex(sourceMesh.geometry, doorIndices, selectedDoorBounds),
    doorMaterial,
  );
  doorMesh.name = "original-cottage-door";
  doorMesh.position.copy(HINGE_LOCAL).multiplyScalar(-1);
  doorMesh.castShadow = true;
  doorMesh.receiveShadow = true;

  const sourceTransform = new THREE.Group();
  sourceTransform.name = "original-door-source-transform";
  copyObjectTransform(sourceMesh, sourceTransform);

  const pivot = new THREE.Group();
  pivot.name = "original-door-hinge";
  pivot.position.copy(HINGE_LOCAL);
  pivot.add(doorMesh);
  sourceTransform.add(pivot);

  const handleAnchor = new THREE.Object3D();
  handleAnchor.name = "original-door-handle-anchor";
  handleAnchor.position.set(
    DOOR_BOUNDS.max.x - 0.012,
    DOOR_BOUNDS.min.y + (DOOR_BOUNDS.max.y - DOOR_BOUNDS.min.y) * 0.52,
    DOOR_BOUNDS.max.z + 0.012,
  );
  doorMesh.add(handleAnchor);

  const entranceAnchor = new THREE.Object3D();
  entranceAnchor.name = "cottage-entrance-anchor";
  entranceAnchor.position.set(
    (DOOR_BOUNDS.min.x + DOOR_BOUNDS.max.x) * 0.5,
    DOOR_BOUNDS.min.y,
    DOOR_BOUNDS.max.z,
  );
  sourceTransform.add(entranceAnchor);

  parent.add(bodyMesh, sourceTransform);
  parent.remove(sourceMesh);

  let openProgress = 0;

  function setOpenProgress(progress) {
    openProgress = THREE.MathUtils.clamp(progress, 0, 1);
    pivot.rotation.y = OPEN_ANGLE * smootherStep(openProgress);
  }

  return {
    pivot,
    mesh: doorMesh,
    handleAnchor,
    entranceAnchor,
    setOpenProgress,
    getOpenProgress: () => openProgress,
    bounds: new THREE.Box3(DOOR_BOUNDS.min.clone(), DOOR_BOUNDS.max.clone()),
    metrics: Object.freeze({
      sourceTriangles: EXPECTED_TRIANGLE_COUNT,
      doorTriangles: EXPECTED_DOOR_TRIANGLES,
      doorVertices: doorVertices.size,
      sharedVertices: 0,
    }),
  };
}

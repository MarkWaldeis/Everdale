import * as THREE from "three";

const POINTS = [
  new THREE.Vector3(-14.5, 0, 12.6),
  new THREE.Vector3(-10, 0, 10.8),
  new THREE.Vector3(-5.5, 0, 11.6),
  new THREE.Vector3(-1, 0, 10.4),
  new THREE.Vector3(3, 0, 11.2),
  new THREE.Vector3(7.5, 0, 10.1),
  new THREE.Vector3(12, 0, 11.4),
  new THREE.Vector3(16.5, 0, 12.4),
];
const WIDTH = 1.5;
const BRIDGE_T = 0.52;

export function streamReservedCells(cellSize) {
  const reserved = new Set();
  const curve = new THREE.CatmullRomCurve3(POINTS);
  const point = new THREE.Vector3();
  for (let i = 0; i <= 140; i += 1) {
    curve.getPoint(i / 140, point);
    reserved.add(`${Math.round(point.x / cellSize)},${Math.round(point.z / cellSize)}`);
  }
  return reserved;
}

function ribbonGeometry(curve, width, y, samples = 120) {
  const positions = [];
  const indices = [];
  const uvs = [];
  const point = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    curve.getPoint(t, point);
    curve.getTangent(t, tangent);
    normal.set(-tangent.z, 0, tangent.x).normalize();
    positions.push(
      point.x + normal.x * (width / 2), y, point.z + normal.z * (width / 2),
      point.x - normal.x * (width / 2), y, point.z - normal.z * (width / 2),
    );
    uvs.push(t * 10, 0, t * 10, 1);
    if (i < samples) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createBridge(surfaceY, position, yaw) {
  const bridge = new THREE.Group();
  const plankMat = new THREE.MeshStandardMaterial({ color: 0x9a6b3d, roughness: 0.9, flatShading: true });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x74502e, roughness: 0.92, flatShading: true });

  const span = 2.4;
  const planks = 9;
  for (let i = 0; i < planks; i += 1) {
    const t = i / (planks - 1);
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.06, span / planks + 0.04), plankMat);
    plank.position.set(0, Math.sin(t * Math.PI) * 0.22, (t - 0.5) * span);
    plank.rotation.x = Math.cos(t * Math.PI) * -0.35;
    plank.castShadow = true;
    bridge.add(plank);
  }
  [-0.62, 0.62].forEach((side) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, span), darkMat);
    rail.position.set(side, 0.55, 0);
    bridge.add(rail);
    [-1, 1].forEach((end) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.55, 5), darkMat);
      post.position.set(side, 0.32, end * (span / 2 - 0.08));
      post.castShadow = true;
      bridge.add(post);
    });
  });
  bridge.position.set(position.x, surfaceY + 0.04, position.z);
  bridge.rotation.y = yaw;
  return bridge;
}

export function createStream(surfaceY) {
  const root = new THREE.Group();
  root.name = "stream";

  const curve = new THREE.CatmullRomCurve3(POINTS);
  const bed = new THREE.Mesh(
    ribbonGeometry(curve, WIDTH + 0.7, surfaceY + 0.006),
    new THREE.MeshStandardMaterial({
      color: 0x4a5a3a,
      roughness: 1,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
  );
  bed.receiveShadow = true;
  root.add(bed);

  const water = new THREE.Mesh(
    ribbonGeometry(curve, WIDTH, surfaceY + 0.022),
    new THREE.MeshStandardMaterial({
      color: 0x5fb8d9,
      transparent: true,
      opacity: 0.82,
      roughness: 0.35,
      metalness: 0.15,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
  );
  root.add(water);

  const foam = new THREE.Mesh(
    ribbonGeometry(curve, WIDTH * 0.35, surfaceY + 0.03),
    new THREE.MeshBasicMaterial({
      color: 0xcdeef8,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
    }),
  );
  root.add(foam);

  const lilyMat = new THREE.MeshStandardMaterial({ color: 0x4e8f4a, roughness: 0.9, flatShading: true });
  const pads = [];
  [0.18, 0.36, 0.68, 0.86].forEach((t, i) => {
    const point = curve.getPoint(t);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.11 + i * 0.015, 0.11 + i * 0.015, 0.02, 8), lilyMat);
    pad.position.set(point.x + (i % 2 ? 0.3 : -0.28), surfaceY + 0.04, point.z);
    pads.push(pad);
    root.add(pad);
  });

  const reedMat = new THREE.MeshStandardMaterial({ color: 0x6f9a4e, roughness: 1, flatShading: true });
  const reeds = new THREE.InstancedMesh(new THREE.ConeGeometry(0.035, 0.55, 4), reedMat, 40);
  const dummy = new THREE.Object3D();
  const point = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  let index = 0;
  for (let i = 0; i < 20 && index < 40; i += 1) {
    const t = 0.04 + (i / 20) * 0.92;
    curve.getPoint(t, point);
    curve.getTangent(t, tangent);
    normal.set(-tangent.z, 0, tangent.x).normalize();
    [-1, 1].forEach((side) => {
      if (index >= 40) return;
      const offset = WIDTH / 2 + 0.35 + Math.random() * 0.35;
      dummy.position.set(
        point.x + normal.x * offset * side + (Math.random() - 0.5) * 0.3,
        surfaceY + 0.22,
        point.z + normal.z * offset * side + (Math.random() - 0.5) * 0.3,
      );
      dummy.rotation.set((Math.random() - 0.5) * 0.25, Math.random() * Math.PI, (Math.random() - 0.5) * 0.25);
      const scale = 0.7 + Math.random() * 0.6;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      reeds.setMatrixAt(index, dummy.matrix);
      index += 1;
    });
  }
  reeds.count = index;
  reeds.castShadow = true;
  root.add(reeds);

  const bridgePoint = curve.getPoint(BRIDGE_T);
  const bridgeTangent = curve.getTangent(BRIDGE_T);
  const bridge = createBridge(
    surfaceY,
    bridgePoint,
    Math.atan2(bridgeTangent.x, bridgeTangent.z) + Math.PI / 2,
  );
  root.add(bridge);

  function update(delta, elapsed) {
    water.material.opacity = 0.78 + Math.sin(elapsed * 0.9) * 0.05;
    foam.position.x = Math.sin(elapsed * 0.4) * 0.06;
    foam.material.opacity = 0.12 + Math.sin(elapsed * 1.3) * 0.06;
    pads.forEach((pad, i) => {
      pad.position.y = surfaceY + 0.04 + Math.sin(elapsed * 1.4 + i * 1.9) * 0.012;
      pad.rotation.y += delta * 0.04;
    });
  }

  return { root, update };
}

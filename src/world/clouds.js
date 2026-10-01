import * as THREE from "three";

const CLOUD_COUNT = 6;
const DRIFT_SPEED = 0.55;
const WRAP_X = 78;

function createPuff(material) {
  const puff = new THREE.Group();
  const blobs = [
    [0, 0, 0, 1.6],
    [1.4, 0.15, 0.2, 1.15],
    [-1.3, 0.1, -0.15, 1.05],
    [0.5, 0.45, -0.3, 0.9],
    [-0.6, 0.4, 0.3, 0.85],
  ];
  blobs.forEach(([x, y, z, r]) => {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), material);
    blob.position.set(x, y, z);
    blob.scale.y = 0.62;
    puff.add(blob);
  });
  return puff;
}

export function createClouds() {
  const root = new THREE.Group();
  root.name = "clouds";
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });
  const clouds = [];
  for (let i = 0; i < CLOUD_COUNT; i += 1) {
    const cloud = createPuff(material);
    // Sit low on the horizon ring so the fixed 61° camera pitch still
    // catches them near the top edge of the frame.
    const angle = (i / CLOUD_COUNT) * Math.PI * 2;
    const radius = 44 + (i % 3) * 10;
    cloud.position.set(Math.cos(angle) * radius, 5.5 + (i % 4) * 1.6, Math.sin(angle) * radius - 8);
    cloud.scale.setScalar(1.4 + (i % 3) * 0.5);
    cloud.userData.speed = DRIFT_SPEED * (0.8 + (i % 3) * 0.3);
    cloud.userData.bob = i * 1.7;
    root.add(cloud);
    clouds.push(cloud);
  }
  return {
    root,
    update(delta, time) {
      clouds.forEach((cloud) => {
        cloud.position.x += cloud.userData.speed * delta;
        cloud.position.y += Math.sin(time * 0.3 + cloud.userData.bob) * 0.0035;
        if (cloud.position.x > WRAP_X) cloud.position.x = -WRAP_X;
      });
    },
  };
}

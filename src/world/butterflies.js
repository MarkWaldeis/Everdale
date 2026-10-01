import * as THREE from "three";

const COLORS = [0xf2a0c0, 0xf6d66e, 0xa6cdf2, 0xf2b16e, 0xd9b1f2, 0xffffff];

function makeButterfly(color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.9 });
  const wingMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.7,
    side: THREE.DoubleSide,
    flatShading: true,
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.13, 5), bodyMat);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const wings = [];
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.14), wingMat);
    wing.position.x = side * 0.1;
    g.add(wing);
    wings.push({ mesh: wing, side });
  }
  g.userData.wings = wings;
  return g;
}

export function createButterflies(walkArea) {
  const root = new THREE.Group();
  root.name = "butterflies";
  const swarm = [];
  let seed = 20261006;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 7; i += 1) {
    const b = makeButterfly(COLORS[i % COLORS.length]);
    const a = rand() * Math.PI * 2;
    const r = 0.3 + rand() * 0.5;
    b.position.set(
      Math.cos(a) * walkArea.radiusX * r,
      0.6 + rand() * 0.9,
      Math.sin(a) * walkArea.radiusZ * r,
    );
    b.userData.seed = rand() * 100;
    root.add(b);
    swarm.push(b);
  }
  function update(delta, elapsed, visibility) {
    swarm.forEach((b, i) => {
      b.visible = visibility > 0.05;
      if (!b.visible) return;
      const t = elapsed * 0.9 + b.userData.seed;
      b.position.x += Math.sin(t * 1.1 + i) * delta * 0.7;
      b.position.z += Math.cos(t * 0.9 + i * 2.1) * delta * 0.7;
      b.position.y = 0.55 + Math.abs(Math.sin(t * 2.2)) * 0.75;
      const ex = b.position.x / (walkArea.radiusX * 0.92);
      const ez = b.position.z / (walkArea.radiusZ * 0.92);
      if (ex * ex + ez * ez > 1) {
        b.position.x -= b.position.x * delta * 0.4;
        b.position.z -= b.position.z * delta * 0.4;
      }
      b.rotation.y = Math.atan2(Math.cos(t * 0.9 + i * 2.1), Math.sin(t * 1.1 + i)) + Math.PI / 2;
      const flap = Math.sin(elapsed * 14 + b.userData.seed) * 0.9;
      b.userData.wings.forEach(({ mesh, side }) => {
        mesh.rotation.y = side * (0.5 + flap * 0.5);
      });
    });
  }
  return { root, update };
}

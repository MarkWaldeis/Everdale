import * as THREE from "three";

const COUNT = 26;

// Soft glowing dots that drift over the meadow at night; opacity is
// driven by the day/night controller so they fade out by daylight.
export function createFireflies(walkArea) {
  const positions = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT * 3);
  let seed = 20261004;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < COUNT; i += 1) {
    seeds[i * 3] = rand() * Math.PI * 2;
    seeds[i * 3 + 1] = rand() * Math.PI * 2;
    seeds[i * 3 + 2] = 0.5 + rand() * 0.5;
    const a = rand() * Math.PI * 2;
    const r = 0.35 + rand() * 0.55;
    positions[i * 3] = Math.cos(a) * walkArea.radiusX * r;
    positions[i * 3 + 1] = 0.5 + rand() * 1.6;
    positions[i * 3 + 2] = Math.sin(a) * walkArea.radiusZ * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xe8f2a0,
    size: 0.2,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;

  function update(delta, elapsed, visibility) {
    material.opacity = visibility * 0.85;
    if (visibility <= 0.01) return;
    const attr = geo.attributes.position;
    for (let i = 0; i < COUNT; i += 1) {
      const s0 = seeds[i * 3];
      const s1 = seeds[i * 3 + 1];
      const speed = seeds[i * 3 + 2];
      const t = elapsed * speed;
      attr.array[i * 3] += Math.sin(t + s0) * delta * 0.55;
      attr.array[i * 3 + 2] += Math.cos(t * 0.8 + s1) * delta * 0.55;
      attr.array[i * 3 + 1] = Math.max(
        0.42,
        0.6 + Math.sin(t * 1.7 + s0) * 0.45 + Math.sin(t * 0.6 + s1) * 0.5,
      );
      // gentle drift back inside the meadow bounds
      const x = attr.array[i * 3];
      const z = attr.array[i * 3 + 2];
      const ex = x / (walkArea.radiusX * 0.95);
      const ez = z / (walkArea.radiusZ * 0.95);
      if (ex * ex + ez * ez > 1) {
        attr.array[i * 3] -= x * delta * 0.3;
        attr.array[i * 3 + 2] -= z * delta * 0.3;
      }
    }
    attr.needsUpdate = true;
  }

  return { root: points, update };
}

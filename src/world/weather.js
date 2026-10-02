import * as THREE from "three";

// Rain streaks as one LineSegments buffer; each pair of verts is a
// short vertical streak that respawns at the top when it hits ground.
const DROPS = 420;
const AREA = 34;
const TOP = 26;
const FALL_SPEED = 24;

export function createWeather() {
  const positions = new Float32Array(DROPS * 6);
  const speeds = new Float32Array(DROPS);
  let seed = 20261003;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < DROPS; i += 1) {
    const x = (rand() * 2 - 1) * AREA;
    const z = (rand() * 2 - 1) * AREA;
    const y = rand() * TOP;
    positions[i * 6] = x;
    positions[i * 6 + 1] = y;
    positions[i * 6 + 2] = z;
    positions[i * 6 + 3] = x;
    positions[i * 6 + 4] = y + 0.65;
    positions[i * 6 + 5] = z;
    speeds[i] = 0.8 + rand() * 0.5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: 0x9db8cf,
    transparent: true,
    opacity: 0,
  });
  const rain = new THREE.LineSegments(geo, material);
  rain.frustumCulled = false;
  rain.renderOrder = 2;

  const state = {
    raining: false,
    strength: 0,
    nextIn: 70 + rand() * 60,
    remaining: 0,
  };

  function update(delta) {
    if (state.raining) {
      state.remaining -= delta;
      state.strength = Math.min(1, state.strength + delta * 0.5);
      if (state.remaining <= 0) {
        state.raining = false;
        state.nextIn = 90 + rand() * 80;
        state.justEnded = true;
      }
    } else {
      state.nextIn -= delta;
      state.strength = Math.max(0, state.strength - delta * 0.6);
      if (state.nextIn <= 0) {
        state.raining = true;
        state.remaining = 35 + rand() * 30;
      }
    }
    material.opacity = state.strength * 0.55;
    if (state.strength <= 0) return;
    const attr = geo.attributes.position;
    for (let i = 0; i < DROPS; i += 1) {
      const dy = FALL_SPEED * speeds[i] * delta;
      let y = attr.array[i * 6 + 1] - dy;
      if (y < 0) {
        y = TOP + rand() * 6;
        const x = (rand() * 2 - 1) * AREA;
        const z = (rand() * 2 - 1) * AREA;
        attr.array[i * 6] = x;
        attr.array[i * 6 + 2] = z;
        attr.array[i * 6 + 3] = x;
        attr.array[i * 6 + 5] = z;
      }
      attr.array[i * 6 + 1] = y;
      attr.array[i * 6 + 4] = y + 0.65;
    }
    attr.needsUpdate = true;
  }

  return { root: rain, update, state };
}

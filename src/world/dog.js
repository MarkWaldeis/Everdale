import * as THREE from "three";

const FUR = new THREE.MeshStandardMaterial({ color: 0xb0793f, roughness: 0.9, flatShading: true });
const FUR_LIGHT = new THREE.MeshStandardMaterial({ color: 0xe8d3b5, roughness: 0.9, flatShading: true });
const DARK = new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.9, flatShading: true });

const SPEED = 1.9;
const FOLLOW_DISTANCE = 2.1;

export function createDog(surfaceY, wellPosition) {
  const root = new THREE.Group();
  root.name = "village-dog";
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.3, 4, 8), FUR);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.26;
  root.add(body);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), FUR_LIGHT);
  chest.position.set(0.16, 0.24, 0);
  root.add(chest);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), FUR);
  head.position.set(0.32, 0.42, 0);
  root.add(head);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.09), FUR_LIGHT);
  snout.position.set(0.42, 0.38, 0);
  root.add(snout);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), DARK);
  nose.position.set(0.49, 0.39, 0);
  root.add(nose);
  [-0.06, 0.06].forEach((z) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.11, 5), DARK);
    ear.position.set(0.3, 0.53, z);
    root.add(ear);
  });
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.18, 3, 6), FUR);
  tail.position.set(-0.3, 0.36, 0);
  tail.rotation.z = 1.1;
  root.add(tail);
  const legs = [];
  [[0.18, 0.08], [0.18, -0.08], [-0.18, 0.08], [-0.18, -0.08]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.22, 5), FUR);
    leg.position.set(x, 0.11, z);
    root.add(leg);
    legs.push(leg);
  });
  root.traverse((node) => {
    if (node.isMesh) node.castShadow = true;
  });
  root.position.set(2.5, surfaceY, 3.5);

  const state = { target: null, pause: 1.5, sitUntil: 0, trottT: 0, current: null };

  function update(delta, elapsed, villagers, night) {
    if (night > 0.8) {
      // asleep: curl up near the well, tail still
      root.position.set(wellPosition.x + 1.1, surfaceY, wellPosition.z + 1.4);
      root.rotation.y += (0.8 - root.rotation.y) * delta * 2;
      tail.rotation.y = 0;
      legs.forEach((leg) => (leg.visible = false));
      root.scale.y = 0.75;
      return;
    }
    legs.forEach((leg) => (leg.visible = true));
    root.scale.y = 1;
    // pick the closest awake villager as the "favorite" to follow
    let best = null;
    let bestD = Infinity;
    for (const v of villagers ?? []) {
      const p = v?.root?.position;
      if (!p || v.isAsleep?.()) continue;
      const d = Math.hypot(p.x - root.position.x, p.z - root.position.z);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    const target = best ?? wellPosition;
    const dist = best ? bestD : Math.hypot(target.x - root.position.x, target.z - root.position.z);
    const want = best ? FOLLOW_DISTANCE : 1.6;
    if (state.sitUntil > elapsed) {
      // sitting: wag tail, look at target
      tail.rotation.y = Math.sin(elapsed * 10) * 0.6;
      root.rotation.y = Math.atan2(target.x - root.position.x, target.z - root.position.z) - Math.PI / 2;
      root.scale.y = 0.85;
      return;
    }
    root.scale.y = 1;
    if (dist > want + 0.4) {
      const dirX = (target.x - root.position.x) / dist;
      const dirZ = (target.z - root.position.z) / dist;
      const step = Math.min(dist - want, SPEED * delta);
      root.position.x += dirX * step;
      root.position.z += dirZ * step;
      root.rotation.y = Math.atan2(dirX, dirZ) - Math.PI / 2;
      state.trottT += delta * 9;
      root.position.y = surfaceY + Math.abs(Math.sin(state.trottT)) * 0.05;
      legs.forEach((leg, i) => {
        leg.rotation.z = Math.sin(state.trottT + (i % 2 ? Math.PI : 0)) * 0.4;
      });
      tail.rotation.y = Math.sin(elapsed * 6) * 0.35;
      state.pause = 0;
    } else {
      root.position.y = surfaceY;
      legs.forEach((leg) => (leg.rotation.z = 0));
      if (state.pause <= 0) {
        state.pause = 4 + Math.random() * 6;
        if (Math.random() < 0.45) state.sitUntil = elapsed + 1.5 + Math.random() * 2.5;
      } else {
        state.pause -= delta;
        tail.rotation.y = Math.sin(elapsed * 4) * 0.2;
      }
    }
  }
  return { root, update };
}

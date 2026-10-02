import * as THREE from "three";

const BODY = new THREE.MeshStandardMaterial({ color: 0x4a6fa5, roughness: 0.85, flatShading: true });
const BODY2 = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.85, flatShading: true });
const BREAST = new THREE.MeshStandardMaterial({ color: 0xd97a4a, roughness: 0.85, flatShading: true });
const BEAK = new THREE.MeshStandardMaterial({ color: 0xe8b13d, roughness: 0.8, flatShading: true });
const WING = new THREE.MeshStandardMaterial({ color: 0x3a5a86, roughness: 0.9, flatShading: true, side: THREE.DoubleSide });

const COLORS = [BODY, BODY2, new THREE.MeshStandardMaterial({ color: 0x5d8f4f, roughness: 0.85, flatShading: true }), BODY, BODY2];

function makeBird(mat) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.07, 7, 5), mat);
  body.scale.set(1.25, 0.9, 0.9);
  body.position.y = 0.08;
  g.add(body);
  const breast = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), BREAST);
  breast.position.set(0.05, 0.06, 0);
  g.add(breast);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 5), mat);
  head.position.set(0.08, 0.14, 0);
  g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 4), BEAK);
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.14, 0.13, 0);
  g.add(beak);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.03), mat);
  tail.position.set(-0.1, 0.1, 0);
  tail.rotation.z = 0.35;
  g.add(tail);
  const wings = [];
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.05), WING);
    wing.position.set(-0.01, 0.11, side * 0.045);
    wing.rotation.y = side * 0.15;
    g.add(wing);
    wings.push({ mesh: wing, side });
  }
  g.userData.wings = wings;
  return g;
}

const FLEE_DIST = 1.6;
const FLY_UP = 2.2;

export function createBirds(walkArea) {
  const root = new THREE.Group();
  root.name = "village-birds";
  const birds = [];
  let seed = 88123;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 5; i += 1) {
    const bird = makeBird(COLORS[i % COLORS.length]);
    const a = rand() * Math.PI * 2;
    const r = 0.25 + rand() * 0.6;
    bird.position.set(
      Math.cos(a) * walkArea.radiusX * r,
      walkArea.surfaceY,
      Math.sin(a) * walkArea.radiusZ * r,
    );
    bird.rotation.y = rand() * Math.PI * 2;
    bird.scale.setScalar(1.35);
    Object.assign(bird.userData, {
      mode: "idle",
      wait: rand() * 2,
      target: null,
      hopT: 0,
      fleeTo: null,
      seed: rand() * 10,
    });
    root.add(bird);
    birds.push(bird);
  }

  function scatterTarget(bird) {
    const a = rand() * Math.PI * 2;
    const r = 0.2 + rand() * 0.65;
    return new THREE.Vector3(
      Math.cos(a) * walkArea.radiusX * r,
      walkArea.surfaceY,
      Math.sin(a) * walkArea.radiusZ * r,
    );
  }

  function update(delta, elapsed, disturbers, night = 0) {
    birds.forEach((bird) => {
      // roost at night: tuck into the forest edge, hidden
      if (night > 0.6) {
        bird.visible = false;
        return;
      }
      bird.visible = true;
      const u = bird.userData;
      // flee check: any disturber close by?
      let threat = null;
      let threatD = Infinity;
      for (const d of disturbers ?? []) {
        const p = d?.root?.position ?? d;
        if (!p) continue;
        const dist = Math.hypot(p.x - bird.position.x, p.z - bird.position.z);
        if (dist < FLEE_DIST && dist < threatD) {
          threatD = dist;
          threat = p;
        }
      }
      if (threat && u.mode !== "flee") {
        u.mode = "flee";
        u.fleeTo = scatterTarget(bird);
        u.wait = 0;
      }
      if (u.mode === "flee") {
        // burst upward then glide to fleeTo
        const t = u.fleeTo;
        const dy = FLY_UP - Math.min(FLY_UP, (u.hopT += delta * 2.2) * FLY_UP);
        bird.position.x += (t.x - bird.position.x) * delta * 1.1;
        bird.position.z += (t.z - bird.position.z) * delta * 1.1;
        bird.position.y = walkArea.surfaceY + Math.max(0, dy) + Math.sin(elapsed * 6 + u.seed) * 0.06;
        bird.rotation.y = Math.atan2(t.x - bird.position.x, t.z - bird.position.z) - Math.PI / 2;
        u.wings.forEach(({ mesh, side }) => {
          mesh.rotation.x = side * Math.sin(elapsed * 22 + u.seed) * 0.9;
        });
        if (Math.hypot(t.x - bird.position.x, t.z - bird.position.z) < 0.4 && bird.position.y < walkArea.surfaceY + 0.3) {
          u.mode = "idle";
          u.wait = 1.5 + rand() * 3;
          bird.position.y = walkArea.surfaceY;
          u.wings.forEach(({ mesh }) => (mesh.rotation.x = 0));
        }
        return;
      }
      // idle/hop/peck
      u.wait -= delta;
      if (u.wait <= 0) {
        u.wait = 1.2 + rand() * 3.4;
        if (rand() < 0.6) u.target = scatterTarget(bird);
        else u.target = null; // peck in place
      }
      if (u.target) {
        const dx = u.target.x - bird.position.x;
        const dz = u.target.z - bird.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.12) {
          u.target = null;
        } else {
          const step = Math.min(dist, 1.1 * delta);
          bird.position.x += (dx / dist) * step;
          bird.position.z += (dz / dist) * step;
          bird.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
          u.hopT += delta * 11;
          bird.position.y = walkArea.surfaceY + Math.abs(Math.sin(u.hopT)) * 0.09;
        }
      } else {
        // peck: head bob
        bird.position.y = walkArea.surfaceY;
        const peck = Math.max(Math.sin(elapsed * 5 + u.seed), 0) ** 4;
        bird.rotation.x = peck * 0.45;
        u.wings.forEach(({ mesh }) => (mesh.rotation.x = 0));
      }
    });
  }
  return { root, update };
}

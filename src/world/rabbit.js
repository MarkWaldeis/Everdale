import * as THREE from "three";

const FUR = new THREE.MeshStandardMaterial({ color: 0xb09a80, roughness: 0.95, flatShading: true });
const BELLY = new THREE.MeshStandardMaterial({ color: 0xd9cbb5, roughness: 0.95, flatShading: true });
const PINK = new THREE.MeshStandardMaterial({ color: 0xe0a8a0, roughness: 0.9, flatShading: true });

export function createRabbit(walkArea) {
  const root = new THREE.Group();
  root.name = "meadow-rabbit";

  const bun = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 6), FUR);
  body.scale.set(0.8, 0.75, 1.15);
  body.position.y = 0.1;
  bun.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), FUR);
  head.position.set(0, 0.16, 0.12);
  bun.add(head);
  const earL = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.14, 5), FUR);
  earL.position.set(-0.035, 0.28, 0.1);
  earL.rotation.z = 0.12;
  const earR = earL.clone();
  earR.position.x = 0.035;
  earR.rotation.z = -0.12;
  bun.add(earL, earR);
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), BELLY);
  tail.position.set(0, 0.11, -0.13);
  bun.add(tail);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.016, 4, 4), PINK);
  nose.position.set(0, 0.15, 0.19);
  bun.add(nose);
  bun.visible = false;
  root.add(bun);

  // route: edge of meadow → hop across → disappear into forest edge
  let runAt = -1;
  let nextAt = 20 + Math.random() * 25;
  let path = null;

  const RUN_SECS = 16;

  function plan() {
    const side = Math.random() < 0.5 ? -1 : 1;
    const z0 = -14 + Math.random() * 10;
    const z1 = -10 + Math.random() * 8;
    path = {
      x0: side * walkArea.radiusX * 1.05,
      z0,
      x1: -side * walkArea.radiusX * 1.05,
      z1,
      bow: 1.4 + Math.random() * 1.2,
    };
  }

  function update(delta, elapsed, night) {
    if (runAt < 0 && night < 0.4 && elapsed >= nextAt) {
      plan();
      runAt = elapsed;
      bun.visible = true;
    }
    if (runAt >= 0) {
      const t = (elapsed - runAt) / RUN_SECS;
      if (t >= 1) {
        runAt = -1;
        bun.visible = false;
        nextAt = elapsed + 35 + Math.random() * 40;
      } else {
        const x = path.x0 + (path.x1 - path.x0) * t;
        const z = path.z0 + (path.z1 - path.z0) * t + Math.sin(t * Math.PI) * path.bow * 0.4;
        // hop: quick arcs, pauses between bursts
        const hopCycle = (elapsed * 2.4) % 1;
        const burst = t % 0.14 < 0.09; // move in bursts with mini pauses
        const hopY = burst ? Math.abs(Math.sin(hopCycle * Math.PI)) * 0.14 : 0;
        bun.position.set(x, walkArea.surfaceY + hopY, z);
        bun.rotation.y = Math.atan2(path.x1 - path.x0, path.z1 - path.z0) + Math.PI;
        const twitch = Math.sin(elapsed * 9) * 0.06;
        earL.rotation.z = 0.12 + twitch;
        earR.rotation.z = -0.12 - twitch;
        if (!burst) {
          // pause pose: nose wiggle
          nose.position.x = Math.sin(elapsed * 14) * 0.008;
        }
      }
    }
  }
  return { root, update };
}

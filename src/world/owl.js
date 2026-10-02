import * as THREE from "three";

const BODY = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.95, flatShading: true });
const WING = new THREE.MeshStandardMaterial({ color: 0x4a3d30, roughness: 0.95, flatShading: true, side: THREE.DoubleSide });

export function createOwl(surfaceY) {
  const root = new THREE.Group();
  root.name = "night-owl";

  const owl = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 6), BODY);
  body.scale.set(0.8, 1, 1.5);
  owl.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), BODY);
  head.position.set(0, 0.09, 0.12);
  owl.add(head);
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.14), WING);
  wingL.position.set(-0.2, 0.03, 0);
  const wingR = wingL.clone();
  wingR.position.x = 0.2;
  owl.add(wingL, wingR);
  owl.visible = false;
  owl.scale.setScalar(1.5);
  root.add(owl);

  let flyAt = -1;
  let fromX = 0, fromZ = 0, toX = 0, toZ = 0, alt = 0;
  let nextAt = 8;
  let hooted = false;
  let onHoot = null;

  const FLY_SECS = 7.5;

  function plan(elapsed) {
    flyAt = elapsed;
    hooted = false;
    const side = Math.random() < 0.5 ? -1 : 1;
    fromX = side * -22;
    toX = side * 22;
    fromZ = -16 + Math.random() * 18;
    toZ = -14 + Math.random() * 14;
    alt = surfaceY + 5.5 + Math.random() * 2.5;
    owl.visible = true;
  }

  function update(delta, elapsed, night) {
    if (flyAt < 0 && night > 0.7 && elapsed >= nextAt) plan(elapsed);
    if (flyAt >= 0) {
      const t = (elapsed - flyAt) / FLY_SECS;
      if (t >= 1) {
        flyAt = -1;
        owl.visible = false;
        nextAt = elapsed + 20 + Math.random() * 30;
      } else {
        const x = fromX + (toX - fromX) * t;
        const z = fromZ + (toZ - fromZ) * t;
        const bob = Math.sin(t * Math.PI) * 0.8 + Math.sin(elapsed * 3) * 0.15;
        owl.position.set(x, alt + bob, z);
        owl.rotation.y = Math.atan2(toX - fromX, toZ - fromZ);
        const flap = Math.sin(elapsed * 7) * 0.5;
        wingL.rotation.z = flap;
        wingR.rotation.z = -flap;
        if (!hooted && t > 0.35 && Math.random() < 0.02) {
          hooted = true;
          onHoot?.();
        }
      }
    }
  }
  return { root, update, setHootHandler: (fn) => { onHoot = fn; } };
}

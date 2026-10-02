import * as THREE from "three";
import { STREAM_CURVE, STREAM_Y } from "./stream.js";

const BODY = new THREE.MeshStandardMaterial({ color: 0x6fa8c9, roughness: 0.6, metalness: 0.35, flatShading: true });
const FIN = new THREE.MeshStandardMaterial({ color: 0x5488a8, roughness: 0.7, flatShading: true });
const RING = new THREE.MeshBasicMaterial({ color: 0xdff2ff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });

const JUMP_SECS = 0.95;
const NEXT_MIN = 6;
const NEXT_SPAN = 12;

export function createStreamFish(surfaceY) {
  const root = new THREE.Group();
  root.name = "stream-fish";

  const fish = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.3, 7), BODY);
  body.rotation.z = Math.PI / 2;
  fish.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 5), FIN);
  tail.rotation.z = -Math.PI / 2;
  tail.position.x = -0.2;
  fish.add(tail);
  const finTop = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.09, 4), FIN);
  finTop.position.set(0, 0.06, 0);
  fish.add(finTop);
  fish.visible = false;
  fish.scale.setScalar(1.35);
  root.add(fish);

  const ring = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.18, 14), RING.clone());
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  root.add(ring);

  let jumpT = -1;
  let jumpAt = 0;
  let jumpDir = 1;
  let splashAt = -1;
  let nextAt = 3 + Math.random() * 4;
  const pos = new THREE.Vector3();
  const tangent = new THREE.Vector3();

  function startJump(elapsed) {
    jumpT = 0.12 + Math.random() * 0.76;
    jumpDir = Math.random() < 0.5 ? 1 : -1;
    jumpAt = elapsed;
    fish.visible = true;
  }

  function update(delta, elapsed) {
    if (jumpAt < 0 && elapsed >= nextAt) {
      jumpAt = elapsed;
      startJump(elapsed);
    }
    if (jumpAt >= 0) {
      const t = (elapsed - jumpAt) / JUMP_SECS;
      if (t >= 1) {
        jumpAt = -1;
        fish.visible = false;
        splashAt = elapsed;
        STREAM_CURVE.getPointAt(Math.min(Math.max(jumpT + jumpDir * 0.06, 0.02), 0.98), pos);
        ring.position.set(pos.x, STREAM_Y(surfaceY) + 0.02, pos.z);
        ring.visible = true;
        nextAt = elapsed + (Math.random() < 0.25 ? 1.2 + Math.random() * 1.5 : NEXT_MIN + Math.random() * NEXT_SPAN);
      } else {
        const tNow = Math.min(Math.max(jumpT + jumpDir * t * 0.12, 0.02), 0.98);
        STREAM_CURVE.getPointAt(tNow, pos);
        STREAM_CURVE.getTangentAt(tNow, tangent);
        const arc = Math.sin(t * Math.PI) * 0.55;
        fish.position.set(pos.x, STREAM_Y(surfaceY) + arc, pos.z);
        fish.rotation.y = Math.atan2(-tangent.z, tangent.x) + (jumpDir < 0 ? Math.PI : 0);
        fish.rotation.z = (1 - t * 2) * 0.7 * jumpDir;
      }
    }
    if (splashAt >= 0) {
      const t = (elapsed - splashAt) / 0.7;
      if (t >= 1) {
        splashAt = -1;
        ring.visible = false;
      } else {
        ring.scale.setScalar(1 + t * 3.2);
        ring.material.opacity = 0.55 * (1 - t);
      }
    }
  }
  return { root, update };
}

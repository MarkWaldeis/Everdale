import * as THREE from "three";
import { STREAM_CURVE } from "./stream.js";

const BODY = new THREE.MeshStandardMaterial({ color: 0xf5f0e3, roughness: 0.9, flatShading: true });
const HEAD = new THREE.MeshStandardMaterial({ color: 0x3f7d4e, roughness: 0.85, flatShading: true });
const BILL = new THREE.MeshStandardMaterial({ color: 0xe8a33d, roughness: 0.8, flatShading: true });
const TAIL = new THREE.MeshStandardMaterial({ color: 0xe4decb, roughness: 0.9, flatShading: true });

function makeDuck(brown) {
  const g = new THREE.Group();
  const bodyMat = brown
    ? new THREE.MeshStandardMaterial({ color: 0x9a7a52, roughness: 0.95, flatShading: true })
    : BODY;
  const headMat = brown ? bodyMat : HEAD;
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), bodyMat);
  body.scale.set(1.35, 0.75, 0.95);
  body.position.y = 0.12;
  g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 5), TAIL);
  tail.rotation.x = -Math.PI / 2.4;
  tail.position.set(-0.2, 0.17, 0);
  g.add(tail);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), headMat);
  head.position.set(0.17, 0.3, 0);
  g.add(head);
  const bill = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.06), BILL);
  bill.position.set(0.27, 0.28, 0);
  g.add(bill);
  return g;
}

export function createDucks(surfaceY) {
  const root = new THREE.Group();
  root.name = "ducks";
  const ducks = [];
  const tangent = new THREE.Vector3();
  const point = new THREE.Vector3();
  for (let i = 0; i < 3; i += 1) {
    const duck = makeDuck(i === 2);
    duck.userData = { t: 0.15 + i * 0.12, lane: (i - 1) * 0.35, speed: 0.008 + i * 0.0015 };
    root.add(duck);
    ducks.push(duck);
  }
  function update(delta, elapsed) {
    ducks.forEach((duck) => {
      duck.userData.t = (duck.userData.t + duck.userData.speed * delta) % 1;
      const t = duck.userData.t;
      STREAM_CURVE.getPoint(t, point);
      STREAM_CURVE.getTangent(t, tangent);
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      point.addScaledVector(side, duck.userData.lane);
      duck.position.set(point.x, surfaceY + 0.03 + Math.sin(elapsed * 2 + t * 20) * 0.02, point.z);
      duck.rotation.y = Math.atan2(tangent.x, tangent.z) - Math.PI / 2;
      duck.rotation.z = Math.sin(elapsed * 2.4 + t * 30) * 0.05;
    });
  }
  return { root, update };
}

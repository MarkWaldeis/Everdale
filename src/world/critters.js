import * as THREE from "three";

function createRabbit(material, earMaterial) {
  const rabbit = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), material);
  body.scale.set(1.2, 0.9, 0.9);
  body.position.y = 0.2;
  rabbit.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), material);
  head.position.set(0.24, 0.32, 0);
  rabbit.add(head);
  [-0.05, 0.05].forEach((z) => {
    const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.18, 3, 6), earMaterial);
    ear.position.set(0.22, 0.52, z);
    ear.rotation.z = -0.2;
    rabbit.add(ear);
  });
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), earMaterial);
  tail.position.set(-0.24, 0.26, 0);
  rabbit.add(tail);
  return rabbit;
}

function createSquirrel(material, accentMaterial) {
  const squirrel = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), material);
  body.scale.set(1.15, 0.95, 0.85);
  body.position.y = 0.2;
  squirrel.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), material);
  head.position.set(0.2, 0.34, 0);
  squirrel.add(head);
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.3, 4, 8), accentMaterial);
  tail.position.set(-0.22, 0.42, 0);
  tail.rotation.z = 0.75;
  squirrel.add(tail);
  return squirrel;
}

const SPAWNS = [
  { x: -8.5, z: -4.5, kind: "rabbit" },
  { x: 10.5, z: -6.5, kind: "rabbit" },
  { x: -3.5, z: 10.5, kind: "rabbit" },
  { x: 12.0, z: 7.0, kind: "rabbit" },
  { x: -10.5, z: 5.5, kind: "squirrel" },
  { x: 7.5, z: -9.0, kind: "squirrel" },
];

const WANDER_RADIUS = 4;
const HOP_SPEED = 1.6;

export function createCritters(surfaceY = 0) {
  const root = new THREE.Group();
  root.name = "critters";
  const fur = new THREE.MeshStandardMaterial({ color: 0xb98a5e, roughness: 0.9 });
  const light = new THREE.MeshStandardMaterial({ color: 0xe8d5bb, roughness: 0.9 });
  const squirrelFur = new THREE.MeshStandardMaterial({ color: 0xa05f38, roughness: 0.9 });
  const critters = SPAWNS.map((spawn, index) => {
    const critter =
      spawn.kind === "rabbit" ? createRabbit(fur, light) : createSquirrel(squirrelFur, fur);
    critter.position.set(spawn.x, surfaceY, spawn.z);
    critter.rotation.y = Math.random() * Math.PI * 2;
    critter.traverse((node) => {
      if (node.isMesh) node.castShadow = true;
    });
    root.add(critter);
    return {
      mesh: critter,
      home: new THREE.Vector3(spawn.x, surfaceY, spawn.z),
      target: null,
      pause: index * 0.9,
      hopT: 0,
    };
  });
  return {
    root,
    update(delta) {
      critters.forEach((critter) => {
        if (critter.pause > 0) {
          critter.pause -= delta;
          return;
        }
        if (!critter.target) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 1.2 + Math.random() * WANDER_RADIUS;
          critter.target = critter.home
            .clone()
            .add(new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist));
          critter.mesh.lookAt(critter.target.x, critter.mesh.position.y, critter.target.z);
        }
        const toTarget = critter.target.clone().sub(critter.mesh.position);
        toTarget.y = 0;
        const distance = toTarget.length();
        const step = HOP_SPEED * delta;
        critter.hopT += delta;
        // Hop: quick forward steps with a vertical arc and a squash on landing.
        critter.mesh.position.y = 0;
        if (distance <= step) {
          critter.mesh.position.copy(critter.target);
          critter.target = null;
          critter.pause = 0.6 + Math.random() * 2.4;
          critter.mesh.scale.set(1.15, 0.8, 1.15);
        } else {
          toTarget.normalize().multiplyScalar(step);
          critter.mesh.position.add(toTarget);
          const bounce = Math.abs(Math.sin(critter.hopT * 9));
          critter.mesh.position.y = bounce * 0.32;
          critter.mesh.scale.set(1 + bounce * 0.12, 1 - bounce * 0.18, 1);
        }
      });
    },
  };
}

import * as THREE from "three";

const GRASS = new THREE.MeshStandardMaterial({ color: 0x7fae48, roughness: 1, flatShading: true });
const GRASS_DARK = new THREE.MeshStandardMaterial({ color: 0x6c9a3f, roughness: 1, flatShading: true });
const ROCK = new THREE.MeshStandardMaterial({ color: 0x8e908a, roughness: 0.95, flatShading: true });
const DIRT = new THREE.MeshStandardMaterial({ color: 0x8a633f, roughness: 0.98, flatShading: true });
const TRUNK = new THREE.MeshStandardMaterial({ color: 0x6f4527, roughness: 0.95, flatShading: true });
const LEAF = new THREE.MeshStandardMaterial({ color: 0x5d8f4f, roughness: 1, flatShading: true });

export function createKnoll(surfaceY) {
  const root = new THREE.Group();
  root.name = "meadow-knoll";

  const bump = new THREE.Mesh(new THREE.SphereGeometry(3.4, 14, 8), GRASS);
  bump.scale.set(1, 0.34, 1);
  bump.position.y = -0.25;
  root.add(bump);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(3.35, 3.5, 0.28, 14), DIRT);
  skirt.position.y = -0.16;
  root.add(skirt);

  const rocks = [
    [-1.6, 0.62, 1.3, 0.5],
    [-1.2, 0.52, 1.75, 0.3],
    [1.9, 0.5, -1.0, 0.42],
    [2.3, 0.42, -0.55, 0.28],
  ];
  rocks.forEach(([x, y, z, s]) => {
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), ROCK);
    rock.position.set(x, y, z);
    rock.rotation.set(x * 2, z * 3, x + z);
    rock.castShadow = true;
    root.add(rock);
  });

  // lone tree crowning the knoll
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 1.1, 6), TRUNK);
  trunk.position.y = 0.55;
  tree.add(trunk);
  for (let i = 0; i < 3; i += 1) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.85 - i * 0.18, 0.8, 8), i === 1 ? LEAF : GRASS_DARK);
    cone.position.y = 1.15 + i * 0.5;
    cone.castShadow = true;
    tree.add(cone);
  }
  tree.position.set(0.3, 0.82, -0.4);
  tree.rotation.z = 0.05;
  root.add(tree);

  const clover = new THREE.MeshStandardMaterial({ color: 0x86a556, roughness: 1, flatShading: true });
  let seed = 7001;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 9; i += 1) {
    const a = rand() * Math.PI * 2;
    const r = 1.6 + rand() * 1.4;
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 4), clover);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    tuft.position.set(x, 1.02 - (x * x + z * z) * 0.055, z);
    root.add(tuft);
  }

  root.traverse((node) => {
    if (node.isMesh) node.receiveShadow = true;
  });
  root.position.set(-16.5, surfaceY, -13.5);
  root.rotation.y = 0.4;

  function update(delta, elapsed) {
    tree.rotation.z = 0.05 + Math.sin(elapsed * 0.8) * 0.02;
  }
  return { root, update };
}

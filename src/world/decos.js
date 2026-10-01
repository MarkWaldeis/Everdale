import * as THREE from "three";

const WOOD = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.9, flatShading: true });
const WOOD_DARK = new THREE.MeshStandardMaterial({ color: 0x6f4527, roughness: 0.95, flatShading: true });
const STRAW = new THREE.MeshStandardMaterial({ color: 0xd9b95c, roughness: 1, flatShading: true });
const CLOTH = new THREE.MeshStandardMaterial({ color: 0xa8543c, roughness: 0.85, flatShading: true });
const SKIN = new THREE.MeshStandardMaterial({ color: 0xe0b07a, roughness: 0.8, flatShading: true });
export const LANTERN_GLASS = new THREE.MeshStandardMaterial({
  color: 0xffd98a,
  emissive: 0xffb84d,
  emissiveIntensity: 0.85,
  roughness: 0.35,
  flatShading: true,
});
const IRON = new THREE.MeshStandardMaterial({ color: 0x4a4640, roughness: 0.55, metalness: 0.5, flatShading: true });

function mesh(geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function lantern() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.5, 6), WOOD_DARK, 0, 0.75, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.1, 6), WOOD, 0, 0.06, 0));
  const cage = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.24, 6, 1, true), IRON, 0, 1.55, 0);
  cage.material = IRON.clone();
  cage.material.side = THREE.DoubleSide;
  g.add(cage);
  g.add(mesh(new THREE.SphereGeometry(0.075, 8, 6), LANTERN_GLASS, 0, 1.55, 0));
  g.add(mesh(new THREE.ConeGeometry(0.14, 0.14, 6), WOOD_DARK, 0, 1.74, 0));
  const arm = mesh(new THREE.BoxGeometry(0.34, 0.05, 0.05), WOOD_DARK, 0, 1.66, 0);
  g.add(arm);
  return g;
}

function bench() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(1.05, 0.07, 0.3), WOOD, 0, 0.34, 0));
  g.add(mesh(new THREE.BoxGeometry(1.05, 0.07, 0.12), WOOD, 0, 0.62, -0.16));
  g.add(mesh(new THREE.BoxGeometry(1.05, 0.07, 0.12), WOOD, 0, 0.5, -0.17));
  for (const x of [-0.44, 0.44]) {
    g.add(mesh(new THREE.BoxGeometry(0.08, 0.34, 0.3), WOOD_DARK, x, 0.17, 0));
    g.add(mesh(new THREE.BoxGeometry(0.07, 0.36, 0.08), WOOD_DARK, x, 0.5, -0.15));
  }
  return g;
}

function scarecrow() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.6, 6), WOOD_DARK, 0, 0.8, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.05, 5), WOOD_DARK, 0, 1.25, 0)
    .rotateZ(Math.PI / 2));
  const body = mesh(new THREE.ConeGeometry(0.28, 0.7, 7), CLOTH, 0, 1.0, 0);
  g.add(body);
  g.add(mesh(new THREE.SphereGeometry(0.17, 8, 6), SKIN, 0, 1.52, 0));
  g.add(mesh(new THREE.ConeGeometry(0.2, 0.3, 7), STRAW, 0, 1.72, 0));
  for (const x of [-0.52, 0.52]) {
    g.add(mesh(new THREE.SphereGeometry(0.09, 6, 5), STRAW, x, 1.25, 0));
  }
  return g;
}

const BUILDERS = {
  "deko-lantern": lantern,
  "deko-bench": bench,
  "deko-scarecrow": scarecrow,
};

export function createDecoMesh(type) {
  return BUILDERS[type]?.() ?? null;
}

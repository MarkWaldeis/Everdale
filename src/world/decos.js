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
export const LANTERN_HALO = new THREE.MeshBasicMaterial({
  color: 0xffc76a,
  transparent: true,
  opacity: 0.12,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

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
  const halo = mesh(new THREE.SphereGeometry(0.22, 10, 8), LANTERN_HALO, 0, 1.55, 0);
  halo.castShadow = false;
  g.add(halo);
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
  "deko-banner": banner,
  "deko-founder": founderStatue,
  "deko-firepit": firepit,
};

const activeFlames = [];

function banner() {
  const g = new THREE.Group();
  const poles = [-0.5, 0.5];
  poles.forEach((x) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 1.15, 6), WOOD_DARK);
    pole.position.set(x, 0.575, 0);
    g.add(pole);
  });
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 4), new THREE.MeshStandardMaterial({ color: 0xcbb894, roughness: 1 }));
  rope.rotation.z = Math.PI / 2;
  rope.position.y = 1.08;
  g.add(rope);
  const pennants = [
    { c: 0xc94f3d, x: -0.32 },
    { c: 0xe8b93f, x: -0.11 },
    { c: 0x5d8f4f, x: 0.1 },
    { c: 0x4f74a5, x: 0.31 },
  ];
  pennants.forEach(({ c, x }) => {
    const flag = new THREE.Mesh(
      new THREE.ConeGeometry(0.07, 0.22, 4),
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, flatShading: true }),
    );
    flag.rotation.x = Math.PI;
    flag.position.set(x, 0.97, 0);
    g.add(flag);
  });
  return g;
}

function founderStatue() {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x8e908a, roughness: 0.9, flatShading: true });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4a93f, roughness: 0.45, metalness: 0.6, flatShading: true });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.5), stone);
  base.position.y = 0.08;
  g.add(base);
  const column = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.3), stone);
  column.position.y = 0.37;
  g.add(column);
  const figure = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.3, 7), gold);
  torso.position.y = 0.15;
  figure.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), gold);
  head.position.y = 0.37;
  figure.add(head);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.26, 0.07), gold);
  arm.position.set(0.13, 0.24, 0);
  arm.rotation.z = -0.9;
  figure.add(arm);
  figure.position.y = 0.58;
  g.add(figure);
  return g;
}

function firepit() {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x777a74, roughness: 0.95, flatShading: true });
  for (let i = 0; i < 7; i += 1) {
    const a = (i / 7) * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), stone);
    rock.scale.y = 0.7;
    rock.position.set(Math.cos(a) * 0.28, 0.05, Math.sin(a) * 0.28);
    g.add(rock);
  }
  const logs = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.4, 5), WOOD_DARK);
  logs.rotation.z = Math.PI / 2.2;
  logs.position.y = 0.1;
  g.add(logs);
  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xff8a2a,
    emissive: 0xff6a10,
    emissiveIntensity: 1.6,
    roughness: 0.5,
    transparent: true,
    opacity: 0.92,
    flatShading: true,
  });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 6), flameMat);
  flame.position.y = 0.24;
  flame.userData.flameRole = "outer";
  g.add(flame);
  const core = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.18, 5),
    new THREE.MeshStandardMaterial({ color: 0xffd35e, emissive: 0xffbe3d, emissiveIntensity: 2.2, flatShading: true }),
  );
  core.position.y = 0.2;
  core.userData.flameRole = "core";
  g.add(core);
  activeFlames.push({ flame, core, seed: Math.random() * 10 });
  return g;
}

export function registerFirepitFlames(root) {
  const outer = [];
  const core = [];
  root.traverse?.((node) => {
    if (node.userData?.flameRole === "outer") outer.push(node);
    if (node.userData?.flameRole === "core") core.push(node);
  });
  outer.forEach((flame, i) => activeFlames.push({ flame, core: core[i], seed: Math.random() * 10 }));
}

export function flickerDecos(elapsed) {
  activeFlames.forEach(({ flame, core, seed }) => {
    const w = Math.sin(elapsed * 9 + seed) * 0.5 + Math.sin(elapsed * 23 + seed * 2) * 0.5;
    flame.scale.set(1 + w * 0.16, 1 + w * 0.28, 1 + w * 0.16);
    flame.rotation.y += w * 0.02;
    core.scale.set(1 + w * 0.1, 1 + w * 0.35, 1 + w * 0.1);
    flame.material.emissiveIntensity = 1.5 + w * 0.5;
  });
}

export function createDecoMesh(type) {
  return BUILDERS[type]?.() ?? null;
}

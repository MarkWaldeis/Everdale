import * as THREE from "three";

const WALL = new THREE.MeshStandardMaterial({ color: 0x9db06a, roughness: 0.95, flatShading: true });
const ROOF = new THREE.MeshStandardMaterial({ color: 0x7a4a2f, roughness: 0.9, flatShading: true });
const WOOD = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.95, flatShading: true });
const DARK = new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 0.9, flatShading: true });
const APPLE = new THREE.MeshStandardMaterial({ color: 0xd04a3a, roughness: 0.7, flatShading: true });
const JUICE = new THREE.MeshStandardMaterial({ color: 0xe8a83e, roughness: 0.4, transparent: true, opacity: 0.85, flatShading: true });

export function createJuicePressModel() {
  const root = new THREE.Group();
  root.name = "juice-press-model";

  const hut = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.1, 1.3), WALL);
  hut.position.y = 0.55;
  hut.castShadow = true;
  root.add(hut);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.8, 4), ROOF);
  roof.position.y = 1.5;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  root.add(roof);

  // the press: frame + screw + basin + jug
  const press = new THREE.Group();
  const postL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.08), DARK);
  postL.position.set(-0.28, 0.42, 0);
  const postR = postL.clone();
  postR.position.x = 0.28;
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.1, 0.12), DARK);
  beam.position.y = 0.85;
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 7), WOOD);
  screw.position.y = 0.62;
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 10), WOOD);
  plate.position.y = 0.38;
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.2, 10), DARK);
  basin.position.y = 0.1;
  const jug = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.2, 7), JUICE);
  jug.position.set(0.42, 0.1, 0.16);
  press.add(postL, postR, beam, screw, plate, basin, jug);
  press.position.set(0.35, 0, 0.95);
  root.add(press);
  screw.userData.spin = true;
  root.userData.screw = screw;

  // apple crates
  for (let i = 0; i < 2; i += 1) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.24, 0.3), WOOD);
    crate.position.set(-0.7 + i * 0.42, 0.12, 1.0);
    root.add(crate);
    for (let a = 0; a < 3; a += 1) {
      const apple = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), APPLE);
      apple.position.set(-0.8 + i * 0.42 + a * 0.1, 0.28, 1.0);
      root.add(apple);
    }
  }

  // small barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.34, 9), WOOD);
  barrel.position.set(-0.9, 0.17, 0.5);
  root.add(barrel);
  return root;
}

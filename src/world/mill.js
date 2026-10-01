import * as THREE from "three";

const STONE = new THREE.MeshStandardMaterial({ color: 0xb7a48c, roughness: 0.95, flatShading: true });
const WOOD = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.9, flatShading: true });
const WOOD_DARK = new THREE.MeshStandardMaterial({ color: 0x6b4225, roughness: 0.92, flatShading: true });
const ROOF = new THREE.MeshStandardMaterial({ color: 0xa8433a, roughness: 0.88, flatShading: true });
const SAIL = new THREE.MeshStandardMaterial({
  color: 0xefe6cf,
  roughness: 0.9,
  side: THREE.DoubleSide,
});

export function createMillModel() {
  const model = new THREE.Group();
  model.name = "mill-model";

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.62, 2.3, 10), STONE);
  tower.position.y = 1.15;
  tower.castShadow = true;
  tower.receiveShadow = true;
  model.add(tower);

  const bands = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.045, 6, 14), WOOD_DARK);
  bands.rotation.x = Math.PI / 2;
  bands.position.y = 1.2;
  model.add(bands);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.9), WOOD);
  cabin.position.y = 2.55;
  cabin.castShadow = true;
  model.add(cabin);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.78, 0.75, 8), ROOF);
  roof.position.y = 3.32;
  roof.castShadow = true;
  model.add(roof);

  const roofCap = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), WOOD_DARK);
  roofCap.position.y = 3.72;
  model.add(roofCap);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.55, 0.06), WOOD_DARK);
  door.position.set(0, 0.29, 0.6);
  model.add(door);

  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.65, 0.05), WOOD);
  doorFrame.position.set(0, 0.34, 0.585);
  model.add(doorFrame);
  door.position.z = 0.615;

  const windowMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.22, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xf4d96b, emissive: 0x6a5518, emissiveIntensity: 0.4 }),
  );
  windowMesh.position.set(0.24, 1.55, 0.5);
  model.add(windowMesh);

  const rotor = new THREE.Group();
  rotor.name = "mill-rotor";
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), WOOD_DARK);
  rotor.add(hub);
  for (let i = 0; i < 4; i += 1) {
    const blade = new THREE.Group();
    const spar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.15, 5), WOOD_DARK);
    spar.position.y = 0.58;
    blade.add(spar);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.9), SAIL);
    sail.position.set(0.17, 0.62, 0);
    blade.add(sail);
    blade.rotation.z = (i * Math.PI) / 2;
    rotor.add(blade);
  }
  rotor.position.set(0, 2.58, 0.55);
  model.add(rotor);

  const sack = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 6), SAIL);
  sack.scale.set(1, 0.82, 1);
  sack.position.set(0.5, 0.14, 0.38);
  sack.castShadow = true;
  model.add(sack);

  return { model, rotor };
}

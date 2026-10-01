import * as THREE from "three";

const ROCK = new THREE.MeshStandardMaterial({ color: 0x7e8fa6, roughness: 1, flatShading: true });
const ROCK_DARK = new THREE.MeshStandardMaterial({ color: 0x6b7d94, roughness: 1, flatShading: true });
const SNOW = new THREE.MeshStandardMaterial({ color: 0xf4f8fb, roughness: 0.85, flatShading: true });
const FOREST_LINE = new THREE.MeshStandardMaterial({ color: 0x4d7a52, roughness: 1, flatShading: true });

export function createMountains(worldRadius = 34) {
  const root = new THREE.Group();
  root.name = "mountains";

  let seed = 20261002;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Two concentric ridge rings — a darker near ridge and a paler far one,
  // echoing the layered hills around the original's valley.
  const peaks = 16;
  for (let i = 0; i < peaks; i += 1) {
    const angle = (i / peaks) * Math.PI * 2 + rand() * 0.16;
    const radius = worldRadius + 16 + rand() * 7;
    const height = 9 + rand() * 9;
    const width = 8 + rand() * 6;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const peak = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.ConeGeometry(width, height, 5 + Math.floor(rand() * 3), 1),
      rand() > 0.45 ? ROCK : ROCK_DARK,
    );
    base.position.y = height * 0.5 - 2.2;
    base.rotation.y = rand() * Math.PI;
    peak.add(base);
    if (height > 11) {
      const capHeight = height * 0.32;
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(width * 0.34, capHeight, 5, 1),
        SNOW,
      );
      cap.position.y = height - 2.2 - capHeight * 0.5;
      cap.rotation.y = base.rotation.y;
      peak.add(cap);
    }
    // dark green conifer band hugging the foot of each peak
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(width * 0.72, width * 0.92, 1.6, 6),
      FOREST_LINE,
    );
    band.position.y = 0.4;
    peak.add(band);
    peak.position.set(x, 0, z);
    root.add(peak);
  }

  const far = new THREE.Mesh(
    new THREE.TorusGeometry(worldRadius + 30, 7, 5, 40),
    new THREE.MeshStandardMaterial({ color: 0x93a6bd, roughness: 1, flatShading: true }),
  );
  far.rotation.x = Math.PI / 2;
  far.position.y = -1.2;
  far.scale.z = 0.55;
  root.add(far);

  return { root };
}

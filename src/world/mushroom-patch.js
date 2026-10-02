import * as THREE from "three";

const STEM = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.95, flatShading: true });
const CAP = new THREE.MeshStandardMaterial({ color: 0xc9544a, roughness: 0.85, flatShading: true });
const CAP2 = new THREE.MeshStandardMaterial({ color: 0xb37a3f, roughness: 0.9, flatShading: true });
const DOT = new THREE.MeshStandardMaterial({ color: 0xf5efe2, roughness: 0.9, flatShading: true });
const GLOW = new THREE.MeshBasicMaterial({ color: 0xa8e0ff, transparent: true, opacity: 0.3 });

function makeMushroom(scale, capMat) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.18, 6), STEM);
  stem.position.y = 0.09;
  g.add(stem);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
  cap.scale.y = 0.72;
  cap.position.y = 0.18;
  cap.castShadow = true;
  g.add(cap);
  for (let i = 0; i < 3; i += 1) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 4), DOT);
    const a = (i / 3) * Math.PI * 2 + 0.6;
    dot.position.set(Math.cos(a) * 0.06, 0.23, Math.sin(a) * 0.06);
    g.add(dot);
  }
  g.scale.setScalar(scale);
  return g;
}

export function createMushroomPatch(surfaceY) {
  const root = new THREE.Group();
  root.name = "mushroom-patch";
  root.visible = false;

  const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.05, 10), GLOW);
  glow.position.y = 0.03;
  root.add(glow);

  const spots = [
    [-0.18, 0.05, 1.0, CAP],
    [0.14, -0.12, 0.8, CAP],
    [0.3, 0.14, 0.65, CAP2],
    [-0.05, 0.3, 0.55, CAP],
    [-0.34, -0.22, 0.7, CAP2],
  ];
  spots.forEach(([x, z, s, m]) => {
    const shroom = makeMushroom(s, m);
    shroom.position.set(x, 0, z);
    shroom.rotation.y = x * 5;
    root.add(shroom);
  });

  const hitProxy = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 0.9, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitProxy.name = "hit-proxy";
  hitProxy.position.y = 0.35;
  root.add(hitProxy);

  let spawnAt = -1;

  function show(position, elapsed) {
    root.position.set(position.x, surfaceY, position.z);
    root.rotation.y = Math.random() * Math.PI * 2;
    root.visible = true;
    root.scale.setScalar(0.01);
    spawnAt = elapsed;
  }
  function hide() {
    root.visible = false;
    spawnAt = -1;
  }
  function update(delta, elapsed) {
    if (!root.visible) return;
    if (spawnAt >= 0) {
      const t = Math.min((elapsed - spawnAt) / 0.5, 1);
      root.scale.setScalar(0.01 + 0.99 * (1 - (1 - t) ** 3));
      if (t >= 1) root.scale.setScalar(1);
    }
    glow.material.opacity = 0.26 + Math.sin(elapsed * 2.8) * 0.14;
  }
  return { root, show, hide, update };
}

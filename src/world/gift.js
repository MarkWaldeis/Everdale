import * as THREE from "three";

const CRATE = new THREE.MeshStandardMaterial({ color: 0xa8743d, roughness: 0.85, flatShading: true });
const RIBBON = new THREE.MeshStandardMaterial({
  color: 0xd64533,
  roughness: 0.6,
  flatShading: true,
  emissive: 0x5a1608,
  emissiveIntensity: 0.25,
});
const GLOW = new THREE.MeshStandardMaterial({
  color: 0xffe08a,
  transparent: true,
  opacity: 0.45,
  roughness: 1,
});

export function createGiftBox(surfaceY) {
  const root = new THREE.Group();
  root.name = "gift-box";
  root.visible = false;

  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.42), CRATE);
  crate.position.y = 0.18;
  crate.castShadow = true;
  root.add(crate);

  const bandX = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.12), RIBBON);
  bandX.position.y = 0.18;
  root.add(bandX);
  const bandZ = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.46), RIBBON);
  bandZ.position.y = 0.18;
  root.add(bandZ);

  const bow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 5), RIBBON);
  bow.scale.set(1.3, 0.6, 0.8);
  bow.position.y = 0.42;
  root.add(bow);

  const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.06, 10), GLOW);
  glow.position.y = 0.03;
  root.add(glow);

  const hitProxy = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 1.2, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitProxy.name = "hit-proxy";
  hitProxy.position.y = 0.5;
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
      root.scale.setScalar(0.01 + 0.99 * (1 - (1 - t) ** 3) * (t >= 0.9 ? 1 + (1 - t) * 0.6 : 1));
      if (t >= 1) root.scale.setScalar(1);
    }
    glow.material.opacity = 0.32 + Math.sin(elapsed * 3.2) * 0.16;
    bow.rotation.y += delta * 2.4;
  }

  return { root, show, hide, update };
}

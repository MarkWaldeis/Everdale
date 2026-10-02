import * as THREE from "three";

export function createShootingStar() {
  const root = new THREE.Group();
  root.name = "shooting-star";

  const mat = new THREE.MeshBasicMaterial({
    color: 0xeaf6ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const headMat = mat.clone();
  headMat.opacity = 0;
  const streak = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.005, 3.2, 5), mat);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), headMat);
  const meteor = new THREE.Group();
  meteor.add(streak, head);
  streak.rotation.z = Math.PI / 2;
  streak.position.x = -1.7;
  meteor.visible = false;
  root.add(meteor);

  let flyAt = -1;
  let nextAt = 10;
  let from = new THREE.Vector3();
  let dir = new THREE.Vector3();
  const FLY_SECS = 1.1;

  function plan(elapsed) {
    flyAt = elapsed;
    const a = Math.random() * Math.PI * 2;
    const r = 30 + Math.random() * 30;
    from.set(Math.cos(a) * r, 34 + Math.random() * 18, Math.sin(a) * r);
    dir.set((Math.random() - 0.5) * 1.6, -0.35 - Math.random() * 0.3, (Math.random() - 0.5) * 1.6).normalize();
    meteor.position.copy(from);
    meteor.rotation.y = Math.atan2(dir.x, dir.z);
    meteor.rotation.z = Math.atan2(-dir.y, Math.hypot(dir.x, dir.z));
    meteor.visible = true;
  }

  function update(delta, elapsed, night) {
    if (flyAt < 0 && night > 0.7 && elapsed >= nextAt) plan(elapsed);
    if (flyAt >= 0) {
      const t = (elapsed - flyAt) / FLY_SECS;
      if (t >= 1) {
        flyAt = -1;
        meteor.visible = false;
        mat.opacity = 0;
        headMat.opacity = 0;
        nextAt = elapsed + 25 + Math.random() * 45;
      } else {
        meteor.position.copy(from).addScaledVector(dir, t * 26);
        const fade = Math.sin(t * Math.PI);
        mat.opacity = 0.65 * fade;
        headMat.opacity = 0.95 * fade;
      }
    }
  }
  return { root, update };
}

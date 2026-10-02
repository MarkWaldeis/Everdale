import * as THREE from "three";

const COLORS = [0xe8544a, 0xf0b23e, 0x5fb95f, 0x4a90d9, 0xc06ae0, 0xf5efe2];
const LIFETIME = 1.7;

export function createConfetti() {
  const root = new THREE.Group();
  root.name = "confetti";
  const pieces = [];

  function burst(position, count = 26) {
    for (let i = 0; i < count; i += 1) {
      const mat = new THREE.MeshBasicMaterial({
        color: COLORS[i % COLORS.length],
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
      });
      const piece = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.045), mat);
      piece.position.set(
        position.x + (Math.random() - 0.5) * 0.3,
        position.y + Math.random() * 0.3,
        position.z + (Math.random() - 0.5) * 0.3,
      );
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 1.6;
      pieces.push({
        mesh: piece,
        vx: Math.cos(angle) * speed,
        vy: 2.2 + Math.random() * 2.2,
        vz: Math.sin(angle) * speed,
        spin: (Math.random() - 0.5) * 14,
        born: performance.now() / 1000,
      });
      root.add(piece);
    }
  }

  function update(delta, elapsed) {
    for (let i = pieces.length - 1; i >= 0; i -= 1) {
      const p = pieces[i];
      const age = elapsed - p.born;
      if (age > LIFETIME) {
        root.remove(p.mesh);
        p.mesh.material.dispose();
        pieces.splice(i, 1);
        continue;
      }
      p.vy -= 3.4 * delta;
      p.mesh.position.x += p.vx * delta;
      p.mesh.position.y += p.vy * delta;
      p.mesh.position.z += p.vz * delta;
      p.mesh.rotation.x += p.spin * delta;
      p.mesh.rotation.y += p.spin * 0.7 * delta;
      p.mesh.material.opacity = Math.min(1, (LIFETIME - age) * 2.5);
    }
  }
  return { root, burst, update };
}

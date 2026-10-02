import * as THREE from "three";

function fogTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(64, 32, 4, 64, 32, 60);
  grad.addColorStop(0, "rgba(215,228,235,0.85)");
  grad.addColorStop(0.6, "rgba(215,228,235,0.35)");
  grad.addColorStop(1, "rgba(215,228,235,0)");
  ctx.fillStyle = grad;
  ctx.save();
  ctx.scale(1, 0.55);
  ctx.fillRect(0, 20, 128, 96);
  ctx.restore();
  return new THREE.CanvasTexture(canvas);
}

export function createFog(surfaceY) {
  const root = new THREE.Group();
  root.name = "dawn-fog";
  const tex = fogTexture();
  const wisps = [];
  let seed = 9017;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 5; i += 1) {
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(7 + rand() * 5, 2.4 + rand() * 1.2), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = rand() * Math.PI;
    const wisp = {
      mesh,
      x: -14 + rand() * 10,
      z: -6 + rand() * 8,
      speed: 0.14 + rand() * 0.12,
      seed: rand() * 10,
    };
    mesh.position.set(wisp.x, surfaceY + 0.16, wisp.z);
    root.add(mesh);
    wisps.push(wisp);
  }
  // fog only in early morning (dayFactor ramps in before full day)
  function update(delta, elapsed, fogStrength = 0) {
    wisps.forEach((w) => {
      w.x += w.speed * delta;
      if (w.x > 4) w.x = -16;
      w.mesh.position.x = w.x;
      const pulse = 0.75 + Math.sin(elapsed * 0.25 + w.seed) * 0.25;
      w.mesh.material.opacity = 0.5 * pulse * fogStrength;
    });
  }
  return { root, update };
}

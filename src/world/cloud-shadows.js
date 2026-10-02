import * as THREE from "three";

function blobTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, "rgba(20,30,40,0.42)");
  grad.addColorStop(0.55, "rgba(20,30,40,0.2)");
  grad.addColorStop(1, "rgba(20,30,40,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

export function createCloudShadows(walkArea) {
  const root = new THREE.Group();
  root.name = "cloud-shadows";
  const tex = blobTexture();
  const blobs = [];
  let seed = 41127;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 4; i += 1) {
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const w = 9 + rand() * 7;
    const h = 6 + rand() * 5;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = rand() * Math.PI;
    mesh.renderOrder = 0;
    const blob = {
      mesh,
      x: (rand() * 2 - 1) * walkArea.radiusX * 1.4,
      z: (rand() * 2 - 1) * walkArea.radiusZ * 1.4,
      speed: 0.55 + rand() * 0.35,
      dir: 0.5 + rand() * 0.5, // windish direction
      seed: rand() * 10,
    };
    mesh.position.set(blob.x, walkArea.surfaceY + 0.02, blob.z);
    root.add(mesh);
    blobs.push(blob);
  }
  function update(delta, elapsed, dayFactor = 1) {
    blobs.forEach((b) => {
      b.x += Math.cos(b.dir) * b.speed * delta;
      b.z += Math.sin(b.dir) * b.speed * delta;
      const ex = Math.abs(b.x) / (walkArea.radiusX * 1.5);
      const ez = Math.abs(b.z) / (walkArea.radiusZ * 1.5);
      if (ex > 1 || ez > 1) {
        b.x = -Math.cos(b.dir) * walkArea.radiusX * 1.45;
        b.z = (Math.sin(b.dir) * walkArea.radiusZ * 1.45) * (Math.random() * 2 - 1);
      }
      b.mesh.position.x = b.x;
      b.mesh.position.z = b.z;
      const pulse = 0.7 + Math.sin(elapsed * 0.35 + b.seed) * 0.3;
      b.mesh.material.opacity = 0.5 * pulse * dayFactor;
    });
  }
  return { root, update };
}

import * as THREE from "three";

const LIFETIME = 38;

function makeRainbowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const colors = ["#e23a3a", "#ef8a2a", "#f2d23a", "#5cb344", "#3a8fd2", "#5a4fc9", "#8a4fb0"];
  const cx = 256;
  const cy = 250;
  colors.forEach((color, i) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 7;
    ctx.arc(cx, cy, 220 - i * 7, Math.PI, Math.PI * 2);
    ctx.stroke();
  });
  // soft edge: vertical fade mask at the arc ends
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.72, "rgba(0,0,0,1)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);
  return new THREE.CanvasTexture(canvas);
}

export function createRainbow() {
  const tex = makeRainbowTexture();
  const material = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(52, 26), material);
  mesh.position.set(-4, 13.5, -34);
  mesh.renderOrder = 1;
  const state = { active: false, t: 0 };
  function trigger() {
    if (state.active) return;
    state.active = true;
    state.t = 0;
    mesh.visible = true;
  }
  function update(delta) {
    if (!state.active) return;
    state.t += delta;
    const t = state.t;
    if (t >= LIFETIME) {
      state.active = false;
      mesh.visible = false;
      material.opacity = 0;
      return;
    }
    const fadeIn = Math.min(1, t / 6);
    const fadeOut = Math.max(0, 1 - Math.max(0, t - (LIFETIME - 10)) / 10);
    material.opacity = fadeIn * fadeOut * 0.72;
  }
  mesh.visible = false;
  return { root: mesh, update, trigger, state };
}

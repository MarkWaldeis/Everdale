import * as THREE from "three";

const SMOKE_MAT = new THREE.MeshStandardMaterial({
  color: 0xe8e6df,
  transparent: true,
  opacity: 0.55,
  roughness: 1,
  flatShading: true,
});

// Puffs spawn at each chimney anchor, rise, swell, fade and recycle.
// Sources can be toggled per building (e.g. bakery only while baking).
export function createChimneySmoke(sources) {
  const root = new THREE.Group();
  root.name = "chimney-smoke";
  const puffs = [];
  let seed = 20261005;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  sources.forEach((src, index) => {
    for (let i = 0; i < 4; i += 1) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), SMOKE_MAT.clone());
      puff.userData = {
        src: index,
        offset: (i / 4) * 1 + rand() * 0.2,
        drift: rand() * Math.PI * 2,
      };
      root.add(puff);
      puffs.push(puff);
    }
  });
  const LIFETIME = 2.6;
  function update(delta, elapsed, wind = 1) {
    puffs.forEach((puff) => {
      const src = sources[puff.userData.src];
      puff.userData.offset += delta / LIFETIME;
      if (puff.userData.offset >= 1) puff.userData.offset -= 1;
      const t = puff.userData.offset;
      const active = !src.isOn || src.isOn();
      const rise = t * 2.1;
      const sway = Math.sin(elapsed * 1.6 + puff.userData.drift + t * 3) * 0.08;
      puff.position.set(
        src.position.x + sway + wind * t * 0.5,
        src.position.y + rise,
        src.position.z + Math.cos(elapsed * 1.1 + puff.userData.drift) * 0.06,
      );
      const scale = 0.5 + t * 1.4;
      puff.scale.setScalar(scale);
      puff.material.opacity = active ? Math.max(0, (1 - t) * 0.55 - (src.fadeIn ? Math.max(0, 1 - t * 8) * 0.55 : 0)) : 0;
    });
  }
  return { root, update };
}

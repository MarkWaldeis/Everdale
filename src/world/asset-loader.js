import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

function prepareMaterials(root) {
  root.traverse((child) => {
    if (!child.isMesh) return;

    child.castShadow = true;
    child.receiveShadow = true;

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.filter(Boolean).forEach((material) => {
      material.roughness = Math.max(material.roughness ?? 0.75, 0.62);
      material.metalness = Math.min(material.metalness ?? 0, 0.06);
      material.needsUpdate = true;
    });
  });
}

function centerOnGround(root) {
  const bounds = new THREE.Box3().setFromObject(root);
  const center = bounds.getCenter(new THREE.Vector3());

  root.position.x -= center.x;
  root.position.y -= bounds.min.y;
  root.position.z -= center.z;

  return new THREE.Box3().setFromObject(root);
}

export async function loadWorldAssets(manifest, onProgress) {
  const entries = Object.entries(manifest);
  const loader = new GLTFLoader();
  const result = {};
  let completed = 0;

  await Promise.all(
    entries.map(async ([id, definition]) => {
      // Manifest URLs are produced by `new URL(..., import.meta.url)`, so Vite
      // already escapes them and can fingerprint the GLBs for production.
      const gltf = await loader.loadAsync(definition.url);
      const root = gltf.scene;
      prepareMaterials(root);

      if (!definition.raw) {
        const bounds = centerOnGround(root);
        if (definition.height) {
          const size = bounds.getSize(new THREE.Vector3());
          const scale = definition.height / Math.max(size.y, 0.001);
          root.scale.multiplyScalar(scale);
          centerOnGround(root);
        }
      }

      root.userData.animationClips = gltf.animations;
      result[id] = root;
      completed += 1;
      onProgress?.({ completed, total: entries.length, label: definition.label });
    }),
  );

  return result;
}

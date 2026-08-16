import * as THREE from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";

export function captureCharacterPortrait(sourceModel, width = 256, height = 336) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1f5a28);

  const clone = cloneSkinned(sourceModel);
  clone.visible = true;
  clone.position.set(0, 0, 0);
  clone.rotation.set(0, 0.42, 0);
  clone.traverse((child) => {
    if (child.name === "axe-grip" || child.name === "carried-axe") {
      child.visible = false;
    }
    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });
  scene.add(clone);

  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x3d5a28, 1.7));
  const key = new THREE.DirectionalLight(0xfff1c8, 2.6);
  key.position.set(-1.4, 2.4, 2.2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xaed8ff, 0.7);
  fill.position.set(1.8, 1.2, 1.2);
  scene.add(fill);

  clone.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(clone);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const look = new THREE.Vector3(center.x, bounds.min.y + size.y * 0.76, center.z);

  const camera = new THREE.PerspectiveCamera(26, width / height, 0.04, 8);
  camera.position.set(look.x + 0.06, look.y + 0.02, look.z + Math.max(size.y * 0.62, 0.48));
  camera.lookAt(look);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.render(scene, camera);

  const url = renderer.domElement.toDataURL("image/png");
  renderer.dispose();
  return url;
}

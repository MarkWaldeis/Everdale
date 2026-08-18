import * as THREE from "three";

const HARBOR_POSITION = new THREE.Vector3(38, 0, -10);
const HARBOR_YAW = -0.4;

export function createValleyHarbor(model, surfaceY) {
  const root = new THREE.Group();
  root.name = "valley-harbor";
  root.add(model);
  root.position.set(HARBOR_POSITION.x, surfaceY, HARBOR_POSITION.z);
  root.userData.groundY = surfaceY;
  root.rotation.y = HARBOR_YAW;
  root.visible = false;
  root.updateWorldMatrix(true, true);

  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());

  return {
    root,
    size,
    center,
    surfaceY,
    lookTarget: new THREE.Vector3(HARBOR_POSITION.x, surfaceY + 0.6, HARBOR_POSITION.z),
    cameraAnchor: new THREE.Vector3(HARBOR_POSITION.x + 11, surfaceY + 9, HARBOR_POSITION.z + 12),
    setVisible(value) {
      root.visible = Boolean(value);
    },
  };
}

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const FIELD_POSITION = new THREE.Vector3(11.4, 0, 5.4);
const FIELD_YAW = -0.45;
const ROWS = 5;
const PER_ROW = 8;
const ROW_SPACING = 0.42;
const STALK_SPACING = 0.3;

function stalkGeometry() {
  const stem = new THREE.CylinderGeometry(0.014, 0.02, 0.5, 4);
  stem.translate(0, 0.25, 0);
  const head = new THREE.ConeGeometry(0.05, 0.18, 5);
  head.translate(0, 0.58, 0);
  return mergeGeometries([stem, head]);
}

export function createWheatField(surfaceY) {
  const root = new THREE.Group();
  root.name = "wheat-field";
  root.position.set(FIELD_POSITION.x, surfaceY, FIELD_POSITION.z);
  root.rotation.y = FIELD_YAW;

  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.25, 0.14, 20),
    new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 1, flatShading: true }),
  );
  soil.scale.z = 0.78;
  soil.position.y = 0.02;
  soil.receiveShadow = true;
  root.add(soil);

  const border = new THREE.Mesh(
    new THREE.TorusGeometry(1.16, 0.05, 6, 24),
    new THREE.MeshStandardMaterial({ color: 0x8a6338, roughness: 1, flatShading: true }),
  );
  border.rotation.x = Math.PI / 2;
  border.scale.z = 0.78;
  border.position.y = 0.09;
  root.add(border);

  const rows = [];
  const geometry = stalkGeometry();
  const material = new THREE.MeshStandardMaterial({
    color: 0xd9a83f,
    roughness: 0.9,
    flatShading: true,
  });
  const stalks = new THREE.InstancedMesh(geometry, material, ROWS * PER_ROW);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let index = 0;
  for (let row = 0; row < ROWS; row += 1) {
    const rowGroup = new THREE.Group();
    rowGroup.position.z = (row - (ROWS - 1) / 2) * ROW_SPACING;
    rows.push(rowGroup);
    root.add(rowGroup);
    for (let i = 0; i < PER_ROW; i += 1) {
      const x = (i - (PER_ROW - 1) / 2) * STALK_SPACING + (row % 2 ? STALK_SPACING * 0.5 : 0);
      dummy.position.set(x, 0.09, rowGroup.position.z * 0.78);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.14);
      const scale = 0.8 + Math.random() * 0.45;
      dummy.scale.set(scale, scale * (0.85 + Math.random() * 0.4), scale);
      dummy.updateMatrix();
      dummy.matrix.elements[13] = 0.09;
      stalks.setMatrixAt(index, dummy.matrix);
      color.setHSL(0.11 + Math.random() * 0.02, 0.55 + Math.random() * 0.15, 0.45 + Math.random() * 0.12);
      stalks.setColorAt(index, color);
      index += 1;
    }
  }
  stalks.castShadow = true;
  root.add(stalks);

  const hitProxy = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 1.2, 10),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitProxy.name = "hit-proxy";
  hitProxy.position.y = 0.6;
  root.add(hitProxy);

  root.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  center.y = surfaceY + 0.45;

  const stand = new THREE.Vector3(
    root.position.x,
    surfaceY,
    root.position.z + Math.max(size.z * 0.5, 0.9) + 0.7,
  );
  const look = center.clone();
  const localStand = root.worldToLocal(stand.clone());
  const localLook = root.worldToLocal(look.clone());

  function refreshAnchors() {
    root.updateWorldMatrix(true, true);
    stand.copy(root.localToWorld(localStand.clone()));
    stand.y = surfaceY;
    look.copy(root.localToWorld(localLook.clone()));
    look.y = surfaceY + 0.45;
  }
  refreshAnchors();

  function setWorldPosition(x, z) {
    root.position.x = x;
    root.position.y = surfaceY;
    root.position.z = z;
    refreshAnchors();
  }

  function setYaw(yaw) {
    root.rotation.y = yaw;
    refreshAnchors();
  }

  function update(delta, elapsed) {
    stalks.rotation.z = Math.sin(elapsed * 1.4) * 0.028;
    stalks.rotation.x = Math.cos(elapsed * 1.1) * 0.02;
  }

  return {
    root,
    size,
    stand,
    look,
    setWorldPosition,
    setYaw,
    refreshAnchors,
    update,
  };
}

import * as THREE from "three";

const HARBOR_POSITION = new THREE.Vector3(38, 0, -10);
const HARBOR_YAW = -0.4;

const SAIL_SECONDS = 5;
const SAIL_DISTANCE = 26;

function createShipModel() {
  const ship = new THREE.Group();
  ship.name = "valley-ship";

  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5233, roughness: 0.9 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x5e3d24, roughness: 0.92 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xf3ead6, roughness: 0.85, side: THREE.DoubleSide });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.42, 0.9), wood);
  hull.position.y = 0.24;
  ship.add(hull);

  const bow = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.7, 4), wood);
  bow.rotation.set(0, Math.PI / 4, -Math.PI / 2);
  bow.scale.set(1, 1, 0.55);
  bow.position.set(1.45, 0.24, 0);
  ship.add(bow);

  const stern = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.62, 0.9), darkWood);
  stern.position.set(-1.15, 0.36, 0);
  ship.add(stern);

  const rail = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.08, 0.96), darkWood);
  rail.position.y = 0.48;
  ship.add(rail);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.7, 6), darkWood);
  mast.position.y = 1.25;
  ship.add(mast);

  const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.1, 4, 4), cream);
  const sailPos = sail.geometry.attributes.position;
  for (let i = 0; i < sailPos.count; i += 1) {
    sailPos.setZ(i, Math.sin(sailPos.getX(i) * 1.4) * 0.1);
  }
  sail.geometry.computeVertexNormals();
  sail.position.set(0.15, 1.3, 0);
  ship.add(sail);

  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.2), new THREE.MeshStandardMaterial({ color: 0xe0564f, side: THREE.DoubleSide }));
  flag.position.set(0.22, 2.02, 0);
  ship.add(flag);

  ship.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  return ship;
}

function createCrate() {
  const crate = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.3, 0.34),
    new THREE.MeshStandardMaterial({ color: 0xb08954, roughness: 0.9 }),
  );
  body.position.y = 0.15;
  body.castShadow = true;
  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.06, 0.36),
    new THREE.MeshStandardMaterial({ color: 0x8a633f, roughness: 0.9 }),
  );
  lid.position.y = 0.33;
  lid.castShadow = true;
  crate.add(body, lid);
  return crate;
}

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

  // Sea around the harbor so the ship has somewhere to sail.
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(20, 48),
    new THREE.MeshStandardMaterial({ color: 0x4d9ec6, roughness: 0.55, transparent: true, opacity: 0.92 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(4, surfaceY - 0.42, 0);
  root.add(water);

  const ship = createShipModel();
  const dockAnchor = new THREE.Vector3(2.4, surfaceY - 0.4, 2.6);
  const farAnchor = new THREE.Vector3(SAIL_DISTANCE, surfaceY - 0.4, SAIL_DISTANCE * 0.5);
  ship.position.copy(dockAnchor);
  ship.rotation.y = 0.5;
  root.add(ship);

  const crates = [0, 1, 2, 3].map((index) => {
    const crate = createCrate();
    crate.position.set(-1.4 + index * 0.45, surfaceY - 0.02, 3.4);
    crate.rotation.y = index * 0.5;
    crate.visible = false;
    root.add(crate);
    return crate;
  });

  // Tap proxy so the harbor opens the ship sheet.
  const proxy = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 2.4, 12),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  proxy.position.y = 1.2;
  proxy.userData.isVillageBuilding = true;
  proxy.userData.buildingId = "valley-harbor";
  root.add(proxy);

  const sail = {
    phase: "dock", // dock → depart → gone → arrive
    t: 0,
  };
  let elapsed = 0;

  function setShip(shipState) {
    if (shipState?.status === "sailing" && sail.phase === "dock") {
      sail.phase = "depart";
      sail.t = 0;
    } else if (shipState?.status === "loading" && (sail.phase === "gone" || sail.phase === "depart")) {
      sail.phase = "arrive";
      sail.t = 0;
      ship.visible = true;
    }
  }

  function setCrates(crateStates) {
    crates.forEach((crate, index) => {
      crate.visible = Boolean(crateStates?.[index]?.filledBy);
    });
  }

  const ease = (t) => t * t * (3 - 2 * t);

  function update(delta) {
    elapsed += delta;
    if (sail.phase === "depart") {
      sail.t += delta / SAIL_SECONDS;
      ship.position.lerpVectors(dockAnchor, farAnchor, ease(Math.min(sail.t, 1)));
      if (sail.t >= 1) {
        sail.phase = "gone";
        ship.visible = false;
      }
    } else if (sail.phase === "arrive") {
      sail.t += delta / SAIL_SECONDS;
      ship.position.lerpVectors(farAnchor, dockAnchor, ease(Math.min(sail.t, 1)));
      if (sail.t >= 1) sail.phase = "dock";
    } else {
      ship.position.copy(dockAnchor);
    }
    ship.position.y += Math.sin(elapsed * 1.4) * 0.05;
    water.position.y = surfaceY - 0.42 + Math.sin(elapsed * 0.7) * 0.02;
  }

  return {
    root,
    size,
    center,
    surfaceY,
    proxy,
    lookTarget: new THREE.Vector3(HARBOR_POSITION.x, surfaceY + 0.6, HARBOR_POSITION.z),
    cameraAnchor: new THREE.Vector3(HARBOR_POSITION.x + 11, surfaceY + 9, HARBOR_POSITION.z + 12),
    setVisible(value) {
      root.visible = Boolean(value);
    },
    setShip,
    setCrates,
    update,
    getSailPhase: () => sail.phase,
  };
}

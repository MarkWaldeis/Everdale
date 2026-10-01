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

function createLibraryModel() {
  const lib = new THREE.Group();
  lib.name = "valley-library";
  const stone = new THREE.MeshStandardMaterial({ color: 0xd9c9a8, roughness: 0.85 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x7d9ec4, roughness: 0.8 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.22, 8), stone);
  base.position.y = 0.11;
  lib.add(base);

  [45, 135, 225, 315].forEach((deg) => {
    const rad = (deg * Math.PI) / 180;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.9, 8), stone);
    col.position.set(Math.cos(rad) * 0.9, 0.65, Math.sin(rad) * 0.9);
    lib.add(col);
  });

  const dome = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.75, 8), roof);
  dome.position.y = 1.5;
  lib.add(dome);

  const book = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.14, 0.36),
    new THREE.MeshStandardMaterial({ color: 0x8a4b3a, roughness: 0.85 }),
  );
  book.position.set(0, 0.3, 0);
  book.rotation.y = 0.4;
  lib.add(book);
  const book2 = book.clone();
  book2.position.y = 0.44;
  book2.rotation.y = -0.3;
  book2.scale.setScalar(0.85);
  lib.add(book2);

  lib.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  return lib;
}

function createGuildhallModel() {
  const hall = new THREE.Group();
  hall.name = "valley-guildhall";
  const wood = new THREE.MeshStandardMaterial({ color: 0x9a6b42, roughness: 0.9 });
  const canvasRed = new THREE.MeshStandardMaterial({ color: 0xc25b4f, roughness: 0.85 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.6), wood);
  base.position.y = 0.45;
  hall.add(base);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.1, 4), canvasRed);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1, 1, 0.72);
  roof.position.y = 1.45;
  hall.add(roof);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), wood);
  pole.position.set(0, 1.9, 0);
  hall.add(pole);
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.32),
    new THREE.MeshStandardMaterial({ color: 0xf0c14b, side: THREE.DoubleSide }),
  );
  banner.position.set(0.32, 2.35, 0);
  hall.add(banner);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.7, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.95 }),
  );
  door.position.set(0, 0.36, 0.83);
  hall.add(door);

  hall.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  return hall;
}

function createMineModel() {
  const mine = new THREE.Group();
  mine.name = "valley-mine";
  const rock = new THREE.MeshStandardMaterial({ color: 0x6f6a60, roughness: 0.95 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a613c, roughness: 0.9 });
  const crystal = new THREE.MeshStandardMaterial({
    color: 0x9fd4ff,
    emissive: 0x3f7fb5,
    emissiveIntensity: 0.8,
    roughness: 0.3,
  });

  const face = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 0.9), rock);
  face.position.y = 0.9;
  mine.add(face);

  const mouth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.7, 0.95, 10),
    new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 1 }),
  );
  mouth.rotation.x = Math.PI / 2;
  mouth.position.set(0, 0.55, 0.48);
  mine.add(mouth);

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.14), wood);
  lintel.position.set(0, 1.1, 0.5);
  mine.add(lintel);
  [-0.68, 0.68].forEach((x) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), wood);
    post.position.set(x, 0.55, 0.5);
    mine.add(post);
  });

  [[-0.95, 0.12, 0.55, 0.55], [0.9, 0.1, 0.6, 0.4], [0.35, 1.62, 0.3, 0.34]].forEach(([x, y, z, s]) => {
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(s, 0), crystal);
    shard.position.set(x, y + s * 0.5, z);
    shard.scale.y = 1.7;
    mine.add(shard);
  });

  mine.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  return mine;
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
    new THREE.CircleGeometry(16, 48),
    new THREE.MeshStandardMaterial({ color: 0x4d9ec6, roughness: 0.55, transparent: true, opacity: 0.92 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(10, surfaceY - 0.42, 2);
  root.add(water);

  // Sandy spit under the land-side buildings so they sit on shore.
  const shore = new THREE.Mesh(
    new THREE.CircleGeometry(4.6, 32),
    new THREE.MeshStandardMaterial({ color: 0xd9b27c, roughness: 0.95 }),
  );
  shore.rotation.x = -Math.PI / 2;
  shore.scale.set(1.5, 1, 1.2);
  shore.position.set(-4.8, surfaceY - 0.03, -1.2);
  root.add(shore);

  const ship = createShipModel();
  const dockAnchor = new THREE.Vector3(2.4, surfaceY - 0.4, 2.6);
  const farAnchor = new THREE.Vector3(SAIL_DISTANCE, surfaceY - 0.4, SAIL_DISTANCE * 0.5);
  ship.position.copy(dockAnchor);
  ship.rotation.y = 0.5;
  root.add(ship);

  const library = createLibraryModel();
  library.position.set(-4.6, surfaceY - 0.02, -3.6);
  library.rotation.y = 0.6;
  library.visible = false;
  root.add(library);

  const guildhall = createGuildhallModel();
  guildhall.position.set(-4.2, surfaceY - 0.02, 0.8);
  guildhall.rotation.y = -0.35;
  guildhall.visible = false;
  root.add(guildhall);

  const mine = createMineModel();
  mine.position.set(-1.6, surfaceY - 0.02, -4.6);
  mine.rotation.y = 2.55;
  mine.visible = false;
  root.add(mine);

  const crates = [0, 1, 2, 3].map((index) => {
    const crate = createCrate();
    crate.position.set(-1.2 + index * 0.42, surfaceY + 0.02, 2.1);
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
    setLibraryBuilt(value) {
      library.visible = Boolean(value);
    },
    setGuildhallBuilt(value) {
      guildhall.visible = Boolean(value);
    },
    setMineBuilt(value) {
      mine.visible = Boolean(value);
    },
    update,
    getSailPhase: () => sail.phase,
  };
}

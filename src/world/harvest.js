import * as THREE from "three";

export const CHOP_HITS = 5;
const CLICK_SLOP = 8;
const TREE_LABELS = Object.freeze({
  tree: "Waldbaum",
  appleTree: "Apfelbaum",
  blossomTree: "Blütenbaum",
  stone: "Waldstein",
  stoneSplit: "Spaltstein",
});

const scratch = {
  pointer: new THREE.Vector2(),
  world: new THREE.Vector3(),
  toward: new THREE.Vector3(),
  projected: new THREE.Vector3(),
};

function smootherStep(value) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function createGroundMarker() {
  const group = new THREE.Group();
  group.name = "harvest-marker";
  group.visible = false;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.58, 0.8, 56),
    new THREE.MeshBasicMaterial({
      color: 0xf0c14d,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;

  const inner = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.38, 40),
    new THREE.MeshBasicMaterial({
      color: 0xfff4c8,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.032;

  group.add(ring, inner);
  group.userData.ring = ring;
  return group;
}

function createChipBurst() {
  const chips = [];
  const geometry = new THREE.BoxGeometry(0.045, 0.018, 0.03);
  const material = new THREE.MeshStandardMaterial({
    color: 0x8a5a32,
    roughness: 0.9,
    metalness: 0,
  });

  for (let index = 0; index < 8; index += 1) {
    const mesh = new THREE.Mesh(geometry, material.clone());
    mesh.visible = false;
    mesh.castShadow = true;
    chips.push({
      mesh,
      velocity: new THREE.Vector3(),
      life: 0,
    });
  }

  return chips;
}

export function createHarvestDirector({
  trees,
  camera,
  canvas,
  scene,
  character,
  cottage,
  yard,
  surfaceY,
  setFollowTarget,
  isPlacementActive,
}) {
  const raycaster = new THREE.Raycaster();
  const marker = createGroundMarker();
  const chips = createChipBurst();
  const tray = document.querySelector("#worker-dock");
  const workerButton = document.querySelector("#worker-assign");
  const workerStatus = document.querySelector("#worker-status");
  const trayTitle = document.querySelector("#worker-dock-title");
  const taskPin = document.querySelector("#worker-task-pin");
  const woodCount = document.querySelector("#wood-count");
  const stoneCount = document.querySelector("#stone-count");
  const meter = document.querySelector("#harvest-meter");
  const meterFill = document.querySelector("#harvest-meter-fill");
  const meterLabel = document.querySelector("#harvest-meter-label");
  const closeButton = document.querySelector("#worker-dock-close");

  scene.add(marker);
  chips.forEach((chip) => scene.add(chip.mesh));
  let gatheredStone = 0;

  const pointerState = {
    down: null,
    hovered: null,
    selected: null,
    falling: [],
  };

  function findTreeFromObject(object) {
    let node = object;
    while (node) {
      if (node.userData?.isHarvestTree || node.userData?.isHarvestStone) return node;
      node = node.parent;
    }
    return null;
  }

  function isSelectable(tree) {
    return Boolean(
      tree?.userData.harvestable &&
        tree.userData.harvestState !== "gone" &&
        tree.userData.harvestState !== "falling",
    );
  }

  function pickTree(clientX, clientY) {
    const bounds = canvas.getBoundingClientRect();
    scratch.pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1;
    scratch.pointer.y = -((clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(scratch.pointer, camera);

    const hits = raycaster.intersectObjects(trees, true);
    for (const hit of hits) {
      const tree = findTreeFromObject(hit.object);
      if (!tree) continue;
      if (!tree.userData.harvestable) return null;
      if (isSelectable(tree)) return tree;
    }

    // Generous Everdale-style tap: nearest trunk to the click ray.
    let nearest = null;
    let nearestDistance = 1.55;
    const origin = raycaster.ray.origin;
    const direction = raycaster.ray.direction;
    trees.forEach((tree) => {
      if (!isSelectable(tree)) return;
      scratch.world.copy(tree.position);
      scratch.world.y += 1.6;
      const toTree = scratch.world.clone().sub(origin);
      const along = toTree.dot(direction);
      if (along < 1.2) return;
      const closest = origin.clone().addScaledVector(direction, along);
      const distance = closest.distanceTo(scratch.world);
      if (distance < nearestDistance) {
        nearest = tree;
        nearestDistance = distance;
      }
    });
    return nearest;
  }

  function placeMarker(tree) {
    if (!tree) {
      marker.visible = false;
      return;
    }
    marker.visible = true;
    marker.position.set(tree.position.x, surfaceY + 0.01, tree.position.z);
  }

  function setTrayOpen(open) {
    if (!tray) return;
    tray.hidden = !open;
    tray.classList.toggle("is-open", open);
    document.body.classList.toggle("has-worker-dock", open);
    if (open) {
      workerButton?.focus();
    }
  }

  function refreshWorkerCard() {
    const busy = character.isBusy();
    if (workerButton) workerButton.disabled = busy;
    if (workerStatus) {
      const state = character.getState();
      workerStatus.textContent = busy
        ? state === "job-walk-home" || state === "home-approach" || state === "ascend-porch"
          ? "Nach Hause"
          : state === "job-walk-storage" ||
              state === "job-align-storage" ||
              state === "job-deposit"
            ? "Zum Lager"
            : pointerState.selected?.userData.harvestKind === "stone"
              ? "Steine hauen"
              : "Holzfällen"
        : "Frei";
    }
    workerButton?.classList.toggle("is-busy", busy);
    if (taskPin) {
      taskPin.hidden = !busy;
      taskPin.dataset.task =
        pointerState.selected?.userData.harvestKind === "stone" ? "mine" : "chop";
    }
  }

  function selectTree(tree) {
    if (pointerState.selected && pointerState.selected !== tree) {
      if (pointerState.selected.userData.harvestState === "selected") {
        pointerState.selected.userData.harvestState = "idle";
      }
    }

    pointerState.selected = tree;
    if (tree && tree.userData.harvestState === "idle") {
      tree.userData.harvestState = "selected";
    }
    if (!tree || tree.userData.harvestState === "selected") {
      placeMarker(tree);
    }

    if (!tree) {
      setTrayOpen(false);
      return;
    }

    const label = TREE_LABELS[tree.userData.assetId] ?? "Baum";
    const action = tree.userData.harvestKind === "stone" ? "abbauen" : "fällen";
    if (trayTitle) trayTitle.textContent = `${label} ${action}`;
    refreshWorkerCard();
    setTrayOpen(true);
  }

  function approachPoint(tree) {
    const fromCottage = cottage?.root.position ?? new THREE.Vector3();
    scratch.toward.subVectors(fromCottage, tree.position);
    scratch.toward.y = 0;
    if (scratch.toward.lengthSq() < 0.0001) {
      scratch.toward.set(-tree.position.x, 0, -tree.position.z);
    }
    if (scratch.toward.lengthSq() < 0.0001) scratch.toward.set(0, 0, 1);
    scratch.toward.normalize();
    const standOff = tree.userData.harvestKind === "stone" ? 1.18 : 1.48;
    const point = tree.position.clone().addScaledVector(scratch.toward, standOff);
    point.y = surfaceY;
    if (cottage?.containsPoint(point, 0.55)) {
      point.addScaledVector(scratch.toward, -0.85);
    }
    return point;
  }

  function spawnChips(origin, kind = "wood") {
    const chipColor = kind === "stone" ? 0x8a8680 : 0x8a5a32;
    chips.forEach((chip, index) => {
      chip.mesh.position.copy(origin);
      chip.mesh.position.y += 0.42;
      if (chip.mesh.material) chip.mesh.material.color.setHex(chipColor);
      chip.velocity.set(
        (Math.random() - 0.5) * 1.8,
        1.4 + Math.random() * 1.1,
        (Math.random() - 0.5) * 1.8,
      );
      chip.life = 0.38 + index * 0.02;
      chip.mesh.visible = true;
      chip.mesh.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
    });
  }

  function projectMeter(tree, progress) {
    if (!meter || !tree) {
      if (meter) meter.hidden = true;
      return;
    }

    if (!tree.userData.crownHeight) {
      const bounds = new THREE.Box3().setFromObject(tree);
      tree.userData.crownHeight = Math.max(bounds.max.y - tree.position.y, 1.8);
    }
    scratch.world.set(
      tree.position.x,
      tree.position.y + tree.userData.crownHeight,
      tree.position.z,
    );
    scratch.projected.copy(scratch.world).project(camera);
    const onScreen =
      scratch.projected.z > -1 &&
      scratch.projected.z < 1 &&
      Math.abs(scratch.projected.x) < 1.15 &&
      Math.abs(scratch.projected.y) < 1.15;

    if (!onScreen) {
      meter.hidden = true;
      return;
    }

    const view = canvas.getBoundingClientRect();
    const x = view.left + (scratch.projected.x * 0.5 + 0.5) * view.width;
    const y = view.top + (-scratch.projected.y * 0.5 + 0.5) * view.height;
    meter.hidden = false;
    meter.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    const offset = 113.1 * (1 - progress);
    if (meterFill) meterFill.style.strokeDashoffset = String(offset);
    if (meterLabel) {
      meterLabel.textContent = `${Math.round(progress * CHOP_HITS)}/${CHOP_HITS}`;
    }
  }

  function uniquifyMaterials(tree) {
    tree.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      child.material = Array.isArray(child.material)
        ? child.material.map((material) => material.clone())
        : child.material.clone();
    });
  }

  function beginFall(tree, awayFrom) {
    uniquifyMaterials(tree);
    tree.userData.harvestState = "falling";
    tree.userData.fallTime = 0;
    tree.userData.breakKind = tree.userData.harvestKind === "stone" ? "stone" : "wood";
    tree.userData.baseScale = tree.scale.x;
    scratch.toward.subVectors(tree.position, awayFrom);
    scratch.toward.y = 0;
    if (scratch.toward.lengthSq() < 0.0001) scratch.toward.set(1, 0, 0);
    scratch.toward.normalize();
    tree.userData.fallAxis = new THREE.Vector3(-scratch.toward.z, 0, scratch.toward.x);
    pointerState.falling.push(tree);
    if (meter) meter.hidden = true;
  }

  function assignSelectedWorker() {
    const tree = pointerState.selected;
    if (!tree || character.isBusy()) return;
    if (tree.userData.harvestState === "gone" || tree.userData.harvestState === "falling") {
      return;
    }

    const approach = approachPoint(tree);
    const isStone = tree.userData.harvestKind === "stone";
    const accepted = character.assignJob({
      tree,
      tool: isStone ? "pickaxe" : "axe",
      approach,
      lookAt: tree.position.clone(),
      storageApproach: isStone ? null : yard?.stand,
      storageLook: isStone ? null : yard?.look,
      storageBlock:
        !isStone && yard
          ? { x: yard.root.position.x, z: yard.root.position.z, radius: 1.15 }
          : null,
      hitsNeeded: CHOP_HITS,
      onStartChop: () => {
        tree.userData.harvestState = "chopping";
        tree.userData.lockSway = true;
        projectMeter(tree, 0);
      },
      onImpact: () => {
        const origin = tree.position.clone();
        origin.y = surfaceY;
        spawnChips(origin, isStone ? "stone" : "wood");
        tree.userData.impactPulse = 1;
        projectMeter(tree, character.getJobProgress());
      },
      onChopProgress: (progress) => {
        projectMeter(tree, progress);
      },
      onChopDone: () => {
        beginFall(tree, character.root.position.clone());
        setFollowTarget?.(character.root);
        if (isStone) {
          gatheredStone = Math.min(20, gatheredStone + 5);
          if (stoneCount) stoneCount.textContent = String(gatheredStone);
        }
      },
      onDeliver: () => {
        if (isStone) return;
        const amount = yard?.deposit() ?? 0;
        if (woodCount) woodCount.textContent = String(amount);
        refreshWorkerCard();
      },
      onReturned: () => {
        refreshWorkerCard();
        if (pointerState.selected === tree) selectTree(null);
      },
    });

    if (!accepted) return;
    tree.userData.harvestState = "assigned";
    tree.userData.lockSway = true;
    placeMarker(null);
    refreshWorkerCard();
    setTrayOpen(true);
    setFollowTarget?.(character.root, tree);
  }

  function updateMarker(elapsed) {
    if (!marker.visible) return;
    const pulse = 1 + Math.sin(elapsed * 3.2) * 0.045;
    marker.scale.setScalar(pulse);
  }

  function updateChips(delta) {
    chips.forEach((chip) => {
      if (!chip.mesh.visible) return;
      chip.life -= delta;
      if (chip.life <= 0) {
        chip.mesh.visible = false;
        return;
      }
      chip.velocity.y -= 6.4 * delta;
      chip.mesh.position.addScaledVector(chip.velocity, delta);
      chip.mesh.rotation.x += delta * 8;
      chip.mesh.rotation.z += delta * 6;
    });
  }

  function fadeAndRemove(tree, sink) {
    tree.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        material.transparent = true;
        material.depthWrite = false;
        material.opacity = 1 - sink;
        material.needsUpdate = true;
      });
    });
    if (sink < 1) return true;
    tree.visible = false;
    tree.userData.harvestState = "gone";
    tree.userData.harvestable = false;
    return false;
  }

  function updateFalls(delta) {
    pointerState.falling = pointerState.falling.filter((tree) => {
      tree.userData.fallTime += delta;
      const time = tree.userData.fallTime;

      if (tree.userData.breakKind === "stone") {
        const crumble = smootherStep(Math.min(time / 0.9, 1));
        const base = tree.userData.baseScale ?? 1;
        tree.scale.setScalar(Math.max(0.12, base * (1 - crumble * 0.82)));
        tree.position.y = surfaceY - 0.02 - crumble * 0.28;
        tree.rotation.y = (tree.userData.baseYaw ?? 0) + crumble * 0.35;
        if (time > 0.9) {
          return fadeAndRemove(tree, smootherStep(Math.min((time - 0.9) / 0.45, 1)));
        }
        return true;
      }

      const fall = smootherStep(Math.min(time / 1.25, 1));
      const yaw = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        tree.userData.baseYaw ?? 0,
      );
      const tilt = new THREE.Quaternion().setFromAxisAngle(tree.userData.fallAxis, fall * 1.32);
      tree.quaternion.copy(yaw).premultiply(tilt);
      tree.position.y = surfaceY - 0.015 - fall * 0.12;

      if (time > 1.25) {
        const sink = smootherStep(Math.min((time - 1.25) / 0.7, 1));
        tree.position.y = surfaceY - 0.14 - sink * 1.4;
        return fadeAndRemove(tree, sink);
      }
      return true;
    });
  }

  function updateImpulses(delta) {
    trees.forEach((tree) => {
      if (!tree.userData.impactPulse) return;
      if (tree.userData.harvestState === "falling" || tree.userData.harvestState === "gone") {
        tree.userData.impactPulse = 0;
        return;
      }
      tree.userData.impactPulse = Math.max(0, tree.userData.impactPulse - delta * 4.2);
      const punch = tree.userData.impactPulse * 0.035;
      tree.rotation.x = punch;
    });
  }

  function update(delta, elapsed) {
    updateMarker(elapsed);
    updateChips(delta);
    updateFalls(delta);
    updateImpulses(delta);

    const chopping = trees.find((tree) => tree.userData.harvestState === "chopping");
    if (chopping) {
      projectMeter(chopping, character.getJobProgress());
    } else if (meter && !chopping) {
      const assigned = trees.find((tree) => tree.userData.harvestState === "assigned");
      if (!assigned) meter.hidden = true;
    }
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    if (isPlacementActive?.()) return;
    pointerState.down = { x: event.clientX, y: event.clientY };
  }

  function onPointerMove(event) {
    if (isPlacementActive?.()) {
      pointerState.hovered = null;
      canvas.classList.remove("is-over-tree");
      return;
    }
    const tree = pickTree(event.clientX, event.clientY);
    pointerState.hovered = tree;
    canvas.classList.toggle("is-over-tree", Boolean(tree));
  }

  function onPointerUp(event) {
    if (isPlacementActive?.()) {
      pointerState.down = null;
      return;
    }
    if (!pointerState.down || event.button !== 0) return;
    const travel = Math.hypot(event.clientX - pointerState.down.x, event.clientY - pointerState.down.y);
    pointerState.down = null;
    if (travel > CLICK_SLOP) return;
    if (event.target?.closest?.(".panel, .worker-dock, .harvest-meter")) return;

    const tree = pickTree(event.clientX, event.clientY);
    selectTree(tree);
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", () => {
    pointerState.down = null;
  });

  workerButton?.addEventListener("click", (event) => {
    event.preventDefault();
    assignSelectedWorker();
  });

  closeButton?.addEventListener("click", (event) => {
    event.preventDefault();
    if (pointerState.selected?.userData.harvestState === "selected") {
      pointerState.selected.userData.harvestState = "idle";
    }
    selectTree(null);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (pointerState.selected?.userData.harvestState === "selected") {
        pointerState.selected.userData.harvestState = "idle";
      }
      selectTree(null);
    }
  });

  return {
    update,
    getSelected: () => pointerState.selected,
    selectTree,
    assignSelectedWorker,
  };
}

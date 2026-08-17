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
  villagers,
  cottage,
  yard,
  stoneYard,
  research,
  surfaceY,
  setFollowTarget,
  isPlacementActive,
}) {
  const raycaster = new THREE.Raycaster();
  const marker = createGroundMarker();
  const chips = createChipBurst();
  const tray = document.querySelector("#worker-dock");
  const workerButtons = [...document.querySelectorAll("[data-villager]")];
  const trayTitle = document.querySelector("#worker-dock-title");
  const woodCount = document.querySelector("#wood-count");
  const stoneCount = document.querySelector("#stone-count");
  const meter = document.querySelector("#harvest-meter");
  const meterFill = document.querySelector("#harvest-meter-fill");
  const meterLabel = document.querySelector("#harvest-meter-label");
  const closeButton = document.querySelector("#worker-dock-close");

  scene.add(marker);
  chips.forEach((chip) => scene.add(chip.mesh));
  const roster = villagers ?? (character ? [character] : []);

  const pointerState = {
    down: null,
    hovered: null,
    selected: null,
    mode: "harvest",
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
      workerButtons.find((button) => !button.disabled)?.focus();
    }
  }

  function statusFor(member) {
    if (member.isAtLab?.()) return "Im Labor";
    if (!member.isBusy()) return "Frei";
    const state = member.getState();
    if (state === "job-walk-home" || state === "home-approach" || state === "ascend-porch") {
      return "Nach Hause";
    }
    if (state.startsWith("visit-")) return "Zum Labor";
    if (state === "job-walk-storage" || state === "job-align-storage" || state === "job-deposit") {
      return "Zum Lager";
    }
    if (state.includes("chop") || state === "job-align" || state === "job-walk") {
      return "Arbeit";
    }
    return "Unterwegs";
  }

  function refreshWorkerCard() {
    const selected = pointerState.selected;
    const visitingLab = pointerState.mode === "research";
    const canAssign = visitingLab
      ? true
      : Boolean(
          selected &&
            selected.userData.harvestState !== "gone" &&
            selected.userData.harvestState !== "falling" &&
            selected.userData.harvestState !== "assigned" &&
            selected.userData.harvestState !== "chopping",
        );
    workerButtons.forEach((button) => {
      const member = roster.find((entry) => entry.getId() === button.dataset.villager);
      if (!member) return;
      const busy = member.isBusy();
      const alreadyInLab = visitingLab && member.isAtLab?.();
      button.disabled = busy || !canAssign || alreadyInLab;
      button.classList.toggle("is-busy", busy);
      const status = button.querySelector(".worker-state");
      if (status) status.textContent = statusFor(member);
      const pin = button.querySelector(".task-pin");
      if (pin) {
        pin.hidden = !busy;
        pin.dataset.task = member.getJobTool?.() === "pickaxe" ? "mine" : "chop";
      }
    });
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
      pointerState.mode = "harvest";
      setTrayOpen(false);
      return;
    }

    pointerState.mode = "harvest";

    const label = TREE_LABELS[tree.userData.assetId] ?? "Baum";
    const action = tree.userData.harvestKind === "stone" ? "abbauen" : "fällen";
    const inArbeit = tree.userData.harvestState === "assigned" || tree.userData.harvestState === "chopping";
    if (trayTitle) {
      trayTitle.textContent = inArbeit ? `${label} ist bereits in Arbeit` : `${label} ${action}`;
    }
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

  function selectResearch() {
    if (pointerState.selected?.userData.harvestState === "selected") {
      pointerState.selected.userData.harvestState = "idle";
    }
    pointerState.selected = null;
    pointerState.mode = "research";
    placeMarker(null);
    if (trayTitle) trayTitle.textContent = "Alchemie · Forschen";
    refreshWorkerCard();
    setTrayOpen(true);
  }

  function pickResearch(clientX, clientY) {
    if (!research?.root) return null;
    const bounds = canvas.getBoundingClientRect();
    scratch.pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1;
    scratch.pointer.y = -((clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(scratch.pointer, camera);
    const hits = raycaster.intersectObject(research.root, true);
    return hits.length ? research : null;
  }

  function yardBlock(storage) {
    if (!storage?.root) return null;
    const span = Math.max(storage.size?.x ?? 0.8, storage.size?.z ?? 0.8);
    return { x: storage.root.position.x, z: storage.root.position.z, radius: span * 0.55 + 0.18 };
  }

  function labBlock() {
    if (!research?.root) return null;
    const span = Math.max(research.size?.x ?? 4, research.size?.z ?? 4);
    return { x: research.root.position.x, z: research.root.position.z, radius: span * 0.28 + 0.35 };
  }

  function assignVisit(member) {
    if (!research || !member || member.isBusy() || member.isAtLab?.()) return;
    const accepted = member.assignJob({
      kind: "visit",
      approach: research.points.approach.clone(),
      lookAt: research.points.look.clone(),
      storageBlock: [yardBlock(yard), yardBlock(stoneYard), labBlock()].filter(Boolean),
      onArrived: () => refreshWorkerCard(),
    });
    if (!accepted) return;
    refreshWorkerCard();
    setFollowTarget?.(member.root, research.root, member);
  }

  function assignWorker(member) {
    if (pointerState.mode === "research") {
      assignVisit(member);
      return;
    }
    const tree = pointerState.selected;
    if (!tree || !member || member.isBusy()) return;
    if (tree.userData.harvestState === "gone" || tree.userData.harvestState === "falling") {
      return;
    }
    if (tree.userData.harvestState === "assigned" || tree.userData.harvestState === "chopping") {
      return;
    }

    const approach = approachPoint(tree);
    const isStone = tree.userData.harvestKind === "stone";
    const accepted = member.assignJob({
      tree,
      tool: isStone ? "pickaxe" : "axe",
      approach,
      lookAt: tree.position.clone(),
      storageApproach: isStone ? stoneYard?.stand : yard?.stand,
      storageLook: isStone ? stoneYard?.look : yard?.look,
      storageBlock: [
        yardBlock(yard),
        yardBlock(stoneYard),
        labBlock(),
      ].filter(Boolean),
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
        projectMeter(tree, member.getJobProgress());
      },
      onChopProgress: (progress) => {
        projectMeter(tree, progress);
      },
      onChopDone: () => {
        beginFall(tree, member.root.position.clone());
        setFollowTarget?.(member.root, null, member);
      },
      onDeliver: () => {
        if (isStone) {
          const amount = stoneYard?.deposit() ?? 0;
          if (stoneCount) stoneCount.textContent = String(amount);
        } else {
          const amount = yard?.deposit() ?? 0;
          if (woodCount) woodCount.textContent = String(amount);
        }
        refreshWorkerCard();
      },
      onReturned: () => {
        refreshWorkerCard();
        if (pointerState.selected === tree) selectTree(null);
      },
    });

    if (!accepted) return;
    tree.userData.harvestState = "assigned";
    tree.userData.assignedWorkerId = member.getId();
    tree.userData.lockSway = true;
    refreshWorkerCard();
    selectTree(null);
    setFollowTarget?.(member.root, tree, member);
  }

  function assignSelectedWorker() {
    const free = roster.find((member) => !member.isBusy());
    assignWorker(free);
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
      const worker =
        roster.find((member) => member.getId() === chopping.userData.assignedWorkerId) ??
        roster.find((member) => member.getState() === "job-chop");
      projectMeter(chopping, worker?.getJobProgress() ?? 0);
    } else if (meter && !chopping) {
      const assigned = trees.find((tree) => tree.userData.harvestState === "assigned");
      if (!assigned) meter.hidden = true;
    }
    refreshWorkerCard();
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
    const labHit = !tree && pickResearch(event.clientX, event.clientY);
    pointerState.hovered = tree || labHit;
    canvas.classList.toggle("is-over-tree", Boolean(tree || labHit));
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

    const labHit = pickResearch(event.clientX, event.clientY);
    if (labHit) {
      if (pointerState.mode === "research") {
        selectTree(null);
        return;
      }
      selectResearch();
      return;
    }
    const tree = pickTree(event.clientX, event.clientY);
    if (tree && tree === pointerState.selected) {
      selectTree(null);
      return;
    }
    selectTree(tree);
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", () => {
    pointerState.down = null;
  });

  workerButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const member = roster.find((entry) => entry.getId() === button.dataset.villager);
      assignWorker(member);
    });
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
    selectResearch,
    assignSelectedWorker,
  };
}

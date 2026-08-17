import * as THREE from "three";
import { CELL, cellCenter, createVillageGrid, footprintWorld, worldToMinCorner } from "./village-grid.js";

// Future buildings: village.register({ id, label, root, w, h, padding, setWorldPosition, refresh, onRelocated })

const CLICK_SLOP = 9;
const LIFT_HEIGHT = 0.46;
const COLORS = {
  idle: new THREE.Color(0xffffff),
  occupied: new THREE.Color(0x9fb2c4),
  hover: new THREE.Color(0xffffff),
  valid: new THREE.Color(0xffffff),
  invalid: new THREE.Color(0xff5140),
  hold: new THREE.Color(0xffffff),
};

function roundedTileShape(size, radius) {
  const half = size * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-half + radius, -half);
  shape.lineTo(half - radius, -half);
  shape.quadraticCurveTo(half, -half, half, -half + radius);
  shape.lineTo(half, half - radius);
  shape.quadraticCurveTo(half, half, half - radius, half);
  shape.lineTo(-half + radius, half);
  shape.quadraticCurveTo(-half, half, -half, half - radius);
  shape.lineTo(-half, -half + radius);
  shape.quadraticCurveTo(-half, -half, -half + radius, -half);
  return shape;
}

function createTileTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 128, 128);
  const inset = 7;
  const size = 128 - inset * 2;
  ctx.beginPath();
  ctx.roundRect(inset, inset, size, size, 26);
  const fill = ctx.createLinearGradient(0, inset, 0, 128 - inset);
  fill.addColorStop(0, "rgba(255, 255, 255, 0.95)");
  fill.addColorStop(0.55, "rgba(255, 255, 255, 0.6)");
  fill.addColorStop(1, "rgba(255, 255, 255, 0.4)");
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(inset + 8, inset + 8, size - 16, 42, 18);
  const gloss = ctx.createLinearGradient(0, inset + 8, 0, inset + 50);
  gloss.addColorStop(0, "rgba(255, 255, 255, 0.85)");
  gloss.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gloss;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.roundRect(inset, inset, size, size, 26);
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createTileMesh(count, surfaceY) {
  const geometry = new THREE.PlaneGeometry(CELL * 0.84, CELL * 0.84);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    map: createTileTexture(),
    color: 0xffffff,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = "village-grid-tiles";
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  mesh.position.y = surfaceY + 0.07;
  return mesh;
}

function createGridLines(cells, surfaceY) {
  const positions = [];
  const half = CELL * 0.42;
  cells.forEach((cell) => {
    const x = cell.col * CELL;
    const z = cell.row * CELL;
    const y = 0;
    const corners = [
      [x - half, y, z - half],
      [x + half, y, z - half],
      [x + half, y, z + half],
      [x - half, y, z + half],
    ];
    for (let i = 0; i < 4; i += 1) {
      positions.push(...corners[i], ...corners[(i + 1) % 4]);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const lines = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthTest: false,
      toneMapped: false,
    }),
  );
  lines.name = "village-grid-lines";
  lines.renderOrder = 5;
  lines.position.y = surfaceY + 0.075;
  return lines;
}

export function createVillageEditor({
  scene,
  camera,
  canvas,
  walkArea,
  character,
  controls,
  onModeChange,
  setCameraView,
}) {
  const grid = createVillageGrid({
    radiusX: walkArea.radiusX,
    radiusZ: walkArea.radiusZ,
    surfaceY: walkArea.surfaceY,
  });

  const overlay = new THREE.Group();
  overlay.name = "village-edit-overlay";
  overlay.visible = false;
  scene.add(overlay);

  const villageCells = grid.listVillageCells();
  const tiles = createTileMesh(villageCells.length, walkArea.surfaceY);
  const dummy = new THREE.Object3D();
  const tileColor = new THREE.Color();
  villageCells.forEach((cell, index) => {
    const { x, z } = cellCenter(cell.col, cell.row);
    dummy.position.set(x, 0, z);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    tiles.setMatrixAt(index, dummy.matrix);
    tiles.setColorAt(index, COLORS.idle);
  });
  tiles.instanceMatrix.needsUpdate = true;
  tiles.instanceColor.needsUpdate = true;
  const gridLines = createGridLines(villageCells, walkArea.surfaceY);
  overlay.add(tiles, gridLines);

  const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(Math.max(walkArea.radiusX, walkArea.radiusZ) * 0.98, 72),
    new THREE.MeshBasicMaterial({
      color: 0x2d4a22,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = walkArea.surfaceY + 0.018;
  plaza.renderOrder = 1;
  overlay.add(plaza);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.35, 36),
    new THREE.MeshBasicMaterial({
      color: 0x1b140c,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = walkArea.surfaceY + 0.034;
  overlay.add(shadow);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -walkArea.surfaceY);
  const hitPoint = new THREE.Vector3();

  const ui = {
    toggle: document.querySelector("#village-edit-toggle"),
    bar: document.querySelector("#village-edit-bar"),
    title: document.querySelector("#village-edit-title"),
    hint: document.querySelector("#village-edit-hint"),
    actions: document.querySelector("#village-edit-actions"),
    confirm: document.querySelector("#village-edit-confirm"),
    cancel: document.querySelector("#village-edit-cancel"),
    rotate: document.querySelector("#village-edit-rotate"),
    done: document.querySelector("#village-edit-done"),
  };

  const state = {
    active: false,
    fade: 0,
    holding: null,
    previewCol: 0,
    previewRow: 0,
    valid: true,
    lift: 0,
    liftTarget: 0,
    hoverId: null,
    hoverCell: null,
    pointerDown: null,
    dragging: false,
    pulse: 0,
    shake: 0,
  };

  function setPointerFromEvent(event) {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
  }

  function groundCell(event) {
    setPointerFromEvent(event);
    const hit = raycaster.ray.intersectPlane(groundPlane, hitPoint);
    if (!hit) return null;
    return {
      col: Math.round(hitPoint.x / CELL),
      row: Math.round(hitPoint.z / CELL),
      x: hitPoint.x,
      z: hitPoint.z,
    };
  }

  function pickBuilding(event) {
    setPointerFromEvent(event);
    const roots = grid.list().map((building) => building.root);
    const hits = raycaster.intersectObjects(roots, true);
    for (const hit of hits) {
      let node = hit.object;
      while (node) {
        if (node.userData?.isVillageBuilding) {
          return grid.get(node.userData.isVillageBuilding);
        }
        node = node.parent;
      }
    }
    return null;
  }

  function canEditNow() {
    return !character?.isBusy?.();
  }

  function refreshHud() {
    document.body.classList.toggle("is-village-editing", state.active);
    if (ui.toggle) ui.toggle.setAttribute("aria-pressed", String(state.active));
    if (ui.bar) ui.bar.hidden = !state.active;
    if (!state.active) return;

    if (state.holding) {
      if (ui.title) ui.title.textContent = state.holding.label;
      if (ui.hint) {
        ui.hint.textContent = state.valid
          ? "Ziehe es auf ein Feld oder drehe es mit ↻."
          : "Zu nah an einem anderen Gebäude oder außerhalb des Dorfs.";
      }
      if (ui.actions) ui.actions.hidden = false;
      if (ui.confirm) ui.confirm.disabled = !state.valid;
    } else {
      if (ui.title) ui.title.textContent = "Dorf anordnen";
      if (ui.hint) ui.hint.textContent = "Tippe ein Gebäude und setze es auf ein freies Feld.";
      if (ui.actions) ui.actions.hidden = true;
    }
  }

  function colorTiles(elapsed) {
    const pulse = 0.78 + Math.sin(elapsed * 4.2) * 0.22;
    const holdCells = new Set();
    if (state.holding) {
      grid
        .footprintCells(state.previewCol, state.previewRow, state.holding.w, state.holding.h)
        .forEach((cell) => holdCells.add(`${cell.col},${cell.row}`));
    }
    const occupied = new Set();
    grid.list().forEach((building) => {
      if (state.holding && building.id === state.holding.id) return;
      grid.footprintCells(building.col, building.row, building.w, building.h).forEach((cell) => {
        occupied.add(`${cell.col},${cell.row}`);
      });
    });

    villageCells.forEach((cell, index) => {
      const key = `${cell.col},${cell.row}`;
      let color = COLORS.idle;
      let scale = 1;
      if (occupied.has(key)) {
        color = COLORS.occupied;
        scale = 0.92;
      }
      if (
        state.hoverCell &&
        !state.holding &&
        cell.col === state.hoverCell.col &&
        cell.row === state.hoverCell.row
      ) {
        color = COLORS.hover;
        scale = 1.06;
      }
      if (holdCells.has(key)) {
        color = state.valid ? COLORS.valid : COLORS.invalid;
        scale = 1.08;
        tileColor.copy(color).multiplyScalar(pulse);
        color = tileColor;
      }
      dummy.position.set(cell.col * CELL, 0, cell.row * CELL);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      tiles.setMatrixAt(index, dummy.matrix);
      tiles.setColorAt(index, color);
    });
    tiles.instanceMatrix.needsUpdate = true;
    tiles.instanceColor.needsUpdate = true;
  }

  function setPreview(minCol, minRow) {
    if (!state.holding) return;
    state.previewCol = minCol;
    state.previewRow = minRow;
    state.valid = grid.preview(state.holding.id, minCol, minRow);
    shadow.material.color.set(state.valid ? 0x1b140c : 0x6e1408);
    const world = footprintWorld(minCol, minRow, state.holding.w, state.holding.h);
    shadow.position.x = world.x;
    shadow.position.z = world.z;
    const span = Math.max(state.holding.w, state.holding.h);
    shadow.scale.setScalar(0.72 + span * 0.55);
    refreshHud();
  }

  function pickUp(building) {
    if (!building) return;
    if (state.holding && state.holding.id !== building.id) {
      grid.restore(state.holding.id);
    }
    state.holding = building;
    state.previewCol = building.col;
    state.previewRow = building.row;
    state.valid = true;
    state.liftTarget = 1;
    const world = footprintWorld(building.col, building.row, building.w, building.h);
    shadow.position.x = world.x;
    shadow.position.z = world.z;
    refreshHud();
  }

  function cancelHold() {
    if (!state.holding) return;
    grid.restore(state.holding.id);
    state.holding = null;
    state.liftTarget = 0;
    refreshHud();
  }

  function confirmHold() {
    if (!state.holding) return;
    if (!state.valid) {
      state.shake = 1;
      return;
    }
    grid.commit(state.holding.id, state.previewCol, state.previewRow);
    state.holding = null;
    state.liftTarget = 0;
    refreshHud();
  }

  function rotateHold() {
    if (!state.holding) return;
    grid.rotate(state.holding.id, 1);
    setPreview(state.previewCol, state.previewRow);
  }

  function setActive(next) {
    if (next && !canEditNow()) {
      if (ui.hint && ui.bar) {
        ui.bar.hidden = false;
        if (ui.title) ui.title.textContent = "Noch beschäftigt";
        ui.hint.textContent = "Warte, bis alle Bewohner zu Hause sind.";
        window.setTimeout(() => {
          if (!state.active && ui.bar) ui.bar.hidden = true;
        }, 1600);
      }
      return;
    }
    if (next === state.active) return;
    if (!next) cancelHold();
    state.active = next;
    overlay.visible = true;
    if (next) {
      setCameraView?.("arrange");
    } else {
      setCameraView?.("clearing");
    }
    refreshHud();
    onModeChange?.(next);
  }

  function onPointerDown(event) {
    if (!state.active || event.button !== 0) return;
    if (event.target?.closest?.(".panel, .worker-dock, .village-edit-bar, .village-edit-toggle")) {
      return;
    }
    state.pointerDown = { x: event.clientX, y: event.clientY, building: pickBuilding(event) };
    if (state.holding && !state.pointerDown.building) {
      state.dragging = true;
      controls.enabled = false;
    }
  }

  function onPointerMove(event) {
    if (!state.active) return;
    const cell = groundCell(event);
    state.hoverCell = cell && grid.inVillage(cell.col, cell.row) ? cell : null;
    const over = pickBuilding(event);
    state.hoverId = over?.id ?? null;
    canvas.classList.toggle("is-over-building", Boolean(over) || Boolean(state.holding));

    if (state.dragging && state.holding && cell) {
      const corner = worldToMinCorner(cell.x, cell.z, state.holding.w, state.holding.h);
      setPreview(corner.col, corner.row);
    }
  }

  function onPointerUp(event) {
    if (!state.active) {
      state.pointerDown = null;
      state.dragging = false;
      controls.enabled = true;
      return;
    }
    const down = state.pointerDown;
    state.pointerDown = null;
    const wasDragging = state.dragging;
    state.dragging = false;
    controls.enabled = true;
    if (!down || event.button !== 0) return;
    if (event.target?.closest?.(".panel, .worker-dock, .village-edit-bar, .village-edit-toggle")) {
      return;
    }
    const travel = Math.hypot(event.clientX - down.x, event.clientY - down.y);
    if (wasDragging && travel > CLICK_SLOP) return;

    const building = pickBuilding(event);
    if (building) {
      pickUp(building);
      return;
    }
    if (state.holding) {
      const cell = groundCell(event);
      if (!cell) return;
      const corner = worldToMinCorner(cell.x, cell.z, state.holding.w, state.holding.h);
      setPreview(corner.col, corner.row);
    }
  }

  ui.toggle?.addEventListener("click", (event) => {
    event.preventDefault();
    setActive(!state.active);
  });
  ui.done?.addEventListener("click", (event) => {
    event.preventDefault();
    setActive(false);
  });
  ui.confirm?.addEventListener("click", (event) => {
    event.preventDefault();
    confirmHold();
  });
  ui.cancel?.addEventListener("click", (event) => {
    event.preventDefault();
    cancelHold();
  });
  ui.rotate?.addEventListener("click", (event) => {
    event.preventDefault();
    rotateHold();
  });
  window.addEventListener("keydown", (event) => {
    if (!state.active) return;
    if (event.key === "r" || event.key === "R") {
      rotateHold();
      return;
    }
    if (event.key === "Escape") {
      if (state.holding) cancelHold();
      else setActive(false);
    }
    if (event.key === "Enter") confirmHold();
  });

  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", () => {
    state.pointerDown = null;
    state.dragging = false;
    controls.enabled = true;
  });

  function register(spec) {
    return grid.register(spec);
  }

  function update(delta, elapsed) {
    state.pulse = elapsed;
    const fadeTarget = state.active ? 1 : 0;
    state.fade = THREE.MathUtils.damp(state.fade, fadeTarget, 7.2, delta);
    state.lift = THREE.MathUtils.damp(state.lift, state.liftTarget, 8.5, delta);
    state.shake = Math.max(0, state.shake - delta * 3.4);
    tiles.material.opacity = state.fade * 0.55;
    gridLines.material.opacity = state.fade * 0.4;
    plaza.material.opacity = state.fade * 0.34;
    plaza.material.depthTest = false;
    shadow.material.opacity = state.fade * state.lift * (state.valid ? 0.28 : 0.16);
    overlay.visible = state.fade > 0.01;

    if (state.holding) {
      const world = footprintWorld(state.previewCol, state.previewRow, state.holding.w, state.holding.h);
      const bob = Math.sin(elapsed * 3.1) * 0.03 * state.lift;
      const shakeX = Math.sin(elapsed * 38) * 0.05 * state.shake;
      state.holding.root.position.set(
        world.x + shakeX,
        walkArea.surfaceY + state.lift * LIFT_HEIGHT + bob,
        world.z,
      );
      if (state.holding.id === "cottage" || state.holding.id === "research") {
        const lift = state.lift * LIFT_HEIGHT + bob;
        if (character.liftIndoors) {
          character.liftIndoors(lift);
        } else if (character?.isIndoors?.()) {
          character.relocateWithHome();
          character.root.position.y += lift;
        }
      }
    } else {
      grid.list().forEach((building) => {
        building.root.position.y = walkArea.surfaceY;
      });
    }

    if (overlay.visible) colorTiles(elapsed);
  }

  return {
    register,
    update,
    isActive: () => state.active,
    setActive,
    pickUp,
    cancelHold,
    confirmHold,
    previewAt: setPreview,
    grid,
  };
}

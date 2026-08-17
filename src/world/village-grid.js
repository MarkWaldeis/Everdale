import * as THREE from "three";

export const CELL = 2.2;
export const DEFAULT_PADDING = 1;
const STORAGE_KEY = "everdale-village-v2";

export function cellCenter(col, row) {
  return { x: col * CELL, z: row * CELL };
}

export function footprintWorld(minCol, minRow, width, depth) {
  return {
    x: (minCol + (width - 1) / 2) * CELL,
    z: (minRow + (depth - 1) / 2) * CELL,
  };
}

export function worldToMinCorner(x, z, width, depth) {
  return {
    col: Math.round(x / CELL - (width - 1) / 2),
    row: Math.round(z / CELL - (depth - 1) / 2),
  };
}

export function footprintCells(minCol, minRow, width, depth) {
  const cells = [];
  for (let col = 0; col < width; col += 1) {
    for (let row = 0; row < depth; row += 1) {
      cells.push({ col: minCol + col, row: minRow + row });
    }
  }
  return cells;
}

export function footprintFromSize(sizeX, sizeZ) {
  return {
    w: Math.max(1, Math.ceil((sizeX - 0.12) / CELL)),
    h: Math.max(1, Math.ceil((sizeZ - 0.12) / CELL)),
  };
}

export function createVillageGrid({ radiusX, radiusZ, surfaceY }) {
  const buildings = new Map();

  function inVillage(col, row) {
    const { x, z } = cellCenter(col, row);
    const limitX = Math.max(radiusX - CELL * 0.72, CELL * 2.2);
    const limitZ = Math.max(radiusZ - CELL * 0.72, CELL * 2.2);
    return (x / limitX) ** 2 + (z / limitZ) ** 2 <= 1;
  }

  function listVillageCells() {
    const cells = [];
    const rangeC = Math.ceil(radiusX / CELL) + 2;
    const rangeR = Math.ceil(radiusZ / CELL) + 2;
    for (let col = -rangeC; col <= rangeC; col += 1) {
      for (let row = -rangeR; row <= rangeR; row += 1) {
        if (inVillage(col, row)) cells.push({ col, row });
      }
    }
    return cells;
  }

  function blockedKeys(ignoreId = null) {
    const blocked = new Set();
    buildings.forEach((building) => {
      if (building.id === ignoreId) return;
      const padding = building.padding ?? DEFAULT_PADDING;
      footprintCells(building.col, building.row, building.w, building.h).forEach((cell) => {
        for (let dc = -padding; dc <= padding; dc += 1) {
          for (let dr = -padding; dr <= padding; dr += 1) {
            blocked.add(`${cell.col + dc},${cell.row + dr}`);
          }
        }
      });
    });
    return blocked;
  }

  function canPlace(id, minCol, minRow) {
    const building = buildings.get(id);
    if (!building) return false;
    const cells = footprintCells(minCol, minRow, building.w, building.h);
    if (!cells.length) return false;
    if (cells.some((cell) => !inVillage(cell.col, cell.row))) return false;
    const blocked = blockedKeys(id);
    return cells.every((cell) => !blocked.has(`${cell.col},${cell.row}`));
  }

  function nearestValid(id, preferredCol, preferredRow) {
    if (canPlace(id, preferredCol, preferredRow)) {
      return { col: preferredCol, row: preferredRow };
    }
    for (let radius = 1; radius <= 18; radius += 1) {
      for (let dc = -radius; dc <= radius; dc += 1) {
        for (let dr = -radius; dr <= radius; dr += 1) {
          if (Math.max(Math.abs(dc), Math.abs(dr)) !== radius) continue;
          if (canPlace(id, preferredCol + dc, preferredRow + dr)) {
            return { col: preferredCol + dc, row: preferredRow + dr };
          }
        }
      }
    }
    return null;
  }

  function applyWorld(building) {
    const world = footprintWorld(building.col, building.row, building.w, building.h);
    building.setWorldPosition?.(world.x, world.z);
    building.setYaw?.(building.yaw);
    building.refresh?.();
    building.onRelocated?.();
  }

  function register(spec) {
    const size = spec.size ?? new THREE.Vector3(CELL, 1, CELL);
    const auto = footprintFromSize(size.x, size.z);
    const record = {
      id: spec.id,
      label: spec.label ?? spec.id,
      root: spec.root,
      w: spec.w ?? auto.w,
      h: spec.h ?? auto.h,
      padding: spec.padding ?? DEFAULT_PADDING,
      yaw: spec.yaw ?? spec.root?.rotation.y ?? 0,
      col: 0,
      row: 0,
      setWorldPosition: spec.setWorldPosition,
      setYaw: spec.setYaw,
      refresh: spec.refresh,
      onRelocated: spec.onRelocated,
    };
    const preferred = spec.preferred
      ? worldToMinCorner(spec.preferred.x, spec.preferred.z, record.w, record.h)
      : worldToMinCorner(spec.root.position.x, spec.root.position.z, record.w, record.h);
    buildings.set(record.id, record);
    const saved = readSave()[record.id];
    if (Number.isFinite(saved?.yaw)) record.yaw = saved.yaw;
    const start = saved
      ? nearestValid(record.id, saved.col, saved.row) ?? preferred
      : nearestValid(record.id, preferred.col, preferred.row) ?? preferred;
    record.col = start.col;
    record.row = start.row;
    applyWorld(record);
    spec.root.userData.isVillageBuilding = record.id;
    spec.root.userData.villageLabel = record.label;
    return record;
  }

  function commit(id, minCol, minRow) {
    const building = buildings.get(id);
    if (!building || !canPlace(id, minCol, minRow)) return false;
    building.col = minCol;
    building.row = minRow;
    applyWorld(building);
    writeSave();
    return true;
  }

  function rotate(id, turns = 1) {
    const building = buildings.get(id);
    if (!building) return false;
    const steps = ((turns % 4) + 4) % 4;
    if (!steps) return true;
    for (let index = 0; index < steps; index += 1) {
      building.yaw += Math.PI * 0.5;
      const nextW = building.h;
      const nextH = building.w;
      building.w = nextW;
      building.h = nextH;
    }
    if (building.yaw > Math.PI * 2) building.yaw -= Math.PI * 2;
    applyWorld(building);
    writeSave();
    return true;
  }

  function preview(id, minCol, minRow) {
    const building = buildings.get(id);
    if (!building) return false;
    const world = footprintWorld(minCol, minRow, building.w, building.h);
    building.setWorldPosition?.(world.x, world.z);
    building.refresh?.();
    building.onRelocated?.();
    return canPlace(id, minCol, minRow);
  }

  function restore(id) {
    const building = buildings.get(id);
    if (!building) return;
    applyWorld(building);
  }

  function readSave() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function writeSave() {
    const payload = {};
    buildings.forEach((building) => {
      payload[building.id] = { col: building.col, row: building.row, yaw: building.yaw };
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Private mode or blocked storage should not break play.
    }
  }

  return {
    cell: CELL,
    surfaceY,
    register,
    canPlace,
    commit,
    rotate,
    preview,
    restore,
    nearestValid,
    inVillage,
    listVillageCells,
    footprintCells,
    get: (id) => buildings.get(id),
    list: () => [...buildings.values()],
  };
}

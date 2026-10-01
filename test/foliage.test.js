import test from "node:test";
import assert from "node:assert/strict";
import { createFoliage } from "../src/world/foliage.js";

test("foliage builds valid instanced meshes", () => {
  const { root } = createFoliage({
    area: { radiusX: 10, radiusZ: 8, surfaceY: 0 },
    zones: [{ x: 0, z: 0, r: 2 }],
  });
  assert.ok(root);
  const meshes = root.children.filter((child) => child.isInstancedMesh);
  assert.equal(meshes.length, 3);
  meshes.forEach((mesh) => {
    assert.ok(mesh.geometry, "merged geometry must exist");
    assert.ok(mesh.count > 0, "instances must be scattered");
    assert.ok(mesh.geometry.getAttribute("position").count > 0);
  });
});

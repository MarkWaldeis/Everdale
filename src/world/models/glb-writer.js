import * as THREE from "three";

function align4(value) {
  return (value + 3) & ~3;
}

function writeU32(view, offset, value) {
  view.setUint32(offset, value, true);
}

function toTypedArray(attribute) {
  const array = attribute.array;
  if (array instanceof Float32Array) return array;
  if (array instanceof Uint32Array) return array;
  if (array instanceof Uint16Array) return array;
  if (array instanceof Int16Array) return array;
  const copy = new Float32Array(attribute.count * attribute.itemSize);
  for (let index = 0; index < copy.length; index += 1) copy[index] = array[index];
  return copy;
}

function boundsOf(array, itemSize) {
  const min = Array.from({ length: itemSize }, () => Infinity);
  const max = Array.from({ length: itemSize }, () => -Infinity);
  for (let index = 0; index < array.length; index += itemSize) {
    for (let axis = 0; axis < itemSize; axis += 1) {
      const value = array[index + axis];
      if (value < min[axis]) min[axis] = value;
      if (value > max[axis]) max[axis] = value;
    }
  }
  return { min, max };
}

export function exportGroupToGlb(root) {
  root.updateWorldMatrix(true, true);

  const json = {
    asset: { version: "2.0", generator: "Everdale self-built GLB" },
    scene: 0,
    scenes: [{ nodes: [] }],
    nodes: [],
    meshes: [],
    materials: [],
    accessors: [],
    bufferViews: [],
    buffers: [{ byteLength: 0 }],
  };

  const chunks = [];
  let byteOffset = 0;

  function addView(typed, target) {
    const bytes = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
    const padded = align4(bytes.byteLength);
    const view = {
      buffer: 0,
      byteOffset,
      byteLength: bytes.byteLength,
    };
    if (target != null) view.target = target;
    json.bufferViews.push(view);
    chunks.push({ bytes, padded });
    byteOffset += padded;
    return json.bufferViews.length - 1;
  }

  function addAccessor(typed, itemSize, componentType, type, target, extras = {}) {
    const view = addView(typed, target);
    const accessor = {
      bufferView: view,
      componentType,
      count: typed.length / itemSize,
      type,
      ...extras,
    };
    json.accessors.push(accessor);
    return json.accessors.length - 1;
  }

  const identity = new THREE.Matrix4();
  const normalMatrix = new THREE.Matrix3();

  root.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;

    const geometry = child.geometry.clone();
    geometry.applyMatrix4(child.matrixWorld);
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    const position = toTypedArray(geometry.getAttribute("position"));
    const normalAttr = geometry.getAttribute("normal");
    let normals = normalAttr ? toTypedArray(normalAttr) : null;
    if (normals) {
      normalMatrix.getNormalMatrix(child.matrixWorld);
      // Normals already transformed via applyMatrix4 on the cloned geometry.
    }

    const colorAttr = geometry.getAttribute("color");
    const colors = colorAttr ? toTypedArray(colorAttr) : null;

    let indices;
    if (geometry.index) {
      const source = geometry.index.array;
      indices =
        source.length > 65535 || position.length / 3 > 65535
          ? Uint32Array.from(source)
          : Uint16Array.from(source);
    } else {
      const count = position.length / 3;
      indices = count > 65535 ? new Uint32Array(count) : new Uint16Array(count);
      for (let index = 0; index < count; index += 1) indices[index] = index;
    }

    const positionBounds = boundsOf(position, 3);
    const positionAccessor = addAccessor(
      position,
      3,
      5126,
      "VEC3",
      34962,
      positionBounds,
    );
    const attributes = { POSITION: positionAccessor };
    if (normals && normals.length === position.length) {
      attributes.NORMAL = addAccessor(normals, 3, 5126, "VEC3", 34962);
    }
    if (colors) {
      const itemSize = colorAttr.itemSize >= 4 ? 4 : 3;
      const packed =
        itemSize === 4 && colors.length === (position.length / 3) * 4
          ? colors
          : colors;
      attributes.COLOR_0 = addAccessor(
        packed,
        packed.length === (position.length / 3) * 4 ? 4 : 3,
        5126,
        packed.length === (position.length / 3) * 4 ? "VEC4" : "VEC3",
        34962,
      );
    }

    const indexAccessor = addAccessor(
      indices,
      1,
      indices instanceof Uint32Array ? 5125 : 5123,
      "SCALAR",
      34963,
    );

    const material = Array.isArray(child.material) ? child.material[0] : child.material;
    const color = material?.color ? material.color : new THREE.Color(0xffffff);
    const opacity = material?.opacity ?? 1;
    json.materials.push({
      name: child.name || "mesh",
      pbrMetallicRoughness: {
        baseColorFactor: [color.r, color.g, color.b, opacity],
        metallicFactor: THREE.MathUtils.clamp(material?.metalness ?? 0.04, 0, 1),
        roughnessFactor: THREE.MathUtils.clamp(material?.roughness ?? 0.78, 0.04, 1),
      },
      doubleSided: Boolean(material?.side === THREE.DoubleSide),
      alphaMode: opacity < 0.999 ? "BLEND" : "OPAQUE",
    });

    json.meshes.push({
      name: child.name || "mesh",
      primitives: [
        {
          attributes,
          indices: indexAccessor,
          material: json.materials.length - 1,
        },
      ],
    });

    json.nodes.push({
      name: child.name || "node",
      mesh: json.meshes.length - 1,
    });
    json.scenes[0].nodes.push(json.nodes.length - 1);
    geometry.dispose();
    identity.identity();
  });

  const binLength = byteOffset;
  const binPadded = align4(binLength);
  const binary = new Uint8Array(binPadded);
  let cursor = 0;
  chunks.forEach((chunk) => {
    binary.set(chunk.bytes, cursor);
    cursor += chunk.padded;
  });

  json.buffers[0].byteLength = binPadded;
  const jsonText = JSON.stringify(json);
  const jsonBytes = new TextEncoder().encode(jsonText);
  const jsonPadded = align4(jsonBytes.byteLength);
  const jsonChunk = new Uint8Array(jsonPadded);
  jsonChunk.set(jsonBytes);
  for (let index = jsonBytes.byteLength; index < jsonPadded; index += 1) {
    jsonChunk[index] = 0x20;
  }

  const total = 12 + 8 + jsonPadded + 8 + binPadded;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  writeU32(view, 0, 0x46546c67);
  writeU32(view, 4, 2);
  writeU32(view, 8, total);
  writeU32(view, 12, jsonPadded);
  writeU32(view, 16, 0x4e4f534a);
  out.set(jsonChunk, 20);
  const binHeader = 20 + jsonPadded;
  writeU32(view, binHeader, binPadded);
  writeU32(view, binHeader + 4, 0x004e4942);
  out.set(binary, binHeader + 8);
  return out;
}

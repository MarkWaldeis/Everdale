import * as THREE from "three";

export function standardMaterial({
  color = 0xffffff,
  roughness = 0.8,
  metalness = 0.03,
  opacity = 1,
  side = THREE.FrontSide,
} = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    opacity,
    transparent: opacity < 0.999,
    vertexColors: true,
    side,
  });
}

export function paintGeometry(geometry, hex, vary = 0.07) {
  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  const color = new THREE.Color(hex);
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const wave =
      Math.sin(x * 6.7 + z * 4.8) * 0.45 +
      Math.cos(y * 8.1 + x * 2.2) * 0.35 +
      Math.sin((x + y + z) * 3.4) * 0.2;
    const shade = 1 + wave * vary;
    colors[index * 3] = THREE.MathUtils.clamp(color.r * shade, 0, 1);
    colors[index * 3 + 1] = THREE.MathUtils.clamp(color.g * shade, 0, 1);
    colors[index * 3 + 2] = THREE.MathUtils.clamp(color.b * shade, 0, 1);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function addMesh(parent, geometry, hex, options = {}) {
  paintGeometry(geometry, hex, options.vary ?? 0.07);
  const mesh = new THREE.Mesh(
    geometry,
    standardMaterial({
      color: 0xffffff,
      roughness: options.roughness ?? 0.8,
      metalness: options.metalness ?? 0.03,
      opacity: options.opacity ?? 1,
      side: options.side ?? THREE.FrontSide,
    }),
  );
  mesh.name = options.name ?? "part";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(options.x ?? 0, options.y ?? 0, options.z ?? 0);
  mesh.rotation.set(options.rx ?? 0, options.ry ?? 0, options.rz ?? 0);
  if (options.sx != null || options.sy != null || options.sz != null) {
    mesh.scale.set(options.sx ?? 1, options.sy ?? 1, options.sz ?? 1);
  }
  parent.add(mesh);
  return mesh;
}

export function box(parent, w, h, d, hex, options = {}) {
  return addMesh(parent, new THREE.BoxGeometry(w, h, d), hex, {
    ...options,
    y: (options.y ?? 0) + (options.centerY ? 0 : h * 0.5),
  });
}

export function cyl(parent, radiusTop, radiusBottom, height, hex, options = {}) {
  const radial = options.radial ?? 12;
  return addMesh(
    parent,
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radial),
    hex,
    {
      ...options,
      y: (options.y ?? 0) + (options.centerY ? 0 : height * 0.5),
    },
  );
}

export function sphere(parent, radius, hex, options = {}) {
  return addMesh(
    parent,
    new THREE.SphereGeometry(radius, options.segW ?? 14, options.segH ?? 10),
    hex,
    options,
  );
}

export function lathe(parent, points, hex, options = {}) {
  const vectors = points.map((point) => new THREE.Vector2(point[0], point[1]));
  return addMesh(
    parent,
    new THREE.LatheGeometry(vectors, options.segments ?? 20),
    hex,
    { ...options, centerY: true },
  );
}

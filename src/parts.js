import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const boxes = new Map();

export function mesh(parent, geometry, material, x = 0, y = 0, z = 0, cast = true) {
  const part = new THREE.Mesh(geometry, material);
  part.position.set(x, y, z);
  part.castShadow = cast;
  part.receiveShadow = true;
  parent.add(part);
  return part;
}

export function box(parent, material, x, y, z, w, h, d, radius = 0, cast = true) {
  const key = [w, h, d, radius].join("|");
  if (!boxes.has(key)) {
    boxes.set(key, radius ? new RoundedBoxGeometry(w, h, d, 2, radius) : new THREE.BoxGeometry(w, h, d));
  }
  return mesh(parent, boxes.get(key), material, x, y, z, cast);
}

export function group(parent, x = 0, y = 0, z = 0, yaw = 0) {
  const part = new THREE.Group();
  part.position.set(x, y, z);
  part.rotation.y = yaw;
  parent.add(part);
  return part;
}

export function tube(parent, material, points, radius = .013, segments = 22) {
  const path = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  return mesh(parent, new THREE.TubeGeometry(path, segments, radius, 8, false), material);
}

export function cylinder(parent, material, x, y, z, radius, height, taper = 1) {
  return mesh(parent, new THREE.CylinderGeometry(radius, radius * taper, height, 20), material, x, y, z);
}

export function cloth(parent, material, x, y, z, width, height, folds, sway = .034) {
  const surface = new THREE.PlaneGeometry(width, height, 70, 20);
  const vertices = surface.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const u = vertices.getX(i) / width + .5;
    const v = vertices.getY(i) / height + .5;
    const drop = 1 - v;
    const phase = u * Math.PI * 2 * folds + .83 * Math.sin(u * 9 + .2) + drop * Math.sin(u * 17 + v * 3);
    const foldDepth = sway * (.41 + drop * (.56 + .18 * Math.sin(u * 12)));
    const hem = drop ** 2 * (.013 * Math.cos(phase) + .024 * Math.sin(u * 8 + .6));
    vertices.setXYZ(i,
      vertices.getX(i) + drop * .028 * Math.sin(u * 11),
      vertices.getY(i) + hem,
      Math.sin(phase) * foldDepth + drop * .022 * Math.sin(u * 13 + v * 3));
  }
  surface.computeVertexNormals();
  return mesh(parent, surface, material, x, y, z);
}

export function mergeStatic(parent, result) {
  const batches = new Map();
  parent.updateWorldMatrix(true, true);
  parent.traverse(part => {
    if (!part.isMesh) return;
    const key = [part.material.uuid, part.castShadow, part.receiveShadow].join(":");
    if (!batches.has(key)) batches.set(key, { material: part.material, casts: part.castShadow, receives: part.receiveShadow, shapes: [] });
    const geometry = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
    geometry.clearGroups();
    geometry.applyMatrix4(part.matrixWorld);
    batches.get(key).shapes.push(geometry);
  });
  for (const batch of batches.values()) {
    const geometry = mergeGeometries(batch.shapes);
    mesh(result, geometry, batch.material, 0, 0, 0, batch.casts).receiveShadow = batch.receives;
    for (const shape of batch.shapes) shape.dispose();
  }
}

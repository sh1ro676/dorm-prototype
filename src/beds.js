import * as THREE from "three";
import { box, cloth, group, tube } from "./parts.js";

function addBedding(station, moving, m, index, headEnd) {
  const sheet = m.material(index === 0 ? "#c5c2cb" : "#cfcbc1", .94);
  const pillow = m.material("#e4e0d9", .96);
  const quilt = m.material(["#777da6", "#a79a80", "#6e8999", "#909ba9"][index], .94);
  const stitching = m.material(["#959bbd", "#bbae94", "#88a2ad", "#a7b1bd"][index], .93);
  box(station, sheet, 0, 1.85, -.013, 2.034, .132, .904, .035);
  const cushion = box(moving, pillow, headEnd * .723, 1.978, -.039, .46, .126, .635, .060);
  const covers = group(moving, -headEnd * .238, 1.916, -.021);
  box(covers, quilt, 0, .034, 0, 1.421, .076, .856, .036);
  box(covers, stitching, headEnd * .605, .068, 0, .180, .020, .839, .010);
  for (const z of [-.258, 0, .258]) {
    tube(covers, stitching, [[-.666, .067, z], [-.35, .072, z + .009],
      [0, .073, z - .009], [.35, .072, z + .005], [.665, .066, z]], .0027, 16);
  }
  function setTidy(progress) {
    const loose = 1 - progress;
    const lift = Math.sin(progress * Math.PI);
    cushion.position.set(headEnd * (.723 - .035 * loose), 1.978 + .029 * lift, -.039 + .081 * loose);
    cushion.rotation.y = headEnd * (.035 + .205 * loose);
    covers.position.set(-headEnd * (.238 - .041 * loose), 1.916 + .034 * lift, -.021 - .037 * loose);
    covers.rotation.y = headEnd * -.071 * loose;
  }
  setTidy(0);
  return setTidy;
}

function slidingCurtain(parent, m, fabric, spec) {
  const { x, y, z, width, height, yaw, folds, sway, parkX, parkZ, packedWidth, hangerDepth = .022 } = spec;
  const panel = group(parent, x, y, z, yaw);
  const drape = cloth(panel, fabric, 0, 0, 0, width, height, folds, sway);
  const hangerCount = folds;
  const hangers = Array.from({ length: hangerCount }, () =>
    box(panel, m.enamel, 0, height / 2 + .013, (.020 - hangerDepth) / 2, .018, .050, hangerDepth, .005));
  const closed = parent.localToWorld(new THREE.Vector3(x, y, z));
  const open = parent.localToWorld(new THREE.Vector3(parkX, y, parkZ));
  const worldAngle = parent.rotation.y + yaw;
  const cos = Math.abs(Math.cos(worldAngle)), sin = Math.abs(Math.sin(worldAngle));
  function setOpen(progress) {
    const span = THREE.MathUtils.lerp(width, packedWidth, progress);
    panel.position.x = THREE.MathUtils.lerp(x, parkX, progress);
    panel.position.z = THREE.MathUtils.lerp(z, parkZ, progress);
    drape.scale.x = span / width;
    hangers.forEach((hanger, index) => { hanger.position.x = span * ((index + .5) / hangerCount - .5); });
  }
  function target(progress) {
    const halfWidth = THREE.MathUtils.lerp(width, packedWidth, progress) / 2;
    return {
      x: THREE.MathUtils.lerp(closed.x, open.x, progress), y: closed.y,
      z: THREE.MathUtils.lerp(closed.z, open.z, progress),
      hx: cos * halfWidth + sin * .075, hy: height / 2, hz: sin * halfWidth + cos * .075
    };
  }
  setOpen(0);
  return { setOpen, target };
}

export function buildUpperBed(station, moving, m, index, headDirection) {
  const { x, z } = station.position;
  const side = Math.sign(x);
  const headEnd = side * headDirection;
  const movable = group(moving, x, 0, z, station.rotation.y);
  const setTidy = addBedding(station, movable, m, index, headEnd);
  const fabric = m.curtains[index];
  const aisle = slidingCurtain(movable, m, fabric, {
    x: 0, y: 2.309, z: .421, width: 1.93, height: .901, yaw: 0,
    folds: 9, sway: .057, parkX: headEnd * .813, parkZ: .421, packedWidth: .290, hangerDepth: .090
  });

  const stairEnd = -headEnd;
  const stair = slidingCurtain(movable, m, fabric, {
    x: stairEnd * .976, y: 2.326, z: -.016, width: .850, height: .869, yaw: stairEnd * Math.PI / 2,
    folds: 5, sway: .030, parkX: stairEnd * .976, parkZ: .332, packedWidth: .180
  });
  cloth(station, fabric, headEnd * .976, 2.326, -.016, .850, .869, 5, .030).rotation.y = headEnd * Math.PI / 2;
  for (const railEnd of [-1, 1]) {
    box(station, m.enamel, railEnd * .976, 2.775, -.036, .026, .025, .886, .010);
  }
  for (const hangerZ of [-.350, -.170, .010, .190, .346]) {
    box(station, m.enamel, headEnd * .976, 2.756, hangerZ, .038, .060, .019, .006);
  }
  return {
    index, side, x, z, headDirection,
    mattress: { x, y: 1.970, z, hx: .445, hy: .090, hz: .965 },
    pillow: { x, y: 1.985, z: z + headDirection * .718, hx: .337, hy: .078, hz: .240 },
    quilt: { x, y: 1.958, z: z - headDirection * .217, hx: .442, hy: .073, hz: .695 },
    curtains: { aisle, stair },
    setTidy
  };
}

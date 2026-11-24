import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { FXAAPass } from "three/addons/postprocessing/FXAAPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { box, group, mergeStatic, mesh, tube } from "./parts.js";
import { makeMaterials } from "./materials.js";
import { buildUpperBed } from "./beds.js";
import { createStorage } from "./storage.js";
import {
  buildChair, buildDeskInteraction, buildStairs, buildStation, deskPosition, entryCabinet, entryCabinetSize,
  frontBed, rearBed, stairs, stairTreads, stationX
} from "./furniture.js";
import { buildComputerDeskLight, buildDeskLamp, buildLightSwitch, computerLampSwitch, deskLamp } from "./room-fixtures.js";

export const room = { halfWidth: 1.95, frontZ: .568, backZ: -6.20, height: 2.92, entryHalfWidth: .50 };
const doorHalfWidth = room.entryHalfWidth - .005;
export const door = { x: doorHalfWidth, z: room.frontZ + .012, width: 2 * doorHalfWidth, height: 2.093, thickness: .043,
  yaw: 0, bottom: .012, openAngle: -Math.PI / 2 };
const entranceWallZ = room.frontZ + .043;
export const ceilingSwitch = { x: 1.052, y: 1.232, z: entranceWallZ - .051, yaw: Math.PI / 2,
  hx: .056, hy: .069, hz: .036 };
export { computerLampSwitch, deskLamp, stairs, stairTreads };
export const chairs = [
  { pushed: -.948, z: frontBed - .09 },
  { pushed: -.874, z: rearBed - .04 },
  { pushed: .874, z: frontBed + .04 },
  { pushed: .874, z: rearBed + .04 }
].map(({ pushed, z }, index) => {
  const side = Math.sign(pushed);
  return { index, side, pushed, pulled: side * .495, z, yaw: -side * Math.PI / 2, half: .262 };
});
export const fieldOfView = Math.PI / 2.91;
export const screen = { x: -stationX + deskPosition.screen[2], y: deskPosition.screen[1], z: frontBed - deskPosition.screen[0] };
export const book = { x: -stationX + deskPosition.book[2], y: deskPosition.book[1], z: frontBed - deskPosition.book[0] - .051 };
export const colliders = [1, -1].flatMap(side => [
  { x: side * entryCabinetSize.x, z: entryCabinetSize.z, hx: entryCabinetSize.depth / 2 + .035, hz: entryCabinetSize.width / 2 },
  { x: side * stationX, z: frontBed, hx: .501, hz: 1.10, station: true },
  { x: side * stationX, z: rearBed, hx: .501, hz: 1.10, station: true }
]);

export function basis(yaw, pitch) {
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  const tilt = Math.sin(pitch), flat = Math.cos(pitch);
  return {
    forward: [-sin * flat, tilt, -cos * flat],
    right: [cos, 0, -sin],
    up: [sin * tilt, flat, cos * tilt]
  };
}

function outside(parent, m) {
  const sky = new THREE.MeshBasicMaterial({ color: "#acbcc3" });
  box(parent, sky, 0, 4, -11.8, 22, 13, .05, 0, false);
  box(parent, m.desk, 0, -.069, -6.75, 2.40, .135, 1.09, .005, false);
  const rail = m.material("#61686a", .55);
  for (const x of [-1, -.63, -.28, .08, .45, .80, 1.01]) box(parent, rail, x, .49, -7.18, .026, .979, .033, .003);
  for (const y of [.11, .54, 1.012]) box(parent, rail, 0, y, -7.18, 2.12, .026, .044, .003, false);
  const facade = m.material("#a27664", .88);
  const recess = m.material("#444e55", .57);
  const front = m.material("#c6c1ad", .76);
  box(parent, facade, .1, 1.7, -10.25, 13, 7, .13, 0, false);
  for (const y of [-.9, .48, 1.86, 3.24, 4.62]) {
    box(parent, front, .1, y - .425, -10.10, 13, .09, .57, 0, false);
    box(parent, front, .1, y + .13, -9.86, 13, .021, .039, 0, false);
    for (let i = -4; i < 5; i++) {
      const x = i * 1.37;
      box(parent, recess, x, y + .065, -10.174, .94, .842, .032, 0, false);
      box(parent, front, x, y + .068, -10.142, .019, .841, .02, 0, false);
      box(parent, front, x + .61, y - .205, -9.88, .022, .418, .026, 0, false);
    }
  }
}

function tiledFloor(parent, material, backZ, frontZ, y) {
  const width = room.halfWidth * 2;
  const centerZ = (backZ + frontZ) / 2;
  const geometry = new THREE.PlaneGeometry(width, frontZ - backZ);
  const { position, uv } = geometry.attributes;
  const textureSpan = 1.30; // The texture contains two 65 cm tiles per side.
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (position.getX(i) + room.halfWidth) / textureSpan,
      (room.frontZ - centerZ + position.getY(i)) / textureSpan);
  }
  const tile = mesh(parent, geometry, material, 0, y, centerZ, false);
  tile.rotation.x = -Math.PI / 2;
}

function buildShell(parent, m, enclosingWalls, exterior, diffuser) {
  const centerZ = (room.frontZ + room.backZ) / 2;
  const length = room.frontZ - room.backZ;
  tiledFloor(parent, m.floor, room.backZ, room.frontZ, 0);
  box(parent, m.plyEdge, 0, -.073, centerZ, room.halfWidth * 2, .142, length, .015, false);
  tiledFloor(exterior, m.floor, room.frontZ, room.frontZ + 1.4, -.004);
  box(enclosingWalls, m.wall, 0, room.height + .05, centerZ, 4, .10, length, 0, false);
  const skirting = m.material("#868b80", .79);
  const jambWidth = .068;
  const jambCenter = room.entryHalfWidth + jambWidth / 2;
  const entranceWallWidth = room.halfWidth - jambCenter;
  for (const side of [-1, 1]) {
    box(enclosingWalls, m.wall, side * 2.0, 1.46, centerZ, .10, 2.92, length, 0, false);
    box(parent, skirting, side * 1.929, .052, centerZ, .03, .104, length, .003);
    box(parent, m.wall, side * 1.383, 1.46, -6.208, 1.133, 2.92, .08);
    box(enclosingWalls, m.wall, side * (jambCenter + entranceWallWidth / 2), 1.45, entranceWallZ,
      entranceWallWidth, 2.9, .10);
    box(enclosingWalls, m.wood, side * jambCenter, 1.070, room.frontZ + .002, jambWidth, 2.141, .113, .008);
  }
  const headerWidth = 2 * (room.entryHalfWidth + jambWidth);
  box(enclosingWalls, m.wall, 0, 2.543, room.frontZ + .036, headerWidth, .754, .10);
  box(enclosingWalls, m.wood, 0, 2.146, room.frontZ + .003, headerWidth, .078, .114, .006);

  const blackFrame = m.material("#2d3336", .53);
  const handleMetal = m.material("#434b50", .39, { metalness: .30 });
  const frameZ = -6.154;
  const frameDepth = .102;
  const frameFace = frameZ + frameDepth / 2;
  const clearGlass = new THREE.MeshPhysicalMaterial({
    color: "#d5e5e8", roughness: .14, metalness: .10, transparent: true, opacity: .11, depthWrite: false,
    side: THREE.DoubleSide
  });
  box(parent, m.wall, 0, 2.83, -6.205, 1.75, .18, .09);
  for (const x of [-.843, .843]) box(parent, blackFrame, x, 1.377, frameZ, .054, 2.745, frameDepth, .003);
  for (const y of [.044, 1.955, 2.727]) box(parent, blackFrame, 0, y, frameZ, 1.73, .051, .101, .003);
  box(parent, blackFrame, 0, 2.341, frameZ, .054, .771, frameDepth, .003);
  const doorPane = new THREE.PlaneGeometry(.793, 1.864);
  for (const side of [-1, 1]) {
    mesh(parent, doorPane, clearGlass, side * .4215, 1, frameZ, false).receiveShadow = false;
    const x = side * .027;
    box(parent, blackFrame, x, 1, frameZ, .051, 1.913, frameDepth, .003);
    box(parent, handleMetal, x, 1, frameFace, .032, .156, .011, .003);
    tube(parent, handleMetal, [[x, .938, frameFace], [x, .958, frameFace + .044],
      [x, 1.042, frameFace + .044], [x, 1.062, frameFace]], .010, 14);
  }
  mesh(parent, new THREE.PlaneGeometry(1.628, .728), clearGlass, 0, 2.341, frameZ, false).receiveShadow = false;
  outside(exterior, m);

  for (const z of [-1.58, -4.3]) {
    box(enclosingWalls, m.enamel, 0, 2.865, z, .227, .093, .985, .013, false);
    box(enclosingWalls, diffuser, 0, 2.812, z, .186, .027, .917, .011, false);
  }
}

function buildDoor(parent, m) {
  const model = group(parent, door.x, 0, door.z, door.openAngle);
  box(model, m.wood, -door.width / 2, door.height / 2 + door.bottom, 0, door.width, door.height, door.thickness, .006);
  const handleX = -door.width + .105;
  for (const face of [-1, 1]) {
    const plateZ = face * (door.thickness / 2 + .004);
    box(model, m.steel, handleX, 1.025, plateZ, .046, .129, .009, .004);
    tube(model, m.steel, [[handleX, 1.051, plateZ], [handleX, 1.051, face * .056],
      [handleX + .043, 1.049, face * .067], [handleX + .103, 1.048, face * .062]], .011, 16);
    box(model, m.black, handleX, .998, face * (Math.abs(plateZ) + .005), .010, .016, .002, .002);
  }
  for (const y of [.285, 1.804]) box(model, m.steel, -.014, y, -.014, .031, .089, .032, .004);
  return model;
}

function addRoomLighting(scene, renderer) {
  const environment = new RoomEnvironment();
  const generator = new THREE.PMREMGenerator(renderer);
  const environmentMap = generator.fromScene(environment, .06);
  scene.environment = environmentMap.texture;
  scene.environmentIntensity = .12;
  environment.dispose();
  generator.dispose();

  scene.add(new THREE.HemisphereLight("#dce7f0", "#927a68", .22));
  const sun = new THREE.DirectionalLight("#c2dcff", 1.16);
  sun.position.set(1.61, 2.90, -8.10);
  sun.target.position.set(-.94, .15, -3.66);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  Object.assign(sun.shadow.camera, { left: -3.25, right: 3.25, bottom: -3.1, top: 3.1, near: .18, far: 11.5 });
  sun.shadow.normalBias = .010;
  sun.shadow.bias = -.0002;
  sun.shadow.radius = 2.6;
  scene.add(sun, sun.target);
  const ceilingBounce = new THREE.AmbientLight("#ffffff", 0);
  scene.add(ceilingBounce);
  const ceilingLights = [[-1.52, 32], [-4.22, 26]].map(([z, intensity]) => {
    const overhead = new THREE.SpotLight("#ffffff", intensity, 5.8, 1.22, .62, 2);
    overhead.position.set(0, 2.767, z);
    overhead.target.position.set(.062, 0, z - .09);
    overhead.castShadow = true;
    overhead.shadow.mapSize.set(768, 768);
    overhead.shadow.normalBias = .010;
    overhead.shadow.bias = -.0003;
    overhead.shadow.radius = 2.1;
    scene.add(overhead, overhead.target);
    return { overhead, intensity };
  });
  return on => {
    for (const { overhead, intensity } of ceilingLights) overhead.intensity = on ? intensity : 0;
    ceilingBounce.intensity = on ? .38 : 0;
  };
}

class ContactShadows extends GTAOPass {
  setSize(width, height) {
    // Nearby contact shadows can be sampled below display resolution.
    super.setSize(Math.max(1, Math.ceil(width * .44)), Math.max(1, Math.ceil(height * .44)));
  }
}

function roomEffects(renderer, scene, camera) {
  if (!renderer.extensions.has("EXT_color_buffer_float")) return null;
  const composer = new EffectComposer(renderer);
  const contact = new ContactShadows(scene, camera, 1, 1);
  contact.blendIntensity = .75;
  contact.updateGtaoMaterial({ radius: .28, thickness: .22, distanceFallOff: .65, samples: 8 });
  contact.updatePdMaterial({ radius: 4, samples: 8 });
  contact.setSceneClipBox(new THREE.Box3(
    new THREE.Vector3(-room.halfWidth, -.02, room.backZ),
    new THREE.Vector3(room.halfWidth, room.height, room.frontZ + .08)
  ));
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(contact);
  composer.addPass(new OutputPass());
  composer.addPass(new FXAAPass());
  return composer;
}

const overviewTarget = new THREE.Vector3(0, 1.30, (room.frontZ + room.backZ) / 2);
const overviewHalfLength = (room.frontZ - room.backZ) / 2;
const overviewCorners = [-room.halfWidth, room.halfWidth].flatMap(x =>
  [-.15, room.height].flatMap(y =>
    [-overviewHalfLength, overviewHalfLength].map(z => new THREE.Vector3(x, y - overviewTarget.y, z))));

function setView(camera, eye, state) {
  if (state.overview) {
    camera.fov = 39;
    camera.far = 55;
    const sin = Math.sin(state.overviewYaw), cos = Math.cos(state.overviewYaw);
    const horizontal = Math.cos(state.overviewPitch);
    const toCamera = new THREE.Vector3(sin * horizontal, Math.sin(state.overviewPitch), cos * horizontal);
    const right = new THREE.Vector3(cos, 0, -sin);
    const up = new THREE.Vector3().crossVectors(toCamera, right);
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    let distance = 0;
    for (const corner of overviewCorners) {
      const fitX = Math.abs(corner.dot(right)) / (tan * camera.aspect * .90);
      const fitY = Math.abs(corner.dot(up)) / (tan * .78);
      distance = Math.max(distance, corner.dot(toCamera) + Math.max(fitX, fitY));
    }
    camera.position.copy(overviewTarget).addScaledVector(toCamera, distance);
    camera.lookAt(overviewTarget);
  } else {
    camera.fov = fieldOfView * 180 / Math.PI;
    camera.far = 30;
    camera.position.set(eye.x, eye.y, eye.z);
    camera.rotation.set(eye.pitch, eye.yaw, 0, "YXZ");
  }
  camera.updateProjectionMatrix();
}

export function context(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor("#bcc6c8");
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .90;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const distanceFog = new THREE.Fog("#b8c5d1", 8.7, 17);
  scene.fog = distanceFog;
  const camera = new THREE.PerspectiveCamera(fieldOfView * 180 / Math.PI, 1, .035, 30);
  const materials = makeMaterials();
  const palette = ["#657575", "#859155", "#b0a29e", "#696f8a", "#d5bf8d", "#83433f", "#32363a"].map(color => materials.material(color));
  const solids = new THREE.Group();
  const walls = new THREE.Group(), exterior = new THREE.Group();
  const ceilingDiffuser = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false });
  buildShell(solids, materials, walls, exterior, ceilingDiffuser);
  const wallModel = group(scene);
  const exteriorModel = group(scene);
  mergeStatic(walls, wallModel);
  mergeStatic(exterior, exteriorModel);
  const storage = createStorage(scene, materials);
  const beds = [];
  for (const side of [1, -1]) {
    const index = side === 1 ? 0 : 2;
    entryCabinet(solids, storage, materials, side);
    const front = buildStation(solids, storage, materials, palette, side, frontBed, index);
    beds.push(buildUpperBed(front, scene, materials, index, 1));
    buildStairs(solids, storage, materials, stairs.find(stair => stair.side === -side));
    const rear = buildStation(solids, storage, materials, palette, side, rearBed, index + 1);
    beds.push(buildUpperBed(rear, scene, materials, index + 1, -1));
  }
  mergeStatic(solids, scene);
  const entrance = buildDoor(scene, materials);
  const chairTemplate = new THREE.Group();
  mergeStatic(buildChair(new THREE.Group(), materials), chairTemplate);
  const chairModels = chairs.map(chair => {
    const model = chairTemplate.clone();
    model.rotation.y = chair.yaw;
    model.position.set(chair.pushed, 0, chair.z);
    scene.add(model);
    return model;
  });
  const desk = buildDeskInteraction(group(scene, -stationX, 0, frontBed, Math.PI / 2), materials);
  const setCeiling = addRoomLighting(scene, renderer);
  const setSwitch = buildLightSwitch(wallModel, materials, ceilingSwitch);
  const setComputerDeskLight = buildComputerDeskLight(scene, materials);
  const setDeskLamp = buildDeskLamp(scene, materials);
  const effects = roomEffects(renderer, scene, camera);
  renderer.shadowMap.needsUpdate = true;

  let width = 0, height = 0, density = 0, previousFrame = null;
  let previousShadowPose = null, previousOverview = null;
  canvas.addEventListener("webglcontextrestored", () => {
    previousFrame = null;
    renderer.shadowMap.needsUpdate = true;
  });
  function render(eye, state) {
    const nextWidth = canvas.clientWidth, nextHeight = canvas.clientHeight;
    if (!nextWidth || !nextHeight) return;
    const nextDensity = Math.min(window.devicePixelRatio, 1.40);
    const resized = width !== nextWidth || height !== nextHeight || density !== nextDensity;
    const shadowPose = [...state.chairPositions, state.book, state.doorAngle, state.ceilingOn, state.computerLampOn,
      ...state.storageOpen, ...state.bedCurtains.flatMap(curtains => [curtains.aisle, curtains.stair]), ...state.bedding];
    const frame = [eye.x, eye.y, eye.z, eye.pitch, eye.yaw, state.screenOn, state.ink, state.deskLampOn,
      state.overview, state.overviewYaw, state.overviewPitch, ...shadowPose];
    if (!resized && previousFrame?.every((value, index) => value === frame[index])) return;
    previousFrame = frame;
    if (resized) {
      width = nextWidth;
      height = nextHeight;
      density = nextDensity;
      renderer.setPixelRatio(density);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      effects?.setPixelRatio(density);
      effects?.setSize(width, height);
    }
    if (previousOverview !== state.overview) {
      previousOverview = state.overview;
      wallModel.visible = exteriorModel.visible = !state.overview;
      scene.fog = state.overview ? null : distanceFog;
      renderer.setClearColor(state.overview ? "#263340" : "#bcc6c8");
      renderer.shadowMap.needsUpdate = true;
    }
    if (!previousShadowPose || shadowPose.some((value, index) => value !== previousShadowPose[index])) {
      previousShadowPose = shadowPose;
      renderer.shadowMap.needsUpdate = true;
    }
    setView(camera, eye, state);
    chairModels.forEach((model, index) => { model.position.x = state.chairPositions[index]; });
    entrance.rotation.y = state.doorAngle;
    storage.setOpen(state.storageOpen);
    for (const bed of beds) {
      const curtains = state.bedCurtains[bed.index];
      bed.curtains.aisle.setOpen(curtains.aisle);
      bed.curtains.stair.setOpen(curtains.stair);
      bed.setTidy(state.bedding[bed.index]);
    }
    ceilingDiffuser.color.set(state.ceilingOn ? "#ffffff" : "#7b8587");
    setCeiling(state.ceilingOn);
    setSwitch(state.ceilingOn);
    setComputerDeskLight(state.computerLampOn);
    setDeskLamp(state.deskLampOn);
    desk.update(state);
    if (effects) effects.render();
    else renderer.render(scene, camera);
  }
  return { render, storagePanels: storage.panels, beds };
}

import * as THREE from "three";
import { box, cylinder, group, tube } from "./parts.js";
import { frontBed, stationX } from "./furniture.js";

export const deskLamp = { x: stationX + .220, y: .987, z: frontBed + .344, hx: .27, hy: .21, hz: .18 };
const computerLightStrip = { x: -1.607, y: 1.303, z: frontBed - .141 };
export const computerLampSwitch = { x: computerLightStrip.x + .031, y: computerLightStrip.y - .009,
  z: computerLightStrip.z + .250, hx: .047, hy: .038, hz: .051 };

export function buildLightSwitch(parent, materials, position) {
  const unit = group(parent, position.x, position.y, position.z, position.yaw);
  box(unit, materials.enamel, 0, 0, 0, .022, .124, .100, .007);
  box(unit, materials.drawerGap, .013, 0, 0, .010, .081, .051, .004);
  const rocker = box(unit, materials.desk, .019, 0, 0, .018, .073, .044, .004);
  const indicator = new THREE.MeshBasicMaterial({ color: "#7eb69c" });
  box(unit, indicator, .025, -.044, 0, .003, .005, .015, .001, false);
  return on => {
    rocker.rotation.z = on ? .20 : -.20;
    indicator.color.set(on ? "#a4e0b5" : "#63716b");
  };
}

export function buildComputerDeskLight(parent, materials) {
  const { x, y, z } = computerLampSwitch;
  box(parent, materials.black, computerLightStrip.x, y, z, .053, .034, .064, .006, false);
  const rocker = box(parent, materials.enamel, x, y, z - .008, .012, .022, .029, .004, false);
  const indicator = new THREE.MeshBasicMaterial({ color: "#a4e0b5", toneMapped: false });
  box(parent, indicator, x - .003, y, z + .018, .005, .007, .008, .002, false);
  const diffuser = materials.material("#e9e5d8", .65, { emissive: "#fff1cf" });
  box(parent, diffuser, computerLightStrip.x, computerLightStrip.y, computerLightStrip.z, .041, .015, .438, .006, false);
  const beam = new THREE.SpotLight("#ffe2ad", 0, 1.45, 1.11, .74, 2);
  beam.position.set(-1.60, 1.281, -1.846);
  beam.target.position.set(-1.24, .77, -1.81);
  beam.castShadow = true;
  beam.shadow.mapSize.set(512, 512);
  beam.shadow.normalBias = .003;
  beam.shadow.bias = -.00009;
  beam.shadow.radius = 2.4;
  parent.add(beam, beam.target);
  return on => {
    beam.intensity = on ? 1.42 : 0;
    diffuser.emissiveIntensity = on ? .22 : 0;
    rocker.position.x = x + (on ? -.003 : .002);
    indicator.color.set(on ? "#a4e0b5" : "#596060");
  };
}

export function buildDeskLamp(parent, materials) {
  const lamp = group(parent, deskLamp.x, .792, deskLamp.z);
  const body = materials.material("#496a78", .46, { metalness: .32 });
  cylinder(lamp, body, 0, .012, 0, .087, .025, 1.07);
  cylinder(lamp, materials.black, .013, .027, .024, .014, .008);
  tube(lamp, materials.steel, [[.036, .024, .022], [.036, .153, .023], [.005, .284, .023],
    [-.055, .348, .018], [-.110, .348, .010]], .012, 20);
  tube(lamp, materials.black, [[.076, .014, .008], [.115, .008, -.039], [.161, .006, -.097]],
    .0038, 10);

  const head = group(lamp, -.106, .317, .010);
  head.rotation.set(.50, 0, -.23);
  cylinder(head, body, 0, 0, 0, .053, .090, 1.78);
  const diffuser = new THREE.MeshBasicMaterial({ color: "#b8b7af", toneMapped: false });
  cylinder(head, diffuser, 0, -.043, 0, .084, .006);

  // A broad beam with soft falloff keeps the far end of the desktop lit.
  const beam = new THREE.SpotLight("#ffffff", 0, 2.35, 1.30, .60, .30);
  beam.position.set(-.130, .266, -.004);
  beam.target.position.set(-.190, -.006, -.474);
  lamp.add(beam, beam.target);
  return on => {
    beam.intensity = on ? 2.7 : 0;
    diffuser.color.set(on ? "#ffffff" : "#b8b7af");
  };
}

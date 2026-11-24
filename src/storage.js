import * as THREE from "three";
import { box, group, tube } from "./parts.js";

export function cabinetShell(parent, m, x, width, back, front, levels) {
  const thickness = .021;
  const bottom = levels[0], top = levels.at(-1);
  const middle = (bottom + top) / 2;
  const depth = front - back;
  box(parent, m.wood, x, middle, back + thickness / 2, width, top - bottom, thickness, .003);
  for (const edge of [-1, 1]) {
    box(parent, m.wood, x + edge * (width - thickness) / 2, middle, (back + front) / 2,
      thickness, top - bottom, depth, .004);
  }
  for (const y of levels) {
    box(parent, m.wood, x, y, (back + front) / 2, width - thickness * 2, thickness, depth, .003);
  }
}

export function createStorage(parent, m) {
  const panels = [];
  const models = [];

  function register(anchor, spec, pivot, yawOffset) {
    const position = anchor.localToWorld(new THREE.Vector3(pivot, 0, spec.z));
    const forward = anchor.getWorldDirection(new THREE.Vector3());
    const yaw = Math.atan2(forward.x, forward.z) + yawOffset;
    const panel = {
      index: panels.length, x: position.x, z: position.z, yaw, label: spec.label,
      width: spec.width, height: spec.height, bottom: spec.y - spec.height / 2, thickness: spec.thickness ?? .026,
      forwardX: forward.x, forwardZ: forward.z
    };
    const model = group(parent, panel.x, 0, panel.z, yaw);
    panels.push(panel);
    models.push(model);
    return { panel, model };
  }

  function door(anchor, spec) {
    const { x, y, width, height, hinge = 1, front = m.blue } = spec;
    const { panel, model } = register(anchor, spec, x + hinge * width / 2, hinge > 0 ? 0 : Math.PI);
    panel.openAngle = hinge * 1.44;
    box(model, front, -width / 2, y, 0, width, height, panel.thickness, .008);
    const handleX = -width + Math.min(.105, width * .26);
    const handleY = Math.min(.080, height * .17);
    const face = hinge * panel.thickness / 2;
    tube(model, m.steel, [[handleX, y + handleY, face], [handleX, y + handleY * .55, face + hinge * .029],
      [handleX, y - handleY * .55, face + hinge * .029], [handleX, y - handleY, face]], .008, 14);
  }

  function drawer(anchor, spec) {
    const { x, y, width, height, depth, travel, front = m.blueShade } = spec;
    const { panel, model } = register(anchor, spec, x, 0);
    panel.travel = travel;
    panel.depth = depth;
    box(model, front, 0, y, 0, width, height, panel.thickness, .008);
    const handle = Math.min(.063, width * .19);
    const face = panel.thickness / 2;
    tube(model, m.steel, [[-handle, y, face], [-handle * .68, y, face + .023],
      [handle * .68, y, face + .023], [handle, y, face]], .006, 12);
    const trayWidth = width - .032;
    const trayHeight = height - .052;
    const center = -(depth + face) / 2;
    box(model, m.wood, 0, y - trayHeight / 2, center, trayWidth, .018, depth - face, .003);
    for (const side of [-1, 1]) {
      box(model, m.wood, side * (trayWidth - .015) / 2, y, center, .015, trayHeight, depth - face, .003);
    }
    box(model, m.wood, 0, y, -depth + .008, trayWidth, trayHeight, .016, .003);
  }

  function flap(anchor, spec) {
    const { x, width, height } = spec;
    const { panel, model } = register(anchor, spec, x, 0);
    panel.dropAngle = 1.27;
    model.position.y = panel.bottom;
    model.rotation.order = "YXZ";
    box(model, m.blueShade, 0, height / 2, 0, width, height, panel.thickness, .008);
    const y = height - .069;
    tube(model, m.steel, [[-.063, y, .014], [-.043, y, .037],
      [.043, y, .037], [.063, y, .014]], .006, 12);
  }

  function setOpen(opens) {
    panels.forEach((panel, index) => {
      const model = models[index], progress = opens[index];
      if (panel.travel) {
        const distance = panel.travel * progress;
        model.position.x = panel.x + panel.forwardX * distance;
        model.position.z = panel.z + panel.forwardZ * distance;
      } else if (panel.dropAngle) {
        model.rotation.x = panel.dropAngle * progress;
      } else {
        model.rotation.y = panel.yaw + panel.openAngle * progress;
      }
    });
  }

  return { panels, door, drawer, flap, setOpen };
}

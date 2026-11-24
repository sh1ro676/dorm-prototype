import * as THREE from "three";
import { box, cylinder, group, mesh, tube } from "./parts.js";
import { canvasTexture, randomFrom } from "./materials.js";
import { cabinetShell } from "./storage.js";

export const frontBed = -1.72;
export const rearBed = -4.58;
export const stationX = 1.43;
export const entryCabinetSize = { x: 1.613, z: -.051, width: 1.136, depth: .588 };
const stairsZ = (frontBed + rearBed) / 2;
const treadWidth = .635;
const treadDepth = .267;
const treadThickness = .045;
export const stairTreads = Array.from({ length: 4 }, (_, index) => {
  const offset = .494 - index * .247;
  const height = .413 * (index + 1);
  return { offset, height, edge: stationX - offset - treadDepth / 2, top: height + treadThickness / 2 };
});
const stairFoot = stairTreads[0].edge;
const stairBack = stairTreads.at(-1).edge + treadDepth;
export const stairs = [-1, 1].map(side => ({
  side, x: side * (stairFoot + stairBack) / 2, z: stairsZ, hx: (stairBack - stairFoot) / 2, hz: treadWidth / 2
}));
export const deskPosition = { screen: [.33, 1.073, -.218], book: [-.17, .795, .27] };

export function buildChair(parent, m) {
  const chair = group(parent);
  tube(chair, m.steel, [
    [-.242, .610, -.145], [-.243, .395, -.204], [-.243, .113, -.253], [-.241, .041, -.201],
    [-.235, .035, .190], [-.203, .035, .240], [0, .035, .243], [.203, .035, .240],
    [.235, .035, .190], [.241, .041, -.201], [.243, .113, -.253], [.243, .395, -.204], [.242, .610, -.145]
  ], .017, 58);
  box(chair, m.black, 0, .454, -.020, .432, .077, .411, .023);
  box(chair, m.foam, 0, .481, -.040, .416, .081, .410, .031);
  const back = group(chair, 0, .753, .197);
  back.rotation.x = .142;
  box(back, m.black, 0, 0, 0, .461, .427, .061, .023);
  box(back, m.seatBlue, 0, .014, .023, .406, .383, .039, .018);
  box(back, m.seatBlue, 0, .012, -.026, .416, .386, .036, .018);
  tube(chair, m.black, [[-.232, .71, .195], [-.208, .609, .250], [0, .578, .280], [.208, .609, .250], [.232, .71, .195]], .018);
  box(chair, m.black, 0, .54, .247, .391, .048, .046, .017);
  for (const x of [-.237, .237]) {
    box(chair, m.black, x, .643, -.027, .052, .055, .365, .020);
    box(chair, m.black, x, .559, .129, .031, .182, .042, .012);
    box(chair, m.black, x, .024, -.070, .042, .028, .088, .008);
  }
  return chair;
}

export function entryCabinet(parent, storage, m, side) {
  const { x, z, width } = entryCabinetSize;
  const cabinet = group(parent, -side * x, 0, z, side * Math.PI / 2);
  cabinetShell(cabinet, m, 0, width, -.318, .273, [.035, .830, 2.142]);
  box(cabinet, m.wood, 0, 1.089, -.024, .026, 2.107, .591, .003);
  const container = m.material("#7d9898", .73);
  const lid = m.material("#b4c6c1", .66);
  for (const hinge of [-1, 1]) {
    const panelX = hinge * width / 4;
    const label = side > 0 ? "左侧蓝柜" : "右侧蓝柜";
    storage.door(cabinet, { x: panelX, y: 1.49, z: .287, width: .518, height: 1.286, hinge, label });
    storage.door(cabinet, { x: panelX, y: .443, z: .287, width: .518, height: .748, hinge, label });
    box(cabinet, m.wood, panelX, 1.370, -.034, .526, .023, .563, .006);
    box(cabinet, container, panelX, .978, -.046, .378, .246, .329, .015);
    box(cabinet, lid, panelX, 1.113, -.046, .393, .029, .343, .008);
    for (const [i, color] of ["#7e889f", "#c9b39c", "#9ca8aa"].entries()) {
      box(cabinet, m.material(color, .94), panelX + .025, 1.411 + i * .055, .024 - i * .020,
        .348 - i * .021, .056, .266 - i * .012, .024);
    }
  }
}

function guardrail(station, m) {
  for (const x of [-1.056, 1.056]) {
    for (const z of [-.438, .47]) box(station, m.enamel, x, 1.225, z, .062, 2.450, .061, .010);
  }
  box(station, m.enamel, 0, 1.749, 0, 2.176, .122, 1.01, .024);
  box(station, m.enamel, 0, 1.706, .514, 2.195, .045, .047, .014);
  box(station, m.foam, 0, 1.787, -.012, 2.07, .039, .931, .012);
  tube(station, m.enamel, [
    [-1.028, 1.82, .497], [-1.016, 2.237, .497], [-.946, 2.340, .497], [-.724, 2.366, .497],
    [.718, 2.366, .497], [.903, 2.355, .497], [.977, 2.269, .497], [.988, 1.850, .497]
  ], .023, 38);
  for (const x of [-.60, .65]) box(station, m.enamel, x, 2.171, .497, .037, .373, .033, .01);
  box(station, m.blue, -.164, 1.991, .502, 1.58, .228, .037, .012);
  box(station, m.enamel, 0, 2.775, .347, 2.18, .025, .026, .010);
}

function wardrobeCabinet(station, storage, m, x) {
  cabinetShell(station, m, x, .508, -.487, .432, [.067, .255, .446, 1.365, 1.686]);
  storage.door(station, { x, y: 1.065, z: .447, width: .476, height: 1.216, hinge: Math.sign(x), label: "衣柜" });
  for (const y of [.161, .351]) {
    storage.drawer(station, { x, y, z: .447, width: .472, height: .166, depth: .43, travel: .29,
      label: "衣柜抽屉", front: m.blue });
  }
}

function bookshelf(station, m, x, palette, detailed) {
  box(station, m.wood, x, 1.152, -.472, 1.58, 1.001, .042, .004);
  for (const y of [1.330, 1.633]) box(station, m.wood, x, y, -.291, 1.565, .040, .367, .004);
  for (const dx of [-.76, -.479, .389, .765]) box(station, m.wood, x + dx, 1.485, -.287, .033, .29, .36, .003);
  const random = randomFrom(detailed ? 11 : Math.round(Math.abs(station.position.z * 311 + station.position.x * 59)));
  const count = detailed ? 13 : 5 + Math.floor(random() * 6);
  const left = detailed ? -.405 : -.402 + random() * .20;
  for (let i = 0; i < count; i++) {
    const height = .181 + random() * .082, thickness = .045 + random() * .014;
    const at = x + left + i * .057;
    const book = group(station, at, 1.352 + height / 2, -.222 - random() * .05);
    book.rotation.z = i === 10 ? -.092 : 0;
    box(book, palette[i % palette.length], 0, 0, 0, thickness, height, .208, .003);
    box(book, m.softPaper, 0, 0, -.104, thickness * .78, height * .93, .008);
    for (const dy of [-.028, -.014, .056]) box(book, m.softPaper, 0, dy, .106, thickness * .57, .004, .002, 0);
  }
  box(station, palette[detailed ? 5 : Math.floor(random() * palette.length)], x + .534, 1.431, -.242, .252, .158, .236, .017);
  box(station, m.steel, x + .530, 1.457, -.119, .071, .014, .019, .003);
}

function deskItems(station, storage, m, palette) {
  const counter = .805;
  cabinetShell(station, m, counter, .303, -.072, .512, [.038, .332, .647]);
  storage.door(station, { x: counter, y: .329, z: .526, width: .271, height: .559, label: "桌边柜" });
  box(station, m.desk, counter, .665, .219, .327, .039, .624, .008);
  const thermos = palette[5];
  cylinder(station, thermos, .764, .762, .395, .042, .155);
  cylinder(station, m.steel, .764, .846, .395, .044, .023);
  cylinder(station, m.softPaper, .868, .753, .320, .035, .135, .78);
  cylinder(station, palette[0], .891, .724, .429, .038, .078);
  cylinder(station, palette[1], .891, .769, .429, .040, .020);
  cylinder(station, m.softPaper, .783, .746, .204, .024, .125, .90);
  box(station, m.enamel, .783, .823, .204, .045, .014, .016, .005);

  box(station, m.black, .321, .802, .091, .300, .023, .110, .010);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 13; col++) box(station, palette[6], .188 + col * .022, .816, .053 + row * .025, .017, .007, .016, .002);
  }
  box(station, m.black, .546, .807, .11, .068, .038, .104, .016).rotation.y = .18;
  const stripX = -.346;
  const powerStrip = group(station, stripX, .807, -.364);
  box(powerStrip, m.enamel, 0, 0, 0, .259, .046, .058, .009);
  for (let i = 0; i < 4; i++) box(powerStrip, m.black, -.084 + i * .054, .025, .005, .019, .003, .026, .003);
  tube(station, m.black, [[.33, .828, -.284], [.242, .793, -.345], [.012, .794, -.301],
    [-.175, .793, -.368], [stripX + .018, .821, -.362]], .004, 31);
  tube(station, m.black, [[stripX - .116, .813, -.360], [stripX - .149, .828, -.423],
    [stripX - .025, .902, -.436], [stripX + .088, .913, -.451]], .004, 16);
}

function deskNotice(station, m) {
  const tag = m.material("#cbdce1", .92);
  box(station, tag, 1.037, 1.324, .509, .049, .176, .003, .001);
  for (const y of [1.274, 1.298, 1.327, 1.354]) {
    box(station, m.plyEdge, 1.037, y, .512, .033, .003, .002, .001);
  }
}

export function buildStation(parent, storage, m, palette, side, center, position) {
  const station = group(parent, -side * stationX, 0, center, side * Math.PI / 2);
  const wardrobe = center === frontBed ? -side * .79 : side * .79;
  const desk = -wardrobe * .28;
  guardrail(station, m);
  wardrobeCabinet(station, storage, m, wardrobe);
  bookshelf(station, m, desk, palette, position === 0);
  box(station, m.desk, desk, .753, .006, 1.548, .065, .970, .011);
  box(station, m.plyEdge, desk, .742, .479, 1.521, .019, .023, .005);
  box(station, m.wood, desk, .506, -.440, 1.538, .453, .053, .004);
  box(station, m.wood, wardrobe * .91, .193, -.116, .293, .044, .667, .004);
  box(station, m.foam, wardrobe * .91, .275, -.11, .259, .119, .453, .028);
  if (position === 0) {
    deskItems(station, storage, m, palette);
    deskNotice(station, m);
  } else {
    cabinetShell(station, m, -wardrobe, .284, -.041, .387, [.038, .316, .626]);
    storage.door(station, { x: -wardrobe, y: .319, z: .400, width: .248, height: .548,
      hinge: -Math.sign(wardrobe), front: m.blueShade, label: "桌边柜" });
    box(station, palette[position], desk + .236, .815, -.07, .306, .061, .218, .010).rotation.y = -.10;
    box(station, m.softPaper, desk + .225, .824, -.081, .288, .028, .208, .005).rotation.y = -.10;
  }
  return station;
}

export function buildStairs(parent, storage, m, stair) {
  const model = group(parent, stair.side * stationX, 0, stair.z, -stair.side * Math.PI / 2);
  const grip = m.material("#adb099", .91);
  for (const { offset: z, height } of stairTreads) {
    const base = height - .388;
    box(model, m.wood, 0, base / 2, z, .623, base, .250, .004);
    cabinetShell(model, m, 0, .623, z - .125, z + .124, [base, height - .029]);
    storage.flap(model, { x: 0, y: height - .210, z: z + .136, width: .563, height: .340, label: "台阶柜" });
    box(model, m.desk, 0, height, z, treadWidth, treadThickness, treadDepth, .016);
    for (const x of [-.138, .138]) {
      for (const dz of [-.06, .005, .069]) box(model, grip, x, height + .021, z + dz, .153, .003, .014, .001);
    }
  }
}

export function buildDeskInteraction(station, m) {
  const screenArt = canvasTexture(512, 288, (ctx, w, h) => {
    const background = ctx.createLinearGradient(0, h, w, 0);
    background.addColorStop(0, "#182c3f");
    background.addColorStop(1, "#426576");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#8cb8b884";
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.ellipse(333, 139, 180 + i * 8, 44 + i * 7, -.68, 0, 2 * Math.PI);
      ctx.stroke();
    }
    ctx.fillStyle = "#18242f";
    ctx.fillRect(0, h - 21, w, 21);
    ctx.fillStyle = "#e8dfc6";
    ctx.fillRect(22, 22, 30, 34);
    ctx.fillStyle = "#eff3f2";
    ctx.font = "13px Microsoft YaHei";
    ctx.fillText("课程笔记", 10, 74);
  });
  const screen = group(station, ...deskPosition.screen);
  screen.rotation.x = -.075;
  box(screen, m.black, 0, 0, -.011, .556, .331, .033, .011);
  const display = new THREE.PlaneGeometry(.525, .300);
  const off = m.material("#141d22", .36);
  const on = new THREE.MeshBasicMaterial({ map: screenArt, toneMapped: false });
  const face = mesh(screen, display, off, 0, .005, .007, false);
  const screenGlow = new THREE.PointLight("#94d8ff", 0, .68, 2);
  screenGlow.position.set(.33, 1.047, -.176);
  station.add(screenGlow);
  box(screen, m.material("#9caeb1", .4), .235, -.155, .008, .008, .004, .003, .001);
  box(station, m.black, .33, .893, -.265, .036, .205, .036, .009);
  for (const direction of [-1, 1]) {
    tube(station, m.black, [[.33, .792, -.288], [.33 + .063 * direction, .791, -.199], [.33 + .123 * direction, .793, -.114]], .015, 10);
  }

  const notebook = group(station, ...deskPosition.book);
  notebook.rotation.y = .067;
  const cover = m.material("#506e80", .77);
  box(notebook, cover, .057, -.002, 0, .124, .008, .214, .004);
  box(notebook, m.softPaper, .057, .003, 0, .116, .010, .205, .004);
  const hingedCover = group(notebook, 0, .013, 0);
  box(hingedCover, cover, .061, .0045, 0, .126, .006, .214, .003);
  box(hingedCover, m.softPaper, .061, .001, 0, .117, .003, .204, .002);
  const pageMaterial = m.material("#ffffff", .92);
  let pageContext;
  pageMaterial.map = canvasTexture(256, 400, (ctx) => { pageContext = ctx; });
  const page = mesh(notebook, new THREE.PlaneGeometry(.111, .195), pageMaterial, .058, .0095, 0, false);
  page.rotation.x = -Math.PI / 2;
  const written = "元宇宙大作业\n宿舍场景与交互";
  let printed = -1;
  function paintPage(count) {
    if (count === printed) return;
    printed = count;
    pageContext.fillStyle = "#f4efe0";
    pageContext.fillRect(0, 0, 256, 400);
    pageContext.strokeStyle = "#8c9cac7a";
    pageContext.lineWidth = 1.5;
    for (let y = 58; y < 394; y += 40) {
      pageContext.beginPath();
      pageContext.moveTo(15, y);
      pageContext.lineTo(244, y);
      pageContext.stroke();
    }
    pageContext.fillStyle = "#253647";
    pageContext.font = "600 27px Microsoft YaHei";
    const lines = written.slice(0, count).split("\n");
    lines.forEach((line, i) => pageContext.fillText(line, 17, 50 + i * 42));
    pageMaterial.map.needsUpdate = true;
  }
  paintPage(0);
  const pen = cylinder(notebook, m.black, .154, .010, .039, .0045, .144);
  pen.rotation.set(Math.PI / 2, 0, .13);
  return {
    update(state) {
      if (face.material !== (state.screenOn ? on : off)) face.material = state.screenOn ? on : off;
      screenGlow.intensity = state.screenOn ? .065 : 0;
      hingedCover.rotation.z = state.book * Math.PI * .994;
      paintPage(Math.floor(state.ink * written.length));
    }
  };
}

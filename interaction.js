"use strict";

(() => {
  const canvas = document.getElementById("view");
  const aim = document.getElementById("aim");
  const aimAction = document.getElementById("aim-action");
  const feedback = document.getElementById("feedback");
  const helpToggle = document.getElementById("help-toggle");
  const keyGuide = document.getElementById("key-guide");
  const computer = document.getElementById("computer");
  const closeComputer = document.getElementById("close-computer");
  const openNotes = document.getElementById("open-notes");
  const notes = document.getElementById("notes");
  const overviewButton = document.getElementById("overview-toggle");
  const desktop = document.getElementById("desktop");
  const desktopState = document.getElementById("desktop-state");
  const desktopLock = document.getElementById("desktop-lock");
  const desktopExit = document.getElementById("desktop-exit");
  const bootDesktop = document.getElementById("boot-desktop");
  const desktopNote = document.getElementById("desktop-note");
  const osFile = document.getElementById("os-file");
  const osDrop = document.getElementById("os-drop");
  const { room, chairs, door, colliders, screen, book, ceilingSwitch, computerLampSwitch,
    deskLamp, stairs, stairTreads } = DormScene;
  const computerChair = chairs[0];
  const rightDeskChair = chairs[2];
  const chairReach = 1.17;
  const standingY = 1.59;
  const eye = { x: .10, y: standingY, z: room.frontZ + .95, yaw: 0, pitch: -.047 };
  const state = {
    chairPositions: chairs.map(chair => chair.pushed), doorAngle: door.openAngle, seated: null, screenOn: false, book: 0, ink: 0,
    ceilingOn: true, deskLampOn: false, computerLampOn: true,
    onBed: null, overview: false, overviewYaw: -.72, overviewPitch: .65, osTick: 0
  };
  const keyDown = new Set();
  const movementKeys = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
  const playerRadius = .155;
  const stairEdgeClearance = .055;
  const travelSpeed = 1.65;
  const stairSpeed = 1.02;
  let transition = null;
  let writingSince = null;
  let bookTime = null;
  let drag = null;
  let statusUntil = 0;
  let render, storagePanels, beds, desk;
  try {
    ({ render, storagePanels, beds, desk } = DormScene.context(canvas));
  } catch (error) {
    document.getElementById("error").hidden = false;
    aim.hidden = true;
    console.error(error);
    return;
  }
  state.storageOpen = storagePanels.map(() => 0);
  state.bedCurtains = beds.map(() => ({ aisle: 0, stair: 0 }));
  state.bedding = beds.map(() => 0);

  function clamp(value, low, high) {
    return Math.min(high, Math.max(low, value));
  }

  function smooth(t) {
    const progress = clamp(t, 0, 1);
    return progress * progress * (3 - 2 * progress);
  }

  function toggleOverview() {
    if (transition || !computer.hidden) return;
    state.overview = !state.overview;
    document.body.classList.toggle("overview-mode", state.overview);
    overviewButton.textContent = state.overview ? "回到第一人称" : "俯视全景";
    overviewButton.setAttribute("aria-pressed", String(state.overview));
    keyDown.clear();
    statusUntil = 0;
    canvas.classList.remove("target");
  }

  function setHelp(open) {
    keyGuide.hidden = !open;
    helpToggle.setAttribute("aria-expanded", String(open));
  }

  function chairCollider(chair, x = state.chairPositions[chair.index]) {
    return { x, z: chair.z, hx: chair.half, hz: chair.half };
  }

  function overlaps(x, z, obstacle, clearance = playerRadius) {
    const dx = Math.max(Math.abs(x - obstacle.x) - obstacle.hx, 0);
    const dz = Math.max(Math.abs(z - obstacle.z) - obstacle.hz, 0);
    return Math.hypot(dx, dz) < clearance;
  }

  function intoDoorSpace(x, z, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return { x: x * c - z * s, z: x * s + z * c };
  }

  function doorClearance(x, z, panel, angle) {
    const local = intoDoorSpace(x - panel.x, z - panel.z, panel.yaw + angle);
    const dx = local.x - clamp(local.x, -panel.width, 0);
    const dz = Math.max(Math.abs(local.z) - panel.thickness / 2, 0);
    return Math.hypot(dx, dz);
  }

  function storageExtension(panel, progress) {
    return panel.travel ? panel.travel * progress : panel.height * Math.sin(panel.dropAngle * progress);
  }

  function storageClearance(x, z, panel, progress) {
    if (panel.openAngle) return doorClearance(x, z, panel, panel.openAngle * progress);
    const local = intoDoorSpace(x - panel.x, z - panel.z, panel.yaw);
    const extension = storageExtension(panel, progress);
    const dx = Math.max(Math.abs(local.x) - panel.width / 2, 0);
    const dz = Math.max(-local.z, local.z - extension, 0);
    return Math.hypot(dx, dz);
  }

  function stairLane(x, z) {
    return stairs.find(stair => Math.abs(x - stair.x) <= stair.hx + playerRadius &&
      Math.abs(z - stair.z) <= stair.hz - stairEdgeClearance);
  }

  function canWalk(x, z) {
    if (doorClearance(x, z, door, state.doorAngle) < playerRadius) return false;
    if (storagePanels.some(panel => {
      const progress = state.storageOpen[panel.index];
      return progress > 0 && storageClearance(x, z, panel, progress) < playerRadius;
    })) return false;
    if (z > room.frontZ - .16) return z < room.frontZ + 1.17 && Math.abs(x) < room.entryHalfWidth - playerRadius;
    const lane = stairLane(x, z);
    return Math.abs(x) < room.halfWidth - playerRadius &&
      z > room.backZ + playerRadius &&
      (lane || !stairs.some(stair => overlaps(x, z, stair))) &&
      !chairs.some(chair => overlaps(x, z, chairCollider(chair))) &&
      !colliders.some(obstacle => overlaps(x, z, obstacle, lane && obstacle.station ? stairEdgeClearance : playerRadius));
  }

  function updateWalkingHeight() {
    const stair = stairLane(eye.x, eye.z);
    const top = stairTreads.at(-1).top;
    let height = 0;
    if (stair) {
      const distance = eye.x * stair.side;
      for (const [index, tread] of stairTreads.entries()) {
        const rise = tread.top - (stairTreads[index - 1]?.top ?? 0);
        height += rise * smooth((distance - tread.edge) / .136);
      }
    }
    // Gradually lower the eye offset to leave space under the ceiling on the highest treads.
    const crouch = Math.max(0, standingY + top - (room.height - .25)) * smooth(height / top);
    eye.y = standingY + height - crouch;
  }

  function onStairs() {
    return eye.y > standingY;
  }

  function upperStair() {
    const stair = !state.onBed && stairLane(eye.x, eye.z);
    return stair && eye.x * stair.side >= stairTreads.at(-2).edge ? stair : null;
  }

  function chairDistance(chair) {
    return Math.hypot(eye.x - state.chairPositions[chair.index], eye.z - chair.z);
  }

  function chairIsPulled(chair) {
    return state.chairPositions[chair.index] === chair.pulled;
  }

  function nearbyChair() {
    const aimed = targetAt()?.chair;
    if (aimed) return aimed;
    let closest = null;
    let distance = chairReach;
    for (const chair of chairs) {
      const candidateDistance = chairDistance(chair);
      if (candidateDistance < distance) {
        closest = chair;
        distance = candidateDistance;
      }
    }
    return closest;
  }

  function nearDoor() {
    return doorClearance(eye.x, eye.z, door, state.doorAngle) < 1.28;
  }

  function doorAction() {
    return state.doorAngle === 0 ? "open-door" : "close-door";
  }

  function turnToward(yaw) {
    return eye.yaw + Math.atan2(Math.sin(yaw - eye.yaw), Math.cos(yaw - eye.yaw));
  }

  function message(value) {
    feedback.textContent = value;
    statusUntil = performance.now() + 2400;
  }

  function animate(target, values, duration, done) {
    const initial = Object.fromEntries(Object.keys(values).map(key => [key, target[key]]));
    transition = { target, initial, values, duration, done, start: performance.now() };
  }

  function canSwing(panel, start, end) {
    for (let step = 0; step <= 48; step++) {
      const angle = start + (end - start) * step / 48;
      if (doorClearance(eye.x, eye.z, panel, angle) < playerRadius - .001) {
        message("往门扇转动范围外挪一步");
        return false;
      }
    }
    return true;
  }

  function toggleDoor() {
    if (transition || state.seated || !nearDoor()) return;
    const start = state.doorAngle;
    const end = start === 0 ? door.openAngle : 0;
    if (canSwing(door, start, end)) animate(state, { doorAngle: end }, 520);
  }

  function toggleStorage(panel) {
    const start = state.storageOpen[panel.index];
    const end = start === 0 ? 1 : 0;
    if (panel.openAngle) {
      if (!canSwing(panel, start * panel.openAngle, end * panel.openAngle)) return;
    } else if (storageClearance(eye.x, eye.z, panel, 1) < playerRadius - .001) {
      message(panel.travel ? "往后挪一步，给抽屉留出空间" : "往后挪一步，给台阶柜留出空间");
      return;
    }
    animate(state.storageOpen, { [panel.index]: end }, panel.travel ? 340 : 390);
  }

  function slideChair(chair) {
    if (transition || state.seated || chairDistance(chair) >= chairReach) return;
    const current = state.chairPositions[chair.index];
    const next = chairIsPulled(chair) ? chair.pushed : chair.pulled;
    const track = chairCollider(chair, (current + next) / 2);
    track.hx += Math.abs(current - next) / 2;
    if (overlaps(eye.x, eye.z, track)) {
      message("往旁边挪一步，给椅子留出滑动空间");
      return;
    }
    animate(state.chairPositions, { [chair.index]: next }, 400);
  }

  function sit(chair) {
    if (transition || state.seated || chairDistance(chair) >= chairReach || !chairIsPulled(chair)) return;
    animate(eye, { x: chair.pulled + chair.side * .015, y: 1.19, z: chair.z, yaw: turnToward(chair.yaw), pitch: -.235 },
      590, () => { state.seated = chair; });
  }

  function stand() {
    const chair = state.seated;
    if (transition || !chair || !computer.hidden) return;
    animate(eye, { x: chair.side * .03, y: standingY, z: chair.z, yaw: turnToward(chair.yaw), pitch: -.35 },
      480, () => { state.seated = null; });
  }

  function toggleCurtain(bed, side) {
    const onBed = state.onBed;
    const inReach = onBed ? onBed.bed === bed && !onBed.lying : upperStair()?.side === bed.side;
    if (transition || !inReach) return;
    const curtains = state.bedCurtains[bed.index];
    animate(curtains, { [side]: curtains[side] === 0 ? 1 : 0 }, 540);
  }

  function enterBed(bed) {
    if (transition || upperStair()?.side !== bed.side) return;
    if (state.bedCurtains[bed.index].stair !== 1) {
      message("先拉开靠台阶的床帘，再上床");
      return;
    }
    const stairPose = { ...eye };
    const seatPose = { x: bed.x, y: 2.41, z: bed.z - bed.headDirection * .66,
      yaw: bed.headDirection > 0 ? Math.PI : 0, pitch: -.36 };
    keyDown.clear();
    animate(eye, { ...seatPose, yaw: turnToward(seatPose.yaw) }, 570, () => {
      state.onBed = { bed, stairPose, seatPose, lying: false };
    });
  }

  function tidyBedding() {
    const onBed = state.onBed;
    if (transition || !onBed || onBed.lying) return;
    const { index } = onBed.bed;
    if (state.bedding[index] === 0) {
      animate(state.bedding, { [index]: 1 }, 700, () => message("被褥已整理好"));
    }
  }

  function lieDown() {
    const onBed = state.onBed;
    if (transition || !onBed || onBed.lying) return;
    const { bed, seatPose } = onBed;
    animate(eye, { x: bed.x, y: 2.13, z: bed.z + bed.headDirection * .67,
      yaw: turnToward(seatPose.yaw + Math.PI), pitch: .23 }, 760, () => { onBed.lying = true; });
  }

  function sitUp(done) {
    const onBed = state.onBed;
    if (transition || !onBed?.lying) return;
    const { seatPose } = onBed;
    animate(eye, { ...seatPose, yaw: turnToward(seatPose.yaw) }, 620, () => {
      onBed.lying = false;
      done?.();
    });
  }

  function leaveBed() {
    const onBed = state.onBed;
    if (transition || !onBed) return;
    if (onBed.lying) {
      sitUp(leaveBed);
      return;
    }
    const { bed, stairPose } = onBed;
    if (state.bedCurtains[bed.index].stair !== 1) {
      message("先拉开靠台阶的床帘，再下床");
      return;
    }
    keyDown.clear();
    animate(eye, { ...stairPose, yaw: turnToward(stairPose.yaw) }, 510, () => { state.onBed = null; });
  }

  function useComputer() {
    if (transition || state.seated !== computerChair || !computer.hidden) return;
    state.screenOn = true;
    keyDown.clear();
    setHelp(false);
    statusUntil = 0;
    computer.hidden = false;
    openNotes.focus();
    refreshDesktopPanel();
  }

  function exitComputer() {
    if (osMode) exitDesktopMode();
    deskOs?.pause();
    computer.hidden = true;
    canvas.focus({ preventScroll: true });
  }

  // ---- 真 Windows 桌面（v86）----
  let deskOs = null;
  let deskTexture = null;
  let osMode = false;
  let osBusy = false;

  function setDesktopStatus(text) {
    desktopNote.textContent = text || "";
    desktopNote.hidden = !text;
    desktopState.textContent = text || "";
  }

  function syncDesktopButtons() {
    const running = Boolean(deskOs?.running);
    bootDesktop.textContent = running ? "进入真系统" : "启动真 Windows 桌面";
    desktop.hidden = !osMode;
  }

  async function refreshDesktopPanel() {
    if (osBusy) return;
    if (location.protocol === "file:") {
      bootDesktop.disabled = true;
      setDesktopStatus("真系统需要 http(s) 打开页面：用线上地址或在项目目录起一个本地服务器");
      return;
    }
    bootDesktop.disabled = false;
    const info = await DormScene.deskOsInfo();
    if (info.available) {
      bootDesktop.textContent = deskOs?.running ? "进入真系统" : "启动真 Windows 桌面";
      setDesktopStatus(`${info.hint}：${info.label}`);
    } else {
      bootDesktop.textContent = "选择 Windows 镜像…";
      setDesktopStatus(info.hint);
    }
  }

  function lockPointer() {
    if (document.pointerLockElement) return;
    try {
      const result = canvas.requestPointerLock();
      if (result?.catch) result.catch(() => {});
    } catch {
      // 个别浏览器不支持指针锁定，退化成直接点击操作
    }
  }

  function enterDesktopMode() {
    osMode = true;
    computer.hidden = true;
    desktop.hidden = false;
    keyDown.clear();
    syncDesktopButtons();
    lockPointer();
  }

  function exitDesktopMode() {
    if (!osMode) return;
    osMode = false;
    desktop.hidden = true;
    if (document.pointerLockElement) document.exitPointerLock();
    deskOs?.pause();
    keyDown.clear();
    computer.hidden = false;
    syncDesktopButtons();
    refreshDesktopPanel();
    canvas.focus({ preventScroll: true });
  }

  async function startDesktop() {
    if (osBusy) return;
    if (location.protocol === "file:") {
      message("真系统需要 http(s) 打开页面");
      return;
    }
    osBusy = true;
    try {
      const info = await DormScene.deskOsInfo();
      if (!info.available) {
        osFile.click();
        return;
      }
      if (!deskOs) {
        deskOs = DormScene.createDeskOs({ onStatus: (status, text) => {
          setDesktopStatus(text);
          if (status === "running") syncDesktopButtons();
        } });
        deskTexture = desk.showLiveScreen(deskOs.canvas);
        deskOs.watchScreen();
      }
      state.screenOn = true;
      await deskOs.start();
      state.osTick = (state.osTick || 0) + 1;
      enterDesktopMode();
      syncDesktopButtons();
    } catch (error) {
      console.error(error);
      setDesktopStatus(`启动失败：${error.message || error}`);
      message(`真系统启动失败：${error.message || error}`);
    } finally {
      osBusy = false;
    }
  }

  async function acceptImage(file) {
    if (!file || osBusy) return;
    if (file.size > 640 * 1024 * 1024) {
      message("镜像超过 640 MB，换一个小一点的");
      return;
    }
    osBusy = true;
    try {
      setDesktopStatus(`正在保存 ${file.name}…`);
      const buffer = await file.arrayBuffer();
      await DormScene.saveDeskOsImage(file.name, buffer);
      setDesktopStatus(`已保存镜像：${file.name}`);
    } catch (error) {
      console.error(error);
      message(`镜像保存失败：${error.message || error}`);
      osBusy = false;
      return;
    }
    osBusy = false;
    await startDesktop();
  }

  function writeHomework() {
    if (state.seated !== computerChair || transition || !computer.hidden) return;
    bookTime = performance.now();
    writingSince = null;
    state.ink = 0;
    const dx = book.x - eye.x;
    const dz = book.z - eye.z;
    animate(eye, {
      yaw: turnToward(Math.atan2(-dx, -dz)),
      pitch: Math.atan2(book.y - eye.y, Math.hypot(dx, dz))
    }, 325);
  }

  const commands = {
    "open-door": { key: "E", label: "打开大门", run: toggleDoor },
    "close-door": { key: "E", label: "关闭大门", run: toggleDoor },
    stand: { key: "C", label: "起身", run: stand },
    tidyBedding: { key: "B", label: "整理被褥", run: tidyBedding },
    lieDown: { key: "C", label: "躺下", run: lieDown },
    sitUp: { key: "C", label: "坐起", run: () => sitUp() },
    leaveBed: { key: "Esc", label: "下床回到台阶", run: leaveBed },
    computer: { key: "1", label: "使用电脑", run: useComputer },
    book: { key: "2", label: "写作业", run: writeHomework }
  };
  const chairCommands = chairs.map(chair => ({
    pull: { key: "F", label: "拉出椅子", chair, run: () => slideChair(chair) },
    sit: { key: "C", label: "坐下", chair, run: () => sit(chair) }
  }));
  const curtainLabels = { aisle: "过道侧床帘", stair: "台阶侧床帘" };
  const bedCommands = beds.map(bed => ({
    curtains: Object.fromEntries(Object.entries(curtainLabels).map(([side, label]) => [side, {
      key: "E", bed,
      label: () => (state.bedCurtains[bed.index][side] === 0 ? "拉开" : "合上") + label,
      run: () => toggleCurtain(bed, side)
    }])),
    enter: { key: "C", bed, label: "上床坐下", run: () => enterBed(bed) }
  }));

  const roomPoints = [
    {
      id: "ceiling-light", key: "L", target: ceilingSwitch,
      near: () => eye.z < room.frontZ + .14 && Math.hypot(eye.x - ceilingSwitch.x, eye.z - ceilingSwitch.z) < 1.17,
      label: () => state.ceilingOn ? "关顶灯" : "开顶灯",
      run: () => { state.ceilingOn = !state.ceilingOn; }
    },
    ...storagePanels.map(panel => ({
      id: "storage-" + panel.index, key: "E", panel,
      near: () => eye.z < room.frontZ - .035 && storageClearance(eye.x, eye.z, panel, state.storageOpen[panel.index]) < 1.66,
      label: () => {
        const open = state.storageOpen[panel.index] > 0;
        return (panel.travel ? (open ? "推回" : "拉出") : (open ? "关上" : "打开")) + panel.label;
      },
      run: () => toggleStorage(panel)
    })),
    {
      id: "desk-lamp", key: "L", target: deskLamp, seatedAt: rightDeskChair,
      near: () => eye.x > .02 && Math.hypot(eye.x - .90, eye.z - deskLamp.z) < .94,
      label: () => state.deskLampOn ? "关右桌台灯" : "开右桌台灯",
      run: () => { state.deskLampOn = !state.deskLampOn; }
    },
    {
      id: "computer-desk-light", key: "L", target: computerLampSwitch, seatedAt: computerChair,
      near: () => Math.hypot(eye.x + .86, eye.z - computerChair.z) < 1.17,
      label: () => state.computerLampOn ? "关电脑桌上方灯" : "开电脑桌上方灯",
      run: () => { state.computerLampOn = !state.computerLampOn; }
    }
  ];
  for (const { id, key, label, run } of roomPoints) {
    commands[id] = { key, label, run };
  }

  function canReach(point) {
    return (!state.seated || point.seatedAt === state.seated) && point.near();
  }

  function updateHud(now) {
    overviewButton.disabled = Boolean(transition) || !computer.hidden;
    aim.hidden = state.overview || !computer.hidden;
    feedback.hidden = now >= statusUntil || !computer.hidden;
    const command = targetAt();
    let text = "";
    if (command) {
      const label = typeof command.label === "function" ? command.label() : command.label;
      text = command.key + "  " + label;
    } else if (!state.overview && !transition) {
      if (state.onBed?.lying) text = "C  坐起 · Esc 下床";
      else if (state.onBed) text = "E  床帘 · B 整理 · C 躺下 · Esc 下床";
      else if (upperStair()) text = "E  开合床帘 · C 上床";
    }
    aimAction.hidden = !text;
    if (aimAction.textContent !== text) aimAction.textContent = text;
  }

  function hitDistance(direction, target, origin = eye) {
    let low = 0, high = Infinity;
    for (const axis of ["x", "y", "z"]) {
      const offset = origin[axis] - target[axis];
      const factor = direction[axis];
      const extent = target["h" + axis];
      if (Math.abs(factor) < .00001) {
        if (Math.abs(offset) > extent) return Infinity;
        continue;
      }
      const start = (-extent - offset) / factor, end = (extent - offset) / factor;
      low = Math.max(low, Math.min(start, end));
      high = Math.min(high, Math.max(start, end));
      if (low > high) return Infinity;
    }
    return low;
  }

  function hitDoor(ray, panel, angle) {
    const yaw = panel.yaw + angle;
    const origin = { ...intoDoorSpace(eye.x - panel.x, eye.z - panel.z, yaw), y: eye.y };
    const direction = { ...intoDoorSpace(ray.x, ray.z, yaw), y: ray.y };
    return hitDistance(direction, {
      x: -panel.width / 2, y: panel.bottom + panel.height / 2, z: 0,
      hx: panel.width / 2, hy: panel.height / 2, hz: panel.thickness / 2 + .032
    }, origin);
  }

  function hitStorage(ray, panel) {
    const progress = state.storageOpen[panel.index];
    if (panel.openAngle) return hitDoor(ray, panel, panel.openAngle * progress);
    const origin = intoDoorSpace(eye.x - panel.x, eye.z - panel.z, panel.yaw);
    const direction = intoDoorSpace(ray.x, ray.z, panel.yaw);
    origin.y = eye.y - panel.bottom;
    direction.y = ray.y;
    const target = { x: 0, y: panel.height / 2, z: 0,
      hx: panel.width / 2, hy: panel.height / 2, hz: panel.thickness / 2 + .032 };
    if (panel.travel) {
      const depth = storageExtension(panel, progress) / 2;
      target.z = depth;
      target.hz += depth;
    } else {
      const angle = panel.dropAngle * progress;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      for (const vector of [origin, direction]) {
        const { y, z } = vector;
        vector.y = y * cos + z * sin;
        vector.z = z * cos - y * sin;
      }
    }
    return hitDistance(direction, target, origin);
  }

  function targetUpperBed(ray, stair) {
    const onBed = state.onBed;
    if (onBed?.lying) {
      return Number.isFinite(hitDistance(ray, onBed.bed.mattress)) ? commands.sitUp : null;
    }
    const reachable = onBed ? [onBed.bed] : beds.filter(bed => bed.side === stair.side);
    const candidates = [];
    for (const bed of reachable) {
      const curtains = state.bedCurtains[bed.index];
      const actions = bedCommands[bed.index];
      for (const side of Object.keys(curtainLabels)) {
        candidates.push([bed.curtains[side].target(curtains[side]), actions.curtains[side]]);
      }
      if (onBed) {
        candidates.push([bed.pillow, commands.lieDown]);
        if (state.bedding[bed.index] === 0) candidates.push([bed.quilt, commands.tidyBedding]);
        if (curtains.stair === 1) {
          const step = stairTreads.at(-1);
          candidates.push([{
            x: bed.side * (step.edge + .118), y: step.top, z: onBed.stairPose.z,
            hx: .135, hy: .09, hz: .23
          }, commands.leaveBed]);
        }
      } else if (curtains.stair === 1) {
        candidates.push([bed.mattress, actions.enter]);
      }
    }
    let distance = Infinity;
    let selected = null;
    for (const [target, command] of candidates) {
      const hit = hitDistance(ray, target);
      if (hit < distance) {
        distance = hit;
        selected = command;
      }
    }
    return selected;
  }

  function targetAt(clientX, clientY) {
    if (state.overview || transition || !computer.hidden) return null;
    const stair = upperStair();
    if (onStairs() && !stair && !state.onBed) return null;
    let u = 0, v = 0;
    if (clientX !== undefined) {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.tan(DormScene.fieldOfView / 2);
      u = ((clientX - rect.left) * 2 / rect.width - 1) * rect.width / rect.height * scale;
      v = (1 - (clientY - rect.top) * 2 / rect.height) * scale;
    }
    const { forward, right, up } = DormScene.basis(eye.yaw, eye.pitch);
    const [x, y, z] = forward.map((value, i) => value + u * right[i] + v * up[i]);
    const ray = { x, y, z };
    if (stair || state.onBed) return targetUpperBed(ray, stair);
    const reachableChairs = state.seated ? [] : chairs.filter(chair => chairDistance(chair) < chairReach);
    const canUseDoor = !state.seated && nearDoor();
    const nearby = roomPoints.filter(canReach);
    const targets = reachableChairs.map(chair => ({
      ...chairCollider(chair), y: .57, hy: .42,
      command: chairCommands[chair.index][chairIsPulled(chair) ? "sit" : "pull"]
    }));
    if (state.seated) targets.push({ ...chairCollider(state.seated), y: .52, hy: .25, command: commands.stand });
    if (state.seated === computerChair) {
      targets.push(
        { ...screen, hx: .023, hy: .158, hz: .27, command: commands.computer },
        { ...book, y: book.y + .020, hx: .105, hy: .034, hz: .125, command: commands.book }
      );
    }
    let nearest = Infinity;
    let selected = null;
    if (canUseDoor) {
      nearest = hitDoor(ray, door, state.doorAngle);
      if (Number.isFinite(nearest)) selected = commands[doorAction()];
    }
    for (const target of targets) {
      const distance = hitDistance(ray, target);
      if (distance < nearest) {
        nearest = distance;
        selected = target.command;
      }
    }
    for (const point of nearby) {
      const distance = point.panel ? hitStorage(ray, point.panel) : hitDistance(ray, point.target);
      if (distance < nearest) {
        nearest = distance;
        selected = commands[point.id];
      }
    }
    return selected;
  }

  function turn(dx, dy) {
    if (state.overview) {
      state.overviewYaw = clamp(state.overviewYaw - dx * .005, -1.49, 1.49);
      state.overviewPitch = clamp(state.overviewPitch + dy * .0045, .34, 1.22);
      return;
    }
    eye.yaw -= dx * .0041;
    eye.pitch = clamp(eye.pitch - dy * .0041, -1.28, 1.18);
  }

  canvas.addEventListener("pointerdown", event => {
    if (osMode) {
      lockPointer();
      return;
    }
    if (event.button !== 0 || transition || !computer.hidden) return;
    drag = { x: event.clientX, y: event.clientY, total: 0 };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", event => {
    if (osMode) return;
    if (drag) {
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      drag.total += Math.hypot(dx, dy);
      if (drag.total > 4) {
        canvas.classList.add("turning");
        turn(dx, dy);
      }
      drag.x = event.clientX;
      drag.y = event.clientY;
    } else {
      canvas.classList.toggle("target", Boolean(targetAt(event.clientX, event.clientY)));
    }
  });
  canvas.addEventListener("pointerup", event => {
    if (osMode) {
      drag = null;
      return;
    }
    if (!drag) return;
    const selected = drag.total < 5 ? targetAt(event.clientX, event.clientY) : null;
    drag = null;
    canvas.classList.remove("turning");
    selected?.run();
  });
  canvas.addEventListener("pointercancel", () => {
    drag = null;
    canvas.classList.remove("turning", "target");
  });

  function useAimedObject() {
    const command = targetAt();
    if (command) command.run();
    else if (state.onBed?.lying) sitUp();
    else if (state.onBed) message("对准床帘按 E，或按 B 整理被褥");
    else if (upperStair()) message("将准星对准床帘，或直接点它");
    else if (!state.seated && nearDoor()) toggleDoor();
    else message("将准星对准物件，或直接点它");
  }

  function toggleNearbyLight() {
    const command = targetAt();
    if (command?.key === "L") {
      command.run();
      return;
    }
    const light = roomPoints.find(point => point.key === "L" && canReach(point));
    if (light) light.run();
    else message("走近墙上开关或书桌灯");
  }

  const shortcuts = {
    KeyE: useAimedObject,
    KeyB: tidyBedding,
    KeyL: toggleNearbyLight,
    KeyF: () => {
      if (state.seated) {
        message("按 C 起身后再移动椅子");
        return;
      }
      const chair = nearbyChair();
      if (chair) slideChair(chair);
      else message("走近要推拉的椅子");
    },
    KeyC: () => {
      if (state.onBed) {
        if (state.onBed.lying) sitUp();
        else lieDown();
        return;
      }
      const stair = upperStair();
      if (stair) {
        const aheadZ = DormScene.basis(eye.yaw, 0).forward[2];
        const end = Math.abs(aheadZ) > .18 ? Math.sign(aheadZ) : Math.sign(eye.z - stair.z) || 1;
        const bed = targetAt()?.bed ?? beds.find(bed => bed.side === stair.side && bed.headDirection === end);
        if (bed) enterBed(bed);
        return;
      }
      if (state.seated) {
        stand();
        return;
      }
      const chair = nearbyChair();
      if (!chair) message("走近要坐的椅子");
      else if (!chairIsPulled(chair)) message("先按 F 拉出椅子");
      else sit(chair);
    },
    Digit1: () => {
      if (state.seated === computerChair) useComputer();
      else message("先在电脑桌前坐下");
    },
    Digit2: () => {
      if (state.seated === computerChair) writeHomework();
      else message("先在电脑桌前坐下");
    }
  };

  window.addEventListener("keydown", event => {
    const { code } = event;
    if (code === "Escape") {
      if (event.repeat) return;
      if (osMode) {
        if (document.pointerLockElement) document.exitPointerLock();
        else exitDesktopMode();
        return;
      }
      if (!computer.hidden) exitComputer();
      else if (!keyGuide.hidden) setHelp(false);
      else if (state.overview) toggleOverview();
      else if (state.onBed) leaveBed();
      return;
    }
    if (osMode) return;
    if (!computer.hidden || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
    if (movementKeys.includes(code)) {
      keyDown.add(code);
      event.preventDefault();
      return;
    }
    if (event.repeat) return;
    if (code === "KeyH") setHelp(keyGuide.hidden);
    else if (code === "KeyV") toggleOverview();
    else if (!state.overview && !transition) {
      const bedKey = (state.onBed || upperStair()) && (code === "KeyE" || code === "KeyC" || code === "KeyB");
      if (!onStairs() || bedKey) shortcuts[code]?.();
    }
  });
  window.addEventListener("keyup", event => keyDown.delete(event.code));
  window.addEventListener("blur", () => { keyDown.clear(); });
  helpToggle.addEventListener("click", () => setHelp(keyGuide.hidden));
  overviewButton.addEventListener("click", toggleOverview);
  closeComputer.addEventListener("click", exitComputer);
  openNotes.addEventListener("click", () => { notes.hidden = !notes.hidden; });
  bootDesktop.addEventListener("click", () => {
    if (deskOs?.running && !osMode) enterDesktopMode();
    else startDesktop();
  });
  desktopLock.addEventListener("click", lockPointer);
  desktopExit.addEventListener("click", exitDesktopMode);
  osFile.addEventListener("change", () => {
    acceptImage(osFile.files?.[0]);
    osFile.value = "";
  });
  document.addEventListener("pointerlockchange", () => {
    if (!osMode) return;
    desktopLock.textContent = document.pointerLockElement === canvas ? "鼠标已锁定" : "锁定鼠标";
  });

  function draggingFiles(event) {
    return Array.from(event.dataTransfer?.items || []).some(item => item.kind === "file");
  }
  window.addEventListener("dragover", event => {
    if (!draggingFiles(event)) return;
    event.preventDefault();
    osDrop.classList.add("active");
  });
  window.addEventListener("dragleave", event => {
    if (event.relatedTarget) return;
    osDrop.classList.remove("active");
  });
  window.addEventListener("drop", event => {
    if (!draggingFiles(event)) return;
    event.preventDefault();
    osDrop.classList.remove("active");
    acceptImage(event.dataTransfer.files?.[0]);
  });

  function move(dt) {
    const pressed = key => Number(keyDown.has(key));
    const horizontal = pressed("KeyD") - pressed("KeyA");
    const forward = pressed("KeyW") - pressed("KeyS");
    const yawMotion = pressed("ArrowLeft") - pressed("ArrowRight");
    const pitchMotion = pressed("ArrowUp") - pressed("ArrowDown");
    if (state.overview) {
      turn(-yawMotion * 210 * dt, pitchMotion * 170 * dt);
      return;
    }
    eye.yaw += yawMotion * 1.75 * dt;
    eye.pitch = clamp(eye.pitch + pitchMotion * 1.1 * dt, -1.28, 1.18);
    if ((!horizontal && !forward) || state.seated || state.onBed) return;
    const speed = (onStairs() ? stairSpeed : travelSpeed) * dt / Math.hypot(horizontal, forward);
    const { forward: ahead, right } = DormScene.basis(eye.yaw, 0);
    const dx = (horizontal * right[0] + forward * ahead[0]) * speed;
    const dz = (horizontal * right[2] + forward * ahead[2]) * speed;
    if (canWalk(eye.x + dx, eye.z)) eye.x += dx;
    if (canWalk(eye.x, eye.z + dz)) eye.z += dz;
    updateWalkingHeight();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(Math.max(0, now - last) / 1000, .075);
    last = now;
    if (transition) {
      const { target, initial, values, duration, done, start } = transition;
      const progress = smooth((now - start) / duration);
      for (const [key, value] of Object.entries(values)) target[key] = initial[key] + (value - initial[key]) * progress;
      if (progress >= 1) {
        transition = null;
        done?.();
      }
    } else if (computer.hidden) {
      move(dt);
    }
    if (bookTime !== null) {
      state.book = Math.max(state.book, smooth((now - bookTime) / 570));
      if (state.book >= 1) { bookTime = null; writingSince = now; }
    }
    if (writingSince !== null) {
      state.ink = clamp((now - writingSince) / 1230, 0, 1);
      if (state.ink >= 1) writingSince = null;
    }
    if (deskOs && deskOs.paint(now)) {
      if (deskTexture) deskTexture.needsUpdate = true;
      state.osTick = (state.osTick || 0) + 1;
    }
    updateHud(now);
    render(eye, state);
    requestAnimationFrame(frame);
  }
  // ?demo=desk：演示与截图用，直接从电脑桌前坐下开始。
  if (new URLSearchParams(location.search).get("demo") === "desk") {
    state.chairPositions[computerChair.index] = computerChair.pulled;
    state.seated = computerChair;
    Object.assign(eye, { x: computerChair.pulled + computerChair.side * .015, y: 1.19, z: computerChair.z,
      yaw: turnToward(computerChair.yaw), pitch: -.235 });
    useComputer();
  }
  requestAnimationFrame(frame);
})();

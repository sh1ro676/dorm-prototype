// 真 Windows 桌面：在宿舍显示器里运行 v86（浏览器中的 x86 模拟器）。
// 镜像不随仓库分发：优先使用 ?os= 指定的地址，其次是浏览器里拖入并保存在 IndexedDB 的镜像，
// 最后读根目录的 os-config.json。三条路都没有时由 interaction.js 提示用户提供镜像。

const ASSET_ROOT = "vendor/v86/";
export const SCREEN_WIDTH = 512;
export const SCREEN_HEIGHT = 288;
const DB_NAME = "dorm-desk-os";
const DB_STORE = "image";
const DB_KEY = "hda";
const META_KEY = "dorm-desk-os-meta";
const MAX_IMAGE_BYTES = 640 * 1024 * 1024;
const FRAME_INTERVAL = 33; // 屏幕上最多约 30 帧/秒
const devices = ["hda", "hdb", "fda", "fdb", "cdrom"];

let v86Promise = null;
let configPromise = null;

function loadV86() {
  if (window.V86) return Promise.resolve(window.V86);
  if (v86Promise) return v86Promise;
  v86Promise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${ASSET_ROOT}libv86.js`;
    script.async = true;
    script.onload = () => window.V86 ? resolve(window.V86) : reject(new Error("v86 没有导出 V86"));
    script.onerror = () => reject(new Error(`无法加载 ${script.src}`));
    document.head.appendChild(script);
  }).catch(error => {
    v86Promise = null;
    throw error;
  });
  return v86Promise;
}

function readMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeMeta(meta) {
  try {
    if (meta) localStorage.setItem(META_KEY, JSON.stringify(meta));
    else localStorage.removeItem(META_KEY);
  } catch {
    // 隐私模式下 localStorage 不可写，只是记不住镜像名，不影响运行
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("无法打开浏览器存储"));
  });
}

function readStoredImage() {
  return openDatabase().then(db => new Promise((resolve, reject) => {
    const request = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).get(DB_KEY);
    request.onsuccess = () => {
      db.close();
      resolve(request.result || null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  }));
}

export async function saveDeskOsImage(name, buffer) {
  if (buffer.byteLength > MAX_IMAGE_BYTES) throw new Error("镜像超过 640 MB");
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, "readwrite");
    transaction.objectStore(DB_STORE).put(buffer, DB_KEY);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
  writeMeta({ name, size: buffer.byteLength, savedAt: Date.now() });
}

export async function clearDeskOsImage() {
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, "readwrite");
    transaction.objectStore(DB_STORE).delete(DB_KEY);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
  writeMeta(null);
}

function loadConfig() {
  if (!configPromise) {
    configPromise = fetch("os-config.json", { cache: "no-store" })
      .then(response => response.ok ? response.json() : null)
      .catch(() => null);
  }
  return configPromise;
}

async function fetchImageBuffer(url, onProgress) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`镜像加载失败（HTTP ${response.status}）`);
  // 服务器可能压缩响应：此时 content-length 是压缩后的大小，不能拿来预分配。
  const encoded = Boolean(response.headers.get("content-encoding"));
  const total = encoded ? 0 : Number(response.headers.get("content-length")) || 0;
  const reader = response.body?.getReader();
  if (!reader) return response.arrayBuffer();
  const chunks = [];
  let received = 0;
  const buffer = total > 0 ? new Uint8Array(total) : null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (buffer && received + value.byteLength <= buffer.length) buffer.set(value, received);
    else chunks.push(value);
    received += value.byteLength;
    onProgress?.(total ? Math.min(received / total, 1) : 0);
  }
  if (buffer && chunks.length === 0) return buffer.buffer;
  const joined = new Uint8Array(received);
  let offset = 0;
  if (buffer) {
    const used = received - chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    joined.set(buffer.subarray(0, used));
    offset = used;
  }
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return joined.buffer;
}

function waitUntil(test, timeout) {
  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    const tick = () => {
      let done = false;
      try {
        done = Boolean(test());
      } catch {
        done = false;
      }
      if (done) {
        resolve();
        return;
      }
      if (performance.now() - startedAt > timeout) {
        reject(new Error("模拟器启动超时"));
        return;
      }
      setTimeout(tick, 120);
    };
    tick();
  });
}

function fileNameOf(url) {
  try {
    return decodeURIComponent(new URL(url, location.href).pathname.split("/").pop() || url);
  } catch {
    return url;
  }
}

// 告诉界面当前有没有可用的镜像，以及来源说明。不读取镜像本体。
export async function deskOsInfo() {
  if (location.protocol === "file:") {
    return { available: false, reason: "file", label: "", hint: "真系统需要 http(s) 打开页面：用线上地址，或在项目目录运行本地服务器" };
  }
  const override = new URLSearchParams(location.search).get("os");
  if (override) return { available: true, label: fileNameOf(override), hint: "来自页面地址的 ?os= 参数" };
  const saved = readMeta();
  if (saved?.name) return { available: true, label: saved.name, hint: "来自浏览器里保存的镜像" };
  const config = await loadConfig();
  if (config?.hda) return { available: true, label: fileNameOf(config.hda), hint: "来自 os-config.json" };
  return { available: true, builtin: true, label: "KolibriOS（内置开源演示系统）",
    hint: "没有配置 Windows 镜像，先用内置演示系统看效果；Windows 镜像需自备" };
}

async function resolveSource(onProgress) {
  const params = new URLSearchParams(location.search);
  const override = params.get("os");
  const config = await loadConfig();
  const memoryMB = Number(config?.memoryMB) > 0 ? Number(config.memoryMB) : 128;
  const device = devices.includes(params.get("device") || config?.device) ? (params.get("device") || config?.device) : "hda";
  if (override) {
    const size = Number(params.get("size")) || 0;
    return { label: fileNameOf(override), url: override, size, memoryMB, device, stateUrl: "", onProgress };
  }
  const saved = readMeta();
  const buffer = await readStoredImage();
  if (buffer && saved) return { label: saved.name, buffer, memoryMB, device, stateUrl: "", onProgress };
  if (config?.hda) {
    return {
      label: fileNameOf(config.hda), url: config.hda, size: Number(config.hdaSize) || 0,
      memoryMB, device, stateUrl: config.state || "", onProgress
    };
  }
  // 没有 Windows 镜像时退回内置的开源系统，保证「启动」按钮开箱可用。
  return {
    label: "KolibriOS（内置开源演示系统）", url: "vendor/os/kolibri.img", size: 1474560,
    memoryMB: 64, device: "fda", stateUrl: "", onProgress
  };
}

export function createDeskOs(options = {}) {
  const notify = options.onStatus || (() => {});
  const canvas = document.createElement("canvas");
  canvas.width = SCREEN_WIDTH;
  canvas.height = SCREEN_HEIGHT;
  const context = canvas.getContext("2d", { alpha: false });
  const container = document.createElement("div");
  container.className = "desk-os-buffer";
  container.setAttribute("aria-hidden", "true");
  document.body.appendChild(container);

  let emulator = null;
  let screen = null;
  let textScreen = null;
  let running = false;
  let pendingPaint = false;
  let paintedAt = 0;
  let status = "idle";
  let statusText = "";

  function report(next, text) {
    status = next;
    statusText = text;
    notify(next, text);
  }

  function grabScreen() {
    if (!screen) {
      const candidate = container.querySelector("canvas");
      if (candidate) screen = candidate;
    }
    if (!textScreen) {
      const candidate = container.querySelector("div");
      if (candidate) textScreen = candidate;
    }
  }

  // v86 在图形模式下画 canvas，纯文本模式（BIOS 自检、DOS）则写进一个 div。
  function paintTextMode() {
    const text = (textScreen?.textContent || "").replace(/\s+$/, "");
    if (!text) return false;
    context.fillStyle = "#000000";
    context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    context.fillStyle = "#d9d9d9";
    context.font = "10px Consolas, 'Courier New', monospace";
    context.textBaseline = "top";
    text.split("\n").slice(0, 25).forEach((line, index) => {
      context.fillText(line.replace(/\s+$/, "").slice(0, 84), 8, 8 + index * 11);
    });
    return true;
  }

  // 把模拟器的 VGA 画面（通常是 640×480）等比缩进 512×288 的贴图，两侧留黑边。
  function paint(now = performance.now()) {
    if (!running && !pendingPaint) return false;
    if (running && now - paintedAt < FRAME_INTERVAL) return false;
    if (!screen && !textScreen) return false;
    const width = screen?.width || 0, height = screen?.height || 0;
    paintedAt = now;
    pendingPaint = false;
    // 画布还是 HTML 默认的 300×150 时说明还没进图形模式，改画文本。
    if (width <= 320 && height <= 200) {
      if (!paintTextMode() && !width) return false;
    } else {
      context.fillStyle = "#000000";
      context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      const scale = Math.min(SCREEN_WIDTH / width, SCREEN_HEIGHT / height);
      const drawWidth = Math.round(width * scale);
      const drawHeight = Math.round(height * scale);
      context.drawImage(screen, Math.round((SCREEN_WIDTH - drawWidth) / 2),
        Math.round((SCREEN_HEIGHT - drawHeight) / 2), drawWidth, drawHeight);
      if (status === "booting" && width >= 320 && height >= 240) report("running", "真系统运行中");
    }
    return true;
  }

  async function start() {
    if (emulator) {
      if (!running) await emulator.run();
      running = true;
      return;
    }
    report("loading", "正在读取 Windows 镜像…");
    const source = await resolveSource(progress => {
      report("loading", `正在读取系统镜像… ${Math.round(progress * 100)}%`);
    });
    if (!source) throw new Error("没有找到 Windows 镜像");
    const V86 = await loadV86();
    report("loading", source.buffer ? "正在准备镜像…" : "正在下载系统镜像…");
    let disk;
    if (source.buffer) {
      disk = { buffer: source.buffer, size: source.buffer.byteLength };
    } else if (source.size > 32 * 1024 * 1024) {
      // 大镜像交给 v86 分块请求，避免一次性塞进内存。
      disk = { url: source.url, size: source.size, async: true };
    } else {
      const buffer = await fetchImageBuffer(source.url, source.onProgress);
      disk = { buffer, size: buffer.byteLength };
    }
    report("booting", "正在启动系统…");
    const options = {
      screen_container: container,
      wasm_path: `${ASSET_ROOT}v86.wasm`,
      bios: { url: `${ASSET_ROOT}seabios.bin` },
      vga_bios: { url: `${ASSET_ROOT}vgabios.bin` },
      memory_size: source.memoryMB * 1024 * 1024,
      autostart: true,
      disable_speaker: true,
      initial_state: source.stateUrl ? { url: source.stateUrl } : undefined
    };
    options[source.device] = disk;
    emulator = new V86(options);
    grabScreen();
    watchScreen();
    // v86 的构造是异步的：等 wasm 初始化和 CPU 真正跑起来，再认为启动完成。
    await waitUntil(() => emulator?.is_running?.() === true, 30000);
    running = true;
    pendingPaint = true;
    report("booting", "正在启动系统…");
    // 纯文本模式（DOS 类系统）画布一直是 300×150，给一个兜底超时。
    setTimeout(() => {
      if (status === "booting") report("running", "真系统运行中（画面若全黑，检查镜像类型 hda/fda/cdrom 是否匹配）");
    }, 20000);
  }

  async function resume() {
    if (!emulator) return false;
    if (!running) {
      if (emulator.is_running?.()) running = true;
      else await emulator.run();
    }
    running = true;
    pendingPaint = true;
    report("running", "真系统运行中");
    return true;
  }

  async function pause() {
    if (!emulator || !running) return;
    running = false;
    pendingPaint = true;
    report("paused", "真系统已暂停");
    try {
      await emulator.stop();
    } catch {
      // 已经停下来也无所谓
    }
  }

  async function dispose() {
    running = false;
    if (emulator) {
      try {
        await emulator.destroy?.();
      } catch {
        // 忽略销毁过程中的异常
      }
      emulator = null;
    }
    screen = null;
    container.replaceChildren();
    report("idle", "");
  }

  // v86 的屏幕适配器在 run() 期间才真正建立 canvas，轮询几次兜底。
  function watchScreen() {
    if (screen) return;
    grabScreen();
    if (!screen) setTimeout(watchScreen, 200);
  }

  return {
    canvas,
    paint,
    start,
    resume,
    pause,
    dispose,
    watchScreen,
    get running() {
      return running;
    },
    get status() {
      return status;
    },
    get statusText() {
      return statusText;
    }
  };
}

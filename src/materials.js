import * as THREE from "three";

export function canvasTexture(width, height, paint, repeat = [1, 1]) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...repeat);
  texture.anisotropy = 4;
  return texture;
}

export function randomFrom(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function makeMaterials() {
  const laminate = canvasTexture(256, 512, (ctx, w, h) => {
    const random = randomFrom(53);
    ctx.fillStyle = "#e3d3b9";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) {
      const x = random() * w, spread = 4 + random() * 15;
      const streak = ctx.createLinearGradient(x - spread, 0, x + spread, 0);
      streak.addColorStop(0, "#96714a00");
      streak.addColorStop(.50, i % 3 ? "#96714a0e" : "#fff4da42");
      streak.addColorStop(1, "#96714a00");
      ctx.fillStyle = streak;
      ctx.fillRect(x - spread, 0, spread * 2, h);
    }
    for (let i = 0; i < 220; i++) {
      const x = random() * w;
      ctx.strokeStyle = i % 2 ? "#67482c0b" : "#fff9eb21";
      ctx.lineWidth = .35 + random() * 1.3;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + random() * 11 - 5, h / 3, x - random() * 11 + 5, h * .75, x + 1, h);
      ctx.stroke();
    }
  });
  const tile = canvasTexture(512, 512, (ctx) => {
    const random = randomFrom(42);
    const tones = ["#c4bdb1", "#c6c1b6", "#bfbab0", "#cbc5b9"];
    for (const [i, tone] of tones.entries()) {
      const originX = (i % 2) * 256, originY = Math.floor(i / 2) * 256;
      ctx.fillStyle = "#7d7a72";
      ctx.fillRect(originX, originY, 256, 256);
      ctx.save();
      ctx.translate(originX, originY);
      ctx.beginPath();
      ctx.rect(2, 2, 252, 252);
      ctx.clip();
      ctx.fillStyle = tone;
      ctx.fillRect(2, 2, 252, 252);
      for (let spot = 0; spot < 12; spot++) {
        const x = random() * 256, y = random() * 256, size = 22 + random() * 85;
        const cloud = ctx.createRadialGradient(x, y, 0, x, y, size);
        cloud.addColorStop(0, spot % 2 ? "#6f69521d" : "#efebe22e");
        cloud.addColorStop(1, "#b8ab9000");
        ctx.fillStyle = cloud;
        ctx.fillRect(2, 2, 252, 252);
      }
      for (let grain = 0; grain < 360; grain++) {
        ctx.fillStyle = grain % 2 ? "#5d5a511f" : "#f5eee429";
        ctx.fillRect(random() * 256, random() * 256, .4 + random() * 1.7, .5 + random() * 1.1);
      }
      ctx.strokeStyle = "#dad2c6";
      ctx.strokeRect(2.5, 2.5, 251, 251);
      ctx.restore();
    }
  });
  const tileHeight = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#555555";
    ctx.fillRect(0, 0, w, h);
    for (const x of [0, 256]) {
      for (const y of [0, 256]) {
        ctx.fillStyle = "#ababab";
        ctx.fillRect(x + 2, y + 2, 252, 252);
        ctx.fillStyle = "#d0d0d0";
        ctx.fillRect(x + 4, y + 4, 248, 248);
      }
    }
  });
  tileHeight.colorSpace = THREE.NoColorSpace;
  const weave = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#b8b8b8";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) {
      ctx.fillStyle = "#808080";
      ctx.fillRect(0, y, w, 1);
      for (let x = y % 8 ? 0 : 2; x < w; x += 4) {
        ctx.fillStyle = "#dddddd";
        ctx.fillRect(x, y + 1, 2, 2);
      }
    }
  }, [3, 3]);
  const printed = canvasTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = "#e9dfcf";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#9f827a";
    ctx.lineWidth = 2;
    for (let y = 36; y < h; y += 98) {
      for (let x = 19; x < w; x += 74) {
        ctx.beginPath();
        ctx.ellipse(x + (y % 3) * 6, y, 12, 10, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 5, y - 6, 4, 3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, [3, 1]);
  const material = (color, roughness = .72, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  const coated = color => new THREE.MeshPhysicalMaterial({
    color, roughness: .43, clearcoat: .28, clearcoatRoughness: .27
  });
  const curtain = (color, extra) => new THREE.MeshPhysicalMaterial({
    color, roughness: .89, side: THREE.DoubleSide, sheen: .65, sheenColor: "#d0d5df", sheenRoughness: .78,
    ...extra
  });
  return {
    material, floor: material("#ffffff", .57, { map: tile, bumpMap: tileHeight, bumpScale: .0024 }),
    wall: material("#e5e2d9", .94),
    wood: material("#f0e9dc", .65, { map: laminate, bumpMap: laminate, bumpScale: .00052 }),
    plyEdge: material("#c3b295", .68), desk: material("#dfd8c7", .55),
    blue: coated("#72a4b6"), blueShade: coated("#618b9f"), enamel: coated("#d0d5d1"),
    drawerGap: material("#46565b", .88),
    steel: material("#c9d2db", .23, { metalness: .76 }),
    foam: material("#24292a", .88, { bumpMap: weave, bumpScale: .0012 }),
    seatBlue: material("#568391", .84, { bumpMap: weave, bumpScale: .0015 }),
    softPaper: material("#f4eee0", .92), black: material("#23292c", .67),
    curtains: [
      curtain("#8b80a5", { bumpMap: weave, bumpScale: .0015 }),
      curtain("#f2e5cf", { map: printed }),
      curtain("#353b50", { bumpMap: weave, bumpScale: .0015 }),
      curtain("#879da7", { bumpMap: weave, bumpScale: .0015 })
    ]
  };
}

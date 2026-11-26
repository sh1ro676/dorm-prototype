# 显示器里的真 Windows 桌面

宿舍左边电脑桌的显示器可以跑一个**真实操作系统**：用 [v86](https://github.com/copy/v86) 在浏览器里模拟一台 x86 电脑，把它的 VGA 输出当作显示器贴图。Windows 98 / 2000 / XP 只要能在这台模拟机上启动，显示器里看到的就是真的 Windows 桌面，可以用鼠标键盘操作。

```
按 1 打开电脑面板 → 启动真系统 → 点击画面锁定鼠标 → 操作；Esc 解锁，再按 Esc 退出
```

## 先看效果（不用准备任何镜像）

仓库里带了一个 1.4MB 的开源系统 [KolibriOS](../../vendor/os/NOTICE.md)。**没有配置 Windows 镜像时，「启动真系统」默认启动的就是它**，点一下就能看到显示器里跑起真正的操作系统：

```
按 1 → 启动真系统
```

也可以直接用带参数的地址（演示时一步到位，`demo=desk` 会直接坐在电脑桌前）：

```
http://localhost:8099/?demo=desk
https://sh1ro676.github.io/dorm-prototype/?demo=desk
```

## 三条接入 Windows 镜像的路

镜像**不会**也不应该提交进仓库（见文末版权说明），有三种方式让它出现：

### 1. 拖进页面（最省事）

在电脑面板里点「选择 Windows 镜像…」，或者直接把 `.img` 文件拖到页面任意位置。文件会存进浏览器的 IndexedDB，下次自动可用。

- 适合：自己的笔记本演示，不需要任何服务器
- 注意：300MB 的镜像会占用约 300MB 浏览器存储，清理办法见下面的「排错」

### 2. 写进 `os-config.json`

```json
{
  "hda": "http://192.168.1.10:8000/windows98.img",
  "hdaSize": 314572800,
  "memoryMB": 128,
  "device": "hda",
  "state": ""
}
```

- `hda`：镜像地址（相对页面或完整 URL）。放在项目目录就等于 `http://localhost:8099/windows98.img`
- `hdaSize`：镜像字节数。大于 32MB 时 v86 会分块请求，不必等整个文件下载完
- `memoryMB`：内存，Windows 98 用 128，Windows 2000 建议 256
- `device`：镜像挂到哪个设备，Windows 硬盘镜像用 `hda`（默认）；软盘镜像 `fda`；ISO `cdrom`
- `state`：可选，v86 的机器快照地址，填了可以跳过开机等十几秒

跨域加载时服务端要允许 CORS 并支持 Range 请求（nginx、对象存储、Python 的 `http.server` 目前不支持 Range，建议用 `npx serve` 或 nginx）。

### 3. 地址参数（演示 / 测试）

```
?os=<镜像地址>&device=<hda|fda|cdrom>&size=<字节数>
```

优先级：`?os=` > 浏览器里保存的镜像 > `os-config.json`。

## 镜像从哪来

- **Windows 98 SE / 2000**：需要一份已安装好的可启动硬盘镜像（`.img`），来源得自己解决（例如 WinWorld 之类的老系统归档站，或用虚拟机自己装一份再转成 raw 镜像）。课程演示属于个人使用，但**不要上传到公开仓库**。
- **Windows 2000 及以上**：v86 要求把 ACPI PC 改成 Standard PC，否则会蓝屏或卡住，见 [v86 的 Windows NT 说明](https://github.com/copy/v86/blob/master/docs/windows-nt.md)。
- **Windows XP**：v86 支持有限（[#86](https://github.com/copy/v86/issues/86)），更推荐 [html-virtual-pc](https://github.com/MarketKernel/html-virtual-pc) 这类专门方案。
- **开源可分发**：ReactOS、KolibriOS、FreeDOS 可以随便分发，适合放进仓库做演示（KolibriOS 已经放进来了）。

## 技术细节

| 位置 | 作用 |
| --- | --- |
| `src/desk-os.js` | 加载 v86、解析镜像来源、IndexedDB 存储、把模拟器画面绘制成 512×288 的画布 |
| `src/furniture.js` | `showLiveScreen()` 把这个画布换成显示器贴图 |
| `src/scene.js` | 渲染循环里带上 `state.osTick`，模拟器出帧时触发重绘 |
| `interaction.js` | 电脑面板、拖放、指针锁定、Esc 退出；真系统模式下不拦截键鼠 |
| `vendor/v86/` | v86 运行时 + SeaBIOS，见 [NOTICE](../../vendor/v86/NOTICE.md) |

- 显示器面片是 512×288（16:9），模拟器输出通常是 640×480 或 1024×768（4:3），`desk-os.js` 会等比缩放并补黑边。
- 纹理上传限制在约 30 帧/秒；离开电脑会 `pause()` 暂停模拟器，不白占 CPU。
- 纯文本模式（BIOS 自检、DOS）会渲染模拟器的文本层，所以开机过程也能看到画面。

## 排错

| 现象 | 原因 / 处理 |
| --- | --- |
| 面板提示「真系统需要 http(s) 打开页面」 | 双击 `index.html`（`file://`）时 v86 无法加载 wasm，用线上地址或 `npx serve .` 起本地服务器 |
| 启动后显示器全黑 | 镜像类型不对：软盘镜像要 `&device=fda`，ISO 要 `cdrom`；或镜像本身不可引导 |
| 提示「模拟器启动超时」 | 镜像地址跨域失败、404，或服务端不支持 Range；先在浏览器里直接打开镜像 URL 看能不能下载 |
| 打开真系统后很卡 | Windows 98 在 v86 里本来就是"复古机"性能；可以调低 `memoryMB`、关掉其他标签页；场景的后处理也会抢 GPU |
| 想换镜像 / 释放空间 | 浏览器控制台执行 `await DormScene.clearDeskOsImage()`，或删掉站点数据 |
| 鼠标进不去系统 | 先点击画面锁定指针；锁定失败时用「锁定鼠标」按钮重试；Esc 解锁 |

## 版权提醒

Windows 的磁盘镜像和系统文件是微软的版权作品。把镜像提交到公开仓库等于公开分发，不合规，也会让仓库体积爆炸（300MB 起，GitHub 单文件上限 100MB）。`vendor/os/` 里只放开源系统（KolibriOS，GPL-2.0，可再分发）。

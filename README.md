# 宿舍实景重建

这是一个元宇宙课程项目。场景参照真实照片，使用 Three.js 搭建可探索的四人宿舍。两侧各有两个上床下桌床位，同侧床位共用一组储物台阶。场景尺寸按照片比例估算。

## 在线体验

<https://sh1ro676.github.io/dorm-prototype/>

无需下载、无需安装，浏览器直接打开即可。

## 打开方式

1. 完整解压 ZIP，或 `git clone https://github.com/sh1ro676/dorm-prototype.git`。
2. 用 Chrome 或 Microsoft Edge 打开 [index.html](index.html)。
3. 按 `W` 走进宿舍。按 `H` 或点右上角「键位」可查看操作方法。

压缩包已包含浏览器运行所需的文件。体验时无需联网，也无需安装 Node.js。请在解压目录内打开页面。

## 操作键位

| 按键 | 操作 |
| --- | --- |
| `WASD` | 走动、上下台阶 |
| 方向键 | 转头、抬头或低头。也可以按住鼠标左键拖动 |
| `E` | 与准星对准的物件交互。也可直接点击物件 |
| `L` | 开关附近的顶灯或书桌灯。坐在有灯的书桌前也能操作 |
| `F` / `C` | 推拉附近的椅子 / 坐下或起身 |
| `1` / `2` | 坐在左侧电脑桌前时使用电脑 / 写作业 |
| `B` | 坐在床上时整理枕头和被子 |
| `V` / `H` | 切换俯视全景 / 查看键位 |
| `Esc` | 退出电脑、键位面板或全景。台阶侧床帘打开时可下床 |

## 演示路线

1. 在门口开关大门和室内顶灯，点击两侧蓝柜的门。宿舍共有 24 扇可开的柜门和 8 个可拉出的抽屉。台阶柜门从底边向外翻下，关好后可直接走上台阶。
2. 走到左侧电脑桌前，用 `F` 拉出椅子，用 `C` 坐下。试试电脑、作业本和书架灯条旁的开关。右桌台灯可独立开关，四把椅子都能使用。
3. 走到共用台阶最上面两级。打开靠台阶的床帘，点击床铺或按 `C` 上床坐下。过道侧和台阶侧床帘可以分别开合。点击被子或按 `B` 整理被褥，再按 `C` 躺下。按 `C` 坐起，拉开靠台阶的床帘，按 `Esc` 返回原来的台阶。

## 修改源码

- [src/scene.js](src/scene.js) 定义房间、灯光和渲染。
- [src/furniture.js](src/furniture.js)、[src/storage.js](src/storage.js)、[src/beds.js](src/beds.js) 定义家具、储物部件和床位。
- [src/room-fixtures.js](src/room-fixtures.js) 定义书桌灯和开关。
- [interaction.js](interaction.js) 处理走动、碰撞和操作。

修改 `src/` 后，可在项目目录使用 Node.js 重新构建。

```sh
npm ci
npm run build
```

构建会更新页面使用的 `scene.js`。Three.js 许可证见 [THREE-LICENSE.txt](THREE-LICENSE.txt)。

## 协作方式

仓库是公开的，协作者可以直接向 `main` 推送。

- 仓库地址：<https://github.com/sh1ro676/dorm-prototype>
- 第一次拉取：`git clone https://github.com/sh1ro676/dorm-prototype.git`
- 修改前先 `git pull`，改完 `git add -A && git commit -m "说明" && git push`
- **改了 `src/` 一定要 `npm ci && npm run build`，并把生成的 `scene.js` 一起提交。** 页面加载的是打包好的 `scene.js`，只改源码不提交构建产物，别人和线上看到的还是旧场景。
- 不要提交 `node_modules/`（已在 `.gitignore` 中忽略）。
- 提交后 GitHub Pages 会自动重新部署，一两分钟后线上页面即为最新版本。

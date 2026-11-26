# vendor/v86 来源与许可证

这里的文件是 [v86](https://github.com/copy/v86) 的浏览器运行时，用于在宿舍显示器里跑真实操作系统。

| 文件 | 来源 | 许可证 |
| --- | --- | --- |
| `libv86.js` | npm 包 `v86@0.5.476` 的 `build/libv86.js` | BSD-2-Clause，见 [LICENSE](LICENSE) |
| `v86.wasm` | 同上 | BSD-2-Clause |
| `v86-fallback.wasm` | 同上 | BSD-2-Clause |
| `seabios.bin` | <https://github.com/copy/v86/tree/master/bios>（SeaBIOS） | LGPL-3.0 |
| `vgabios.bin` | <https://github.com/copy/v86/tree/master/bios>（SeaVGABIOS） | LGPL-3.0 |

重新生成这份运行时（升级 v86 版本时）：

```sh
npm install v86@<版本>
cp node_modules/v86/build/libv86.js node_modules/v86/build/v86.wasm \
   node_modules/v86/build/v86-fallback.wasm node_modules/v86/LICENSE vendor/v86/
```

`seabios.bin`、`vgabios.bin` 不在 npm 包里，需要从 v86 仓库的 `bios/` 目录下载。

本目录**不包含任何操作系统镜像**，也不应该包含：Windows 的镜像文件是微软的版权作品，不能随公开仓库分发。镜像的获取方式见 [docs/windows-desktop.md](../docs/windows-desktop.md)。

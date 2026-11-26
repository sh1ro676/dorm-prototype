# vendor/os —— 仓库里唯一包含的磁盘镜像

| 文件 | 系统 | 许可证 | 来源 |
| --- | --- | --- | --- |
| `kolibri.img` | KolibriOS 0.7.7.0（1.44MB 软盘镜像） | GPL-2.0（含部分 BSD 代码） | <https://kolibrios.org> / <https://i.copy.sh/kolibri.img> |

它只是一个**开源演示镜像**，用来证明"显示器里跑真系统"这条链路是通的，也方便没有 Windows 镜像的同学先看看效果：

```
http://localhost:8099/?demo=desk&os=vendor/os/kolibri.img&device=fda
```

Windows 95/98/2000 的镜像**不会**被提交到这个仓库：那是微软的版权作品，公开分发属于侵权行为，而且体积（300MB 起）也不适合放在 GitHub Pages 上。获取和配置方法见 [docs/windows-desktop.md](../../docs/windows-desktop.md)。

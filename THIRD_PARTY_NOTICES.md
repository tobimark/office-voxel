# 第三方与上游声明 / Third-party notices

## PixOffice

Office Voxel 从 PixOffice 的 `example/office-voxel` 示例迁出，随后作为独立工程维护。原有代码采用 MIT License。

Copyright (c) 2026 teejoo

原始许可全文保留在 [licenses/pixoffice/LICENSE](licenses/pixoffice/LICENSE)。项目根目录的 [LICENSE](LICENSE) 继续保留该版权，并包含后续贡献者的版权声明。目录迁移与独立维护不取消原声明。

## Three.js

- 当前锁定版本：0.180.0。
- 来源：[Three.js 官方仓库](https://github.com/mrdoob/three.js)。
- 许可：MIT。
- Copyright © 2010-2025 three.js authors
- 完整许可：[licenses/three/LICENSE](licenses/three/LICENSE)。

包含 Three.js 及 OrbitControls 的生产构建随附完整许可；许可证不会仅依赖压缩后的 JavaScript 注释保留。构建和素材导出时会核对已安装 Three.js 的许可与仓库副本，升级依赖后需同步核对。

## Fusion Pixel Font

- 来源：[Fusion Pixel Font](https://github.com/TakWolf/fusion-pixel-font)。
- 使用版本：2026.09.01 发布中的简体中文等宽 12px 字体，未裁剪字形。
- Copyright (c) 2022, TakWolf (https://takwolf.com).
- 许可：SIL Open Font License 1.1。

字体及其组成字体的原始版权、保留字体名和许可全文保存在 `src/assets/fonts/README.md`、`OFL.txt`、`LICENSE-OFL.txt` 与 `LICENSES/`。`LICENSE-OFL.txt` 指字体上游仓库的许可，不是 Office Voxel 的项目许可证。

生产构建和人物素材导出包完整携带这些文本，路径为 `licenses/fusion-pixel/`。字体软件继续适用 OFL；不得用本项目的 MIT 声明替换它的原始声明。

## Vite 生成的运行时代码

- 当前锁定版本：8.3.4。
- 来源：[Vite 官方仓库](https://github.com/vitejs/vite)。
- Vite core 许可：MIT。
- Copyright (c) 2019-present, VoidZero Inc. and Vite contributors
- 原始发布包的完整许可及其内嵌依赖声明：[licenses/vite/LICENSE.md](licenses/vite/LICENSE.md)。

Vite 本身是开发工具，但网站可能包含它生成的 modulepreload polyfill 等运行时代码，因此生产构建和素材导出包也随附其原始许可文件。构建和导出时会核对已安装版本携带的许可。

## 其他开发工具

Playwright 及其他传递依赖用于开发或测试，各自的版权和许可仍保留在安装后的 npm 包中；精确版本与包许可标识记录于 `package-lock.json`。分发开发工具或依赖目录时，应同时携带对应包的原始许可。

本文件列出当前应用分发涉及的上游与素材，不将项目 MIT 许可证扩展为对所有第三方内容的重新授权。

# 素材许可 / Asset license

除下述第三方内容外，Office Voxel 在本仓库提供的人物、家具、环境及其程序化素材，采用与项目代码相同的 [MIT License](LICENSE)。

## 适用范围

- 人物身份与外观配置、程序化人物模型、动作和表情实现。
- 程序化家具、环境、像素贴图及其构建代码。
- `public/assets/characters/` 提供的头像 `portrait.png`、对照图 `sheet.png` 和静态模型 `model.glb`，包括当前 `doubao-00` 人物。
- 使用本项目素材代码生成并导出的上述素材。导出本身不改变本项目素材的许可；用户另外加入的内容仍按其自身许可处理。

MIT 允许使用、修改、分发、商用及将素材集成到其他项目。分发本项目素材或其重要部分时，须保留 `LICENSE` 中的版权与许可声明。仅交付素材而不交付源代码时，也应随附该声明。许可全文及免责声明以 `LICENSE` 为准。

人物设计参考来源仍保留在仓库文档中；本许可不授予第三方商标或品牌标识的权利。

## 第三方内容

- **Fusion Pixel 字体及其组成字体**保留各自的 SIL Open Font License 1.1，不改为 MIT。源码中的许可位于 `src/assets/fonts/`；网站构建与人物素材导出包中的许可位于 `licenses/fusion-pixel/`。
- **Three.js** 采用自己的 MIT 许可证，完整版权和许可声明见 `licenses/three/LICENSE`。
- **原 PixOffice 代码**保留原作者 teejoo 的版权和 MIT 许可，原声明见 `licenses/pixoffice/LICENSE`。

项目来源和开发依赖的许可说明见 [第三方声明](THIRD_PARTY_NOTICES.md)。

## 导出交付

人物素材导出包包含 `LICENSE`、`ASSET_LICENSE.md`、`THIRD_PARTY_NOTICES.md` 和 `licenses/`。`manifest.json` 中的 `license` 为 `MIT`，`counts.files` 和 `counts.bytes` 仅统计 PNG/GLB，不包含许可文件。

网站的四套独立生产构建均携带上述许可文件。网站构建仍使用 `publicDir: false`，不会因此复制人物 PNG/GLB 产物。

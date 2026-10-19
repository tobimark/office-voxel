# 人物导出产物

由 scripts/export-characters.mjs 生成；manifest.json 记录稳定外观 ID、人物身份和五布局使用关系。

28 个外观 / 84 个 PNG/GLB 文件。

- portrait.png：144 × 160 像素头像。
- sheet.png：1024 × 1024 正侧背视图与表情。
- model.glb：内嵌材质与脸部纹理的静态 glTF 2.0 快照，不包含 JavaScript 动态行为。
- 运行时由代码生成人物，不读取本目录；Vite publicDir 为 false。
- --only=portrait,sheet 或 --ids=team-00：局部更新，保留其他文件；首次请完整导出。
- --licenses-only：无需浏览器，事务更新许可和清单，保留全部 PNG/GLB 字节。
- 临时目录生成、格式/大小/哈希校验成功后替换；失败保留旧目录。

## 许可

本项目提供的 PNG/GLB 素材采用 [MIT License](LICENSE)，包括 doubao-00。商用、修改与再分发须保留版权和许可声明；具体范围见 [素材许可](ASSET_LICENSE.md)。字体等第三方内容继续适用各自许可，完整声明见 [第三方声明](THIRD_PARTY_NOTICES.md) 与 licenses/。清单中的文件数与字节数仅统计 PNG/GLB。

仓库内的导出和人物使用说明详见 docs/character-assets.md。

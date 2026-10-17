# 人物导出产物

由 scripts/export-characters.mjs 生成；manifest.json 记录稳定外观 ID、人物身份和五布局使用关系。

27 个外观 / 81 个 PNG/GLB 文件。

- portrait.png：144 × 160 像素头像。
- sheet.png：1024 × 1024 正侧背视图与表情。
- model.glb：内嵌材质与脸部纹理的静态 glTF 2.0 快照，不包含 JavaScript 动态行为。
- 运行时由代码生成人物，不读取本目录；Vite publicDir 为 false。
- --only=portrait,sheet 或 --ids=team-00：局部更新，保留其他文件；首次请完整导出。
- 临时目录生成、格式/大小/哈希校验成功后替换；失败保留旧目录。

详见 docs/character-assets.md。

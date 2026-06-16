# 图鉴社 Prompt Template

这是当前默认使用的百科图鉴 prompt 模板目录。

## 目录结构

```text
main-template.md
categories/
  city.md
  animal.md
  pet.md
  plant.md
  person.md
  festival.md
  food.md
  historical-event.md
  tech-concept.md
  object.md
  natural-phenomenon.md
examples/
  batch.json
```

## 使用方式

生成图片时必须直接使用归档 prompt 文件的完整原文。
不要压缩、摘要、删减、改写、重新组织或临时追加说明。
如果需要改 prompt，先重新生成并覆盖归档文件，再用新文件生成图片。

## 强制执行 (code-level)

这段话不只是"建议" — 它被 `scripts/build-prompt.mjs` 强制执行:

- 脚本通过 `child_process.execFile` 被 wizard (`src/app/api/generate/route.ts`)
  调用, 不允许 inline rewrite。脚本本身读取文件原文字节, 不做"摘要"
  或"压缩"。
- 脚本有 slot placeholder 检测 (主题:【填写主题】 + 类型:【城市 / 动物 / ...】),
  如果模板格式变了, 脚本**直接 bail 报错**, 不会静默把半填的 prompt 发给模型。
- 这个规则也被 `AGENTS.md § Hard Rules · H1` 记录, 任何 AI 助手(包括我自己)
  在这个项目里都不允许绕过。

**改 prompt 的唯一合法路径**:

1. 直接编辑 `main-template.md` 或 `categories/<kind>.md`
2. 提交 commit (让归档文件成为新的 source of truth)
3. 下次 wizard 调用自动用新模板 — **不需要改任何代码, 不需要 rebuild**

禁止:在 route.ts / `buildPrompt()` / 任何代码里 inline 写新版本 prompt。
禁止:在 chat 回复里 paraphrase prompt 文本。
禁止:为了"省 token"压缩模板。

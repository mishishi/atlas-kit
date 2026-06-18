# 图鉴社 Prompt Template

这是当前默认使用的百科图鉴 prompt 模板目录。

## 目录结构

```text
main-template.md
categories/
  # === 老 12 kind (R24 起, 跟 cards.json 实际 kind 对齐) ===
  animal.md
  city.md
  pet.md
  plant.md
  person.md
  festival.md
  food.md
  historical-event.md
  object.md
  natural-phenomenon.md
  technology.md          # (2026-06-17 之前叫 tech-concept, R28 改名跟 noun 模式对齐)
  other.md               # (R28 新增, 兜底分类)
  # === R30 补全的 12 个新 kind (cards.json 暂无 entry, --include-empty 才考虑) ===
  architecture.md
  artwork.md
  book.md
  chemical-element.md
  country.md
  disease.md
  movie.md
  mythology.md
  profession.md
  space-object.md
  sport.md
  vehicle.md
examples/
  batch.json
```

合计 **24 个 kind 模板**,跟 `prompt-template/categories/` 实际
文件一致。`data/cards.json` 实际在用的 kind 是 12 个老 + 1 个
architecture(共 13 个),其余 11 个新 kind 是 R30 后预埋,等后续
`scripts/plan-new-cards.mjs --include-empty` 启用。

## 使用方式

生成图片时必须直接使用归档 prompt 文件的完整原文。
不要压缩、摘要、删减、改写、重新组织或临时追加说明。
如果需要改 prompt，先重新生成并覆盖归档文件，再用新文件生成图片。

## 强制执行 (code-level)

这段话不只是"建议" — 它被 `scripts/build-prompt.mjs` 强制执行:

- 脚本通过 `child_process.execFile` 被两个 client 调用:
  - `src/app/api/generate/route.ts` (wizard, `PROMPT_VERSION` env
    默认 `v2`)
  - `scripts/generate-card.mjs` (R30 新增, CLI, 无 rate limit,
    批量生产用)
  不允许 inline rewrite。脚本本身读取文件原文字节, 不做"摘要"
  或"压缩"。
- 脚本有 slot placeholder 检测 (Theme: [主题] / Category: [分类]),
  如果模板格式变了, 脚本**直接 bail 报错**, 不会静默把半填的 prompt 发给模型。
- 这个规则也被 `AGENTS.md § Hard Rules · H1` 记录, 任何 AI 助手(包括我自己)
  在这个项目里都不允许绕过。

**改 prompt 的唯一合法路径**:

1. 直接编辑 `main-template.md` 或 `categories/<kind>.md`
2. 提交 commit (让归档文件成为新的 source of truth)
3. 下次 wizard 调用 / generate-card.mjs 调用自动用新模板 — **不需要改任何代码, 不需要 rebuild**

禁止:在 route.ts / `buildPrompt()` / 任何代码里 inline 写新版本 prompt。
禁止:在 chat 回复里 paraphrase prompt 文本。
禁止:为了"省 token"压缩模板。

## R30 pipeline 集成

`scripts/plan-new-cards.mjs` 用 24 个 kind 名字匹配 `categories/` 目录。
任何新加的 kind 模板, 都需要在 `KIND_CANDIDATES` 字典里加候选主题
(5-8 个), 否则 `plan-new-cards.mjs` 不会为这个 kind 生成主题。

`generate-card.mjs` 调 `build-prompt.mjs` 时, kind 参数对应
`categories/<kind>.md` 文件名(strip `.md` 后缀)。如果 `kind`
对应的 .md 文件不存在, 脚本 bail 报错, 不会 fallback。

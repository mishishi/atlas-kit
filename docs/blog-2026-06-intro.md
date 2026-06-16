# 60 张图鉴, 5 天做完

2026 年 6 月, 我用 5 天做完了图鉴社 Atlas Kit 的第 60 张图鉴。

第一张是马犬, 最后一张是三星堆。

做这个项目之前, 我对「图鉴」的理解很窄——小时候翻过《动物图鉴》《矿石收藏》, 那种带手绘插图、有固定版式、每页讲透一个物种的小册子。后来长大, 这种东西基本消失了。网上要么是百科词条 (字多图乱), 要么是小红书帖子 (图好看但没法系列化)。

我想把「图鉴」这件事重新做一遍, 但不想做老式的纸面 PDF。
想做网站, 因为可以持续更新、可以加交互、可以让我自己随时翻。

下面是这个项目的一些想法, 也算一个小型复盘。

## 第一天到第二天: 把 60 张先铺满

第一天 (6-12) 我 commit 了一个 MVP, 只有 3 个系列占位 + 首页 + 详情页骨架。第二天下午跑了一个 batch 脚本, 把 60 张图鉴铺满了。

60 张不是我想做多少做多少, 是结构决定: 12 种主题类型 × 5 张 = 60, 整整齐齐。结构是 5 个系列 (宠物品种 / 野生动物 / 城市百科 / 节日岁时志 / 图鉴杂俎), 后一个系列大杂烩装剩下的 35 张 (植物 / 食物 / 器物 / 科技 / 现象 / 历史 / 人物 / 其他)。

跑完 batch 后我用 sharp 给每张图鉴生成 3 层图: 384w 缩略图 / 600w 主图 / 1024w 高清原图。听起来合理, 但执行的时候连续翻了 3 次车:

1. `resize-cards.mjs` 写了 `withoutEnlargement: true`, 想做 1536→1024 缩放, sharp 直接跳过了 (它不会放大, 也不会从大图缩到比原图小的尺寸除非显式说)。
2. 60 张 -full.png 平均 5.5 MB, 总共 330 MB, Vercel Hobby 上限 100 MB, 部署那一刻就 502。
3. 我又写了一遍 `rewrite-image-full.mjs`, 临时把 `image_full` 字段指向 600w 的 -card.png 蒙混过关, 假装图鉴有 1024w。

最后一版正经方案是 `reencode-full-webp.mjs`——重新 sharp 编码, 60 张 PNG → 1024w WebP q90, 总共 19 MB。这才把 100 MB 红线过了。

> 教训: 写脚本的时候一定要确认每个 sharp 参数的实际行为, 别想当然。我在这条上浪费了半天。

## 第三天到第四天: 内容质量跟知识图谱

60 张图铺完后, 站点的样子有了, 但内容很空——只有标题 + 一行描述 + 一张图。

我用了两天把内容补全:

- **历史节点**: 60/60 张卡每张 5-8 条时间线节点。我用 mmx (MiniMax M2.7) AI 批量写了一半, 另一半 (9 张, 三星堆 / 三体 / 杜甫 / 清明 / 等) hand-write, 因为 M2.7 拒答某些敏感历史题材, 或者它的 schema 理解老出错。
- **参考来源**: 60/60 张每张 2-4 条, 同样 AI 批量, 1 张手写。Wikipedia 中文 / 百度百科 / 中国知网 / 官方机构。
- **引文 + 轶事**: 60/60 张每张 1 句引文 + 1 段冷知识。
- **误解 / 事实对照**: 10/60 张卡 (Round 9 加), 10 张卡片手写 myth + fact, 比如拉布拉多那张写的是「myth: 拉布拉多就是金毛. fact: 是两个品种. 拉布拉多毛短直, 毛色有黑/黄/巧克力三种; 金毛只有金色系, 毛长波浪. 起源也不同.」— 这种内容 AI 写得稀烂 (容易输出「部分对, 部分错」), 必须手写。

最值钱的工程是**反向引用 + 内联 link**:

每张卡的 `description` / `tagline` / `subtitle` 都过一遍其他 59 张的 title, 命中的话自动在 detail 页生成两个东西:

1. inline link: 比如「拉布拉多寻回犬」这几个字直接链到 /cards/labrador-retriever
2. reverse-ref section: 「提到了「拉布拉多」的图鉴」清单

实现没什么花哨: 每次 SSR 请求时 `for` 循环跑 60 × 几百字段的扫描, 完全 O(n²) 但 60 × 60 × 几百 = 几百万字符串操作, 跑下来不到 10ms。不需要预计算索引。

43/60 张有至少 1 个内联 link, 22/60 张有至少 1 个反向引用。我后来发现反向引用比正向推荐 (同类/同系列) **有用得多**——前者是「这张卡在别处被怎么用」, 后者是「这张卡和那张像」, 前者信息密度高得多。

## 第五天: 5 轮 design audit

6-16 那天我一口气跑了 5 轮 design audit, 每次用不同的 lens 看同一个站:

- **Round 8** (`3bb29b6`): taste-skill + ui-ux-pro-max 全站 audit, 5 个 critical + 8 个 important + 7 个 nice-to-have, 19 files +989/-427 一笔 commit 改完。最大的一项是给 `<head>` 加了一段 inline bootstrap script 解决主题切换的 FOUC (served HTML 时 theme=light, React 接管时切到 user preference, 中间闪一下白/黑)。
- **Round 9** (`4a34807`): myth/fact 微段, 上面提到。
- **Round 12** (`3d52204`): impeccable + landing-page-generator 联合 audit, 6 处 polish。最大的 fix 是 `/cards` 加了 `?tag=` 无 `?kind=` 时的"全站标签过滤"模式——之前这个 query string 被默默忽略。
- **Round 13** (`bcfa9cd`): `/all` view 2 (按系列) 拆了 3px 的 side-stripe border, 换成 8px accent dot + accent-colored h3——impeccable 明确禁 side-stripe 彩色 accent 在 card 上, 是 AI slop tell 之一。
- **Round 14** (`cc921f4`): `/series` tab buttons 从 36px 加到 44px, 满足 WCAG 2.5.5 touch target。`/about` em-dash 换成逗号。
- **Round 16** (`f75e2cb`): `/` home hero collage 5 张图之前 `aria-hidden`, 屏幕阅读器完全感知不到——SR 用户看不到首页主 CTA。修。

5 轮 audit 加起来 30+ 项 fix, 站点从「有想法的草稿」拉到了「可以发布的版本」。

中间还夹了一个 Round 15 (5a5baf0): 给 `/changelog` 加了 5 个 site milestone entry (MVP 上线 / 60 张齐 / 首轮设计 review / 6 项 roadmap 完成 / 5 轮 polish), 让 changelog 不只是 per-card 收录流水, 而是讲"项目 5 天怎么从 0 到能发"的故事。

## 一些真实存在但容易忽略的事

**1. slugs 全部 English, 不是中文。**

60 张卡片的内部 ID 全是 kebab-case English (labrador-retriever / sanxingdui / suzhou-gardens)。这不是为了 SEO, 是因为早期 (commit `2a24636`) 我用中文 slug 当文件名 (`<topic>.png`), 撞了一堆编码问题——Windows 路径 / Next.js routing / Vercel CDN 缓存全踩。后来 4a34807 那批 commit 把所有中文 slug 改 ASCII-safe, 整套数据干净了不少。代价是: 数据库里 `slug: labrador-retriever` 但 `title: 拉布拉多`, 两个字段都得维护, 偶尔 (但极偶尔) 会写出不一致的代码。

**2. mavis CLI 子进程坑过我 3 次。**

Next.js 跑 wizard 调 mavis MCP, 我最初 spawn `mavis.cmd` 调 CLI——子进程一直返回 "No Mavis daemon running", 即使 daemon 端口 15321 健康、PowerShell session 同样代码 100% 通。

试了 3 套方案:
- 去掉 `shell: true` → spawn EINVAL (.cmd 不是 PE)
- 直接调 `MiniMax Code.exe` (Electron) + ELECTRON_RUN_AS_NODE=1 → 还是 "No daemon"
- 直接调 `node.exe + cli.js` 绕开 Electron sandbox → 还是 "No daemon"

最终正解是 **绕开 mavis CLI 整个, 直接 fetch daemon HTTP**:

```ts
const res = await fetch("http://127.0.0.1:15321/mavis/api/mcp/call", {
  method: "POST",
  body: JSON.stringify({ server: "matrix", tool: "matrix_generate_image", arguments: ... }),
});
```

子进程不需要 spawn, 一个 HTTP 请求搞定。**任何 Next.js 项目想从 mavis daemon 调 MCP tool, 都别 spawn CLI, 直 fetch**。我在 MEMORY 里专门落了这条, 下次再写类似代码直接查。

**3. dev + build 抢 `.next/` 抢了我 3 次。**

`next build` 写 `.next/server` + `.next/static` 满文件, 但 dev 进程的 HMR 内存里还引用老的 chunk 名字 (比如 `948.js`), 文件系统里的 chunk 已经换成新的, dev 找不到 → 6+ 个 404 (`main-app.js`, `app-pages-internals.js`, `chunks/app/page.js` 等), 页面空白。

每次我跑 build 验证 → dev 立刻 404。每次我跟用户说「修完了, 刷新看看」, 用户刷完看到一片空白。

教训: build 验证前, **先告诉用户「下一步 dev 要重启」**, 别让我自己被 3 次打脸后才说。

## 60 张不是终点

现在图鉴社有 60 张图鉴, 5 个系列, 14 个页面路由 + 60 张打印 PDF 路由 + 1 个 API。

实际上下一步我看三个方向, 都不一定做:
- **扩量**:再加 5 张卡补一个类型 (凑齐 13 类型 × 5 = 65)
- **深做**:把现在某张卡的字段扩到 12 (三星堆那张值得加 "出土分布" "文物清单")
- **改架构**:把 JSON 换成 SQLite, 让用户能投稿

第三个最难也最值。如果哪天做了, 大概会写一篇新文章。

---

如果你也想自己做一份图鉴, 不一定要用 AI。Excel + 模板 + 自己画也挺好。
AI 是加速器, 不是前提。

如果想看现成的, 站点在 <https://atlas-kit-six.vercel.app>。每张卡可以打印成 PDF。

发现错误可以邮件我, 每个图鉴页底部都有入口。
或者你也可以照着 README 自己 clone 跑一遍。

— mishishi
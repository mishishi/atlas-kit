# 图鉴社 · Atlas Kit

> **391 张视觉图鉴组成的中文百科**，跨时间、空间、分类三个维度。AI 辅助内容、人工校订。Anti-RPG 定位：不卖萌、不站台、不喊口号，只把每个主题的真相讲清楚。

[![live](https://img.shields.io/badge/live-atlas--kit--six.vercel.app-blue)](https://atlas-kit-six.vercel.app) [![next](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org) [![license](https://img.shields.io/badge/license-MIT-green)](LICENSE) [![cards](https://img.shields.io/badge/cards-391%2F391-gold)](https://atlas-kit-six.vercel.app/cards) [![pwa](https://img.shields.io/badge/PWA-installable-success)](https://atlas-kit-six.vercel.app/launch)

---

## 🎉 1.0 Launch

**图鉴社 v1.0 上线** —— 391 张图鉴，13 个系列，12 个分类。

👉 **[**`/launch` — Launch Page**](https://atlas-kit-six.vercel.app/launch)** — 完整项目介绍 + 视觉 showcase
👉 **[**GitHub 仓库**](https://github.com/mishishi/atlas-kit)** — 源码 + 路线图 + Issue / Discussion

> 想 5 分钟了解项目做什么 + 为什么做 → 直接看 [Launch Page](https://atlas-kit-six.vercel.app/launch)，比 README 信息密度高。

---

## 这是什么

**图鉴社 (Atlas Kit)** 是一份持续生长的中文科普图鉴集，每张图鉴围绕一个主题（犬种 / 古城 / 节日 / 历史现象 / 音乐 / 动漫 / 电影 / 建筑 / 工艺 …）按 9 个固定模块整理：主视觉、基础档案、外观特征、性格习性、养护建议、适配评分、优缺点对比、趣味冷知识、健康风险。

跟常见"AI 生图工具"不同，我们用**固定的字段骨架 + 任意主题**保证：
- **可系列化**：同一类（比如"宠物品种"）的 5 张图鉴视觉一致、可对比
- **可收藏**：每张都是 9 模块完整呈现，不是飘忽的单图
- **可复用**：模块拆得细，改字段比改 prompt 快

整套不写"稀有度 / 星级 / SSR"，是给真心想了解一个主题的人准备的，不是给抽卡用户准备的。

## 391 张图鉴 · 12 类型 · 13 系列

| 系列 | 张数 | 主题类型 |
|---|---|---|
| 宠物品种图鉴 (pet-breed-guide) | 9 | pet |
| 野生动物图鉴 (wild-fauna-atlas) | 15 | animal |
| 城市百科图鉴 (city-encyclopedia) | 18 | city |
| 节日岁时志 (festival-almanac) | 17 | festival |
| 音乐原声集 (soundtracks-atlas) | 30 | music |
| 动漫作品馆 (anime-works-atlas) | 30 | anime |
| 电影海报展 (movie-poster-gallery) | 31 | movie |
| 美食地标 (culinary-corner) | 32 | food |
| 古今历史 (history-deck) | 30 | history |
| 工艺百草 (craft-and-botanical) | 31 | plant / object |
| 建筑珍宝 (architecture-treasury) | 11 | architecture |
| 自然现象 (natural-phenomena) | 10 | phenomenon |
| 图鉴杂俎 (atlas-miscellany) | 127 | other / person / tech |

每张图鉴自带：
- 384w 缩略图 + 600w 主图 + 1024w 高清原图（三层图像，首屏快、点开清）
- 5-8 个历史节点（沿革时间线）
- 2-4 条参考来源（百度百科 / 维基 / 论文 / 官方）
- 1 句引文 + 1 段轶事 + (10 张) 误解/事实对照
- 同类推荐 + 同系列 + 你可能也会喜欢 + 反向引用（知识图谱）
- 部分图鉴带地理坐标（地图视图）

## 60 秒上手

### 环境要求
- Node.js 20+
- 一个能调 `matrix_generate_image` 的账号（可选，只有 `/create` 生成新图鉴才需要）

### 本地跑

```bash
git clone https://github.com/mishishi/atlas-kit
cd atlas-kit
npm install
cp .env.local.example .env.local       # 按需改 SITE_URL / IMAGE_PROVIDER
npm run dev
```

打开 <http://localhost:3000>。391 张图鉴 + 16 个页面路由 + 391 张打印 PDF 路由都已预渲染，纯静态访问，无需任何外部服务（图片走 CloudBase CDN）。

### 不需要 AI 也能跑
如果只想看 391 张已有的图鉴，**完全不需要配置 IMAGE_PROVIDER**。生成新图鉴（`/create` 向导）才需要。如果暂时不配：
- `/create` 步骤 4 会显示"图生成服务未配置"错误，但其它 16 个页面全部正常
- 生产部署可以干脆把 `/create` 路由 disable

### 生成新图鉴（可选）
需要 [mavis daemon](https://github.com/) 跑在 `http://127.0.0.1:15321`，
详见 `.env.local.example`。

## 路由概览（16 page + 391 print + 1 API）

| 路由 | 作用 |
|---|---|
| `/` | 首页：hero collage + 5 系列 + 同类 + 热门 |
| `/cards` | 391 张图鉴总览（支持 `?kind=` `?tag=` 过滤） |
| `/cards/[slug]` | 图鉴详情（10 个段落：hero / 引文 / 轶事 / 历史 / 同类 / 同系列 / 反向引用 / 修订 / 来源 / 延伸阅读） |
| `/series` / `/series/[slug]` | 13 个系列列表 + 详情（3 种 layout family 旋转） |
| `/map` | 地理坐标图鉴的 Leaflet 地图 |
| `/timeline` | 按月倒序排列的收录时间线 |
| `/all` | 3 轴索引：按字数 / 按系列 / 按类型 |
| `/search` | fuse.js 模糊搜索（title 3x / tag 1x 加权） |
| `/random` | 随机一张 + 同系列再抽 + 24-kind 过滤 |
| `/graph` | 知识图谱（image-first，673 条边，391 个节点） |
| `/favorites` | localStorage 收藏夹（跨 tab 同步） |
| `/about` | 项目介绍 + 设计原则 + 技术栈 |
| `/changelog` | 收录 / 修订 / 站点里程碑 三类事件流 |
| `/launch` | **v1.0 launch 页面**（独立 marketing surface） |
| `/not-found` | 404：6 张推荐图鉴 + 6 个热门标签 |
| `/print/cards/[slug]` | 391 张 A4 打印视图（`Cmd+P` → "Save as PDF"） |
| `/api/generate` | 向导后端：调用 mavis daemon MCP `matrix_generate_image` |

## 技术栈

- **Next.js 14.2** App Router + React Server Components（391 张图鉴纯静态 SSG）
- **Tailwind CSS** + 设计 token + 主题切换（light / dark / system）
- **shadcn/ui 风格** 原生组件，无重型 UI 库
- **Lucide Icons**（零 emoji）
- **Leaflet + OpenStreetMap**（地图视图）
- **Fuse.js**（模糊搜索）
- **CloudBase CDN**（图片 100% CDN 化，public/ 不超 5MB）
- **PWA**（手机可装，离线可用，service worker 缓存）
- **AI 生图**：`matrix_generate_image` via mavis MCP
- **数据存储**：`data/cards.json`（单文件，391 条 × 25 字段，类型安全）

## 数据

所有图鉴数据在 [`data/cards.json`](./data/cards.json)（391 条 × 25 字段），类型定义在 [`src/lib/types.ts`](./src/lib/types.ts)。字段包括历史节点、参考来源、地理坐标、修订记录、误解/事实对照等。

新增图鉴可以直接编辑 `data/cards.json`，或者走 `/create` 向导 AI 生成。

## 设计原则

1. **模块化**：每张图鉴都是 9 个固定字段的组合，不是 AI 随机排版
2. **字段槽位约束**：每个字段有明确的字数 / 类型，避免重复或缺失
3. **风格锚点**："博物馆图鉴 / 知识卡 / 杂志感" 这套调性反复强化
4. **Anti-RPG**：不写稀有度 / 星级 / 史诗 / SSR / 雷达图
5. **纯中文输出**：除拉丁学名外，所有文字必须简体中文
6. **可访问性优先**：touch target ≥ 44px，焦点可见，屏幕阅读器友好
7. **真实数据，不 AI 幻觉**：每个事实都有参考来源链接，可在卡片页「参考来源」段验证

## 部署

[Vercel Hobby](https://vercel.com) 免费计划即可，公开 bundle < 5 MB（图片全 CDN），在 100 MB 上传上限内非常安全。
完整 walkthrough 在 [`docs/vercel-deploy.md`](./docs/vercel-deploy.md)。

```bash
# 部署到 Vercel CLI（可选，UI 导入更直观）
npm i -g vercel
vercel login
vercel --prod
```

部署后需设置的环境变量：
- `SITE_URL` — 生产 URL（影响 sitemap / OG image / metadataBase）
- `IMAGE_PROVIDER` — `matrix` / `minimax` / `openai`
- `MAVIS_DAEMON_URL` — mavis daemon endpoint
- `NEXT_PUBLIC_SITE_URL` — 同 `SITE_URL`，客户端用
- `NEXT_PUBLIC_SITE_AUTHOR_EMAIL` — 「发现错误?告诉我们」邮件链接
- `TENCENT_SECRET_ID` / `TENCENT_SECRET_KEY` / `TENCENT_CLOUDBASE_ENV` — CloudBase CDN 凭证

## 文档导航

`docs/` 目录下的所有设计稿、部署说明、运维文档都在这里：

| 文档 | 用途 |
|---|---|
| [`docs/launch-page-spec.md`](./docs/launch-page-spec.md) | Launch Page 设计 spec（cinematic editorial direction） |
| [`docs/vercel-deploy.md`](./docs/vercel-deploy.md) | Vercel 部署 5 步走（含 Cloudflare Tunnel 思路） |
| [`docs/design-audit-2026-06-16.md`](./docs/design-audit-2026-06-16.md) | Round 8 design taste-skill + ui-ux-pro-max 全站审查（20 项发现 + 评分） |
| [`docs/design-review-2026-06-14.md`](./docs/design-review-2026-06-14.md) | Round 8 之前的初版审查（touch target / em-dash / hero 节律） |
| [`docs/scripts-reference.md`](./docs/scripts-reference.md) | 16 个 `scripts/*.mjs` 的完整使用文档（上手顺序 / 幂等性 / 参数 / troubleshooting） |
| [`docs/blog-2026-06-intro.md`](./docs/blog-2026-06-intro.md) | 项目介绍博文 v4（真相版, 约 1900 字） |

想改脚本流程 / 跑 AI 草稿 / 压图：从 [`docs/scripts-reference.md`](./docs/scripts-reference.md) 开始。

## 贡献

个人 side project，**当前不接外部投稿**。但欢迎：
- ⭐ Star / Watch 关注更新
- 🐛 Issue 报告错别字、事实错误、a11y bug
- 💡 Discussion 提建议（新类型 / 新模块 / 新视图）

发现错误？每个图鉴页底部都有「勘误」入口，直达邮件。

## License

MIT.

---

项目内部知识（完整 schema、脚本、dev quirks、Round notes）在 [AGENTS.md](./AGENTS.md)。
更新历史在 [`CHANGELOG.md`](./CHANGELOG.md) 和 [`/changelog`](https://atlas-kit-six.vercel.app/changelog) 站点页。
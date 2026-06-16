# 百科图鉴 / Atlas Kit

> 一个 60 张视觉图鉴组成的中文百科,跨时间、空间、分类三个维度。AI 辅助内容,
> 人工校订。Anti-RPG 定位:不卖萌、不站台、不喊口号,只把每个主题的真相讲清楚。

![live](https://img.shields.io/badge/live-atlas--kit--six.vercel.app-blue) ![next](https://img.shields.io/badge/Next.js-14.2-black) ![license](https://img.shields.io/badge/license-MIT-green) ![cards](https://img.shields.io/badge/cards-60%2F60-gold)

## 这是什么

**百科图鉴** 是一份持续生长的中文科普图鉴集,每张图鉴围绕一个主题(犬种 / 古城 / 节日 / 历史现象 / 科技概念 / 自然生态)按 9 个固定模块整理:
主视觉、基础档案、外观特征、性格习性、养护建议、适配评分、优缺点对比、趣味冷知识、健康风险。

跟常见"AI 生图工具"不同,我们用**固定的字段骨架 + 任意主题**保证:
- **可系列化**:同一类(比如"宠物品种")的 5 张图鉴视觉一致、可对比
- **可收藏**:每张都是 9 模块完整呈现,不是飘忽的单图
- **可复用**:模块拆得细,改字段比改 prompt 快

整套不写"稀有度 / 星级 / SSR",是给真心想了解一个主题的人准备的,不是给抽卡用户。

## 60 张图鉴 · 12 类型 · 5 系列

| 系列 | 张数 | 主题类型 |
|---|---|---|
| 宠物品种图鉴 | 5 | pet |
| 野生动物图鉴 | 5 | animal |
| 城市百科图鉴 | 5 | city |
| 节日岁时志 | 5 | festival |
| 图鉴杂俎 | 35 | plant / food / object / tech / phenomenon / history / person / other |

每张图鉴自带:
- 600w 主图 + 384w 缩略图 + 1024w 高清原图(三层图像,首屏快、点开清)
- 5-8 个历史节点(沿革时间线)
- 2-4 条参考来源(百度百科 / 维基 / 论文 / 官方)
- 1 句引文 + 1 段轶事 + (10 张)误解/事实对照
- 同类推荐 + 同系列 + 你可能也会喜欢 + 反向引用(知识图谱)
- 12 个城市的地理坐标(地图视图)

## 60 秒上手

### 环境要求
- Node.js 20+
- 一个能调 `mmx` 或 OpenAI 的账号(可选,只有 `/create` 生成新图鉴才需要)

### 本地跑

```bash
git clone https://github.com/mishishi/atlas-kit
cd atlas-kit
npm install
cp .env.local.example .env.local       # 按需改 SITE_URL / IMAGE_PROVIDER
npm run dev
```

打开 <http://localhost:3000>。60 张图鉴 + 14 个页面路由 + 60 张打印 PDF 路由都已
预渲染,纯静态访问,无需任何外部服务。

### 不需要 AI 也能跑
如果只想看 60 张已有的图鉴,**完全不需要配置 IMAGE_PROVIDER**。生成新图鉴
(`/create` wizard) 才需要。如果暂时不配:
- `/create` 步骤 4 会显示「图生成服务未配置」错误,但其它 14 个页面全部正常
- 生产部署可以干脆把 `/create` 路由 disable

### 生成新图鉴(可选)
需要 [mavis daemon](https://github.com/) 跑在 `http://127.0.0.1:15321`,
或者直连 MiniMax / OpenAI 的 API。详见 `.env.local.example`。

## 路由概览(14 page + 60 print + 1 API)

| 路由 | 作用 |
|---|---|
| `/` | 首页:hero collage + 5 系列 + 同类 + 热门 |
| `/cards` | 60 张图鉴总览(支持 `?kind=` `?tag=` 过滤) |
| `/cards/[slug]` | 图鉴详情(10 个段落:hero / 引文 / 轶事 / 历史 / 同类 / 同系列 / 反向引用 / 修订 / 来源 / 延伸阅读) |
| `/series` / `/series/[slug]` | 5 个系列列表 + 详情(3 种 layout family 旋转) |
| `/map` | 12 个地理坐标图鉴的 Leaflet 地图(支持搜索) |
| `/timeline` | 按月倒序排列的收录时间线 |
| `/all` | 3 轴索引:按字数 / 按系列 / 按类型 |
| `/search` | fuse.js 模糊搜索(title 3x / tag 1x 加权) |
| `/random` | 302 跳到随机一张 |
| `/create` | 4 步生成向导(主题 → 系列 → 调色 → 生图) |
| `/about` | 项目介绍 + 设计原则 + 技术栈 |
| `/changelog` | 收录 / 修订 / 站点里程碑 三类事件流 |
| `/not-found` | 404:6 张推荐图鉴 + 6 个热门标签 |
| `/print/cards/[slug]` | 60 张 A4 打印视图(`Cmd+P` → "Save as PDF") |
| `/api/generate` | 向导后端:调用 matrix MCP `matrix_generate_image` |

## 技术栈

- **Next.js 14.2** App Router + React Server Components(60 张图鉴纯静态 SSG)
- **Tailwind CSS** + 设计 token + 主题切换(light / dark / system)
- **shadcn/ui 风格** 原生组件,无重型 UI 库
- **Lucide Icons**(零 emoji)
- **Leaflet + OpenStreetMap**(地图视图,12 张带坐标图鉴)
- **Fuse.js**(模糊搜索)
- **Sharp**(三层图像 resize,启动时生成 thumb/card/full)
- **AI 生图**:`matrix` (mavis MCP) / `minimax` / `openai` 三选一

## 数据

所有图鉴数据在 [`data/cards.json`](./data/cards.json)(60 条 × 25 字段),类型定义在
[`src/lib/types.ts`](./src/lib/types.ts)。字段包括历史节点、参考来源、地理坐标、
修订记录、误解/事实对照等。

新增图鉴可以直接编辑 `data/cards.json`,或者走 `/create` 向导 AI 生成。

## 设计原则

1. **模块化**:每张图鉴都是 9 个固定字段的组合,不是 AI 随机排版
2. **字段槽位约束**:每个字段有明确的字数 / 类型,避免重复或缺失
3. **风格锚点**:"博物馆图鉴 / 知识卡 / 杂志感" 这套调性反复强化
4. **Anti-RPG**:不写稀有度 / 星级 / 史诗 / SSR / 雷达图
5. **纯中文输出**:除拉丁学名外,所有文字必须简体中文
6. **可访问性优先**:touch target ≥ 44px,焦点可见,屏幕阅读器友好
7. **真实数据,不 AI 幻觉**:每个事实都有参考来源链接,可在卡片页「参考来源」段验证

## 公众号

> [!NOTE]
> 跟公众号「**图鉴社**」(placeholder,待替换)同步更新。每张图鉴的创作过程、
> 设计取舍、踩坑实录,会写成短文发在那里。README 不会重复内容,只放项目骨架。

扫码关注 / 搜公众号名:**图鉴社**(待替换)

![公众号二维码占位](./docs/qrcode-placeholder.svg)
*(替换成你真实的公众号二维码图片,放在 `docs/qrcode.png`,README 这里改路径)*

## 部署

[Vercel Hobby](https://vercel.com) 免费计划即可,公开 bundle 42 MB,在 100 MB 上传上限内。
完整 walkthrough 在 [`docs/vercel-deploy.md`](./docs/vercel-deploy.md)。

```bash
# 部署到 Vercel CLI(可选,UI 导入更直观)
npm i -g vercel
vercel login
vercel --prod
```

部署后需设置的环境变量:
- `SITE_URL` — 生产 URL(影响 sitemap / OG image / metadataBase)
- `IMAGE_PROVIDER` — `matrix` / `minimax` / `openai`
- `MAVIS_DAEMON_URL` — mavis daemon endpoint(Cloudflare Tunnel 推荐)
- `NEXT_PUBLIC_SITE_URL` — 同 `SITE_URL`,客户端用
- `NEXT_PUBLIC_SITE_AUTHOR_EMAIL` — 「发现错误?告诉我们」邮件链接

## 贡献

个人 side project,**当前不接外部投稿**。但欢迎:
- ⭐ Star / Watch 关注更新
- 🐛 Issue 报告错别字、事实错误、a11y bug
- 💡 Discussion 提建议(新类型 / 新模块 / 新视图)

发现错误?每个图鉴页底部都有「勘误」入口,直达邮件。

## License

MIT.

---

项目内部知识(完整 schema、脚本、dev quirks)在 [AGENTS.md](./AGENTS.md)。
更新历史在 [`/changelog`](https://atlas-kit-six.vercel.app/changelog) 站点页。
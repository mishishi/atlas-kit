# 5 周做出 391 张图鉴：一个 side project 的工程手记

> 不讲观点，只讲怎么做出来的 —— 功能、难题、技术点。

![cover](./blog-2026-06-launch-cover.jpg)

---

## 写在前面

5 周时间，一个 side project，业余时间做出来的网站：[atlas-kit-six.vercel.app](https://atlas-kit-six.vercel.app)。391 张图鉴、13 个系列、16 个页面路由（外加 391 张 A4 打印 PDF 路由）。代码全在 [github.com/mishishi/atlas-kit](https://github.com/mishishi/atlas-kit)，MIT。

这篇文章不打算讲什么"AI 时代内容创作的反思"，就老老实实说：我做了什么、用什么做的、过程里踩了哪些坑、怎么填的。

---

## 一、这网站到底有什么功能

我直接列功能（按用户能看到/用到的重要程度排），每个说 1-2 句具体怎么实现的。

### 1. 391 张图鉴卡，每张 9 个固定模块

`data/cards.json` 一份 JSON 文件，391 条 × 25 字段。9 个固定模块（主视觉 / 基础档案 / 外观特征 / 性格习性 / 养护建议 / 适配评分 / 优缺点对比 / 趣味冷知识 / 健康风险）是从一开始设计就定死的 —— 不会因为主题是猫还是城市就变化。

每个模块是 schema 里的一个具体字段（`description` / `history` 数组 / `tags` 数组 / `sources` 数组 / `coords` 等），types 全部在 `src/lib/types.ts` 里严格定义。加新卡的时候，要么手编辑 JSON，要么走 `/create` 向导 AI 生成。

### 2. 反向引用 + 知识图谱（`/graph`）

点开任何一张图鉴，"提到了『X』的图鉴"段会列出所有引用了这张卡的其它卡。这是 `getMentionIndex()` 在请求时扫所有卡的 `description` / `tagline` / `subtitle` 文本找出来的（43/60 张有至少 1 个反向引用，22/60 有 ≥1 个）。

`/graph` 页面把这层关系画成 image-first 力导向图：391 个节点（卡），673 条边（卡之间互引 + 共享标签），canvas 渲染。点节点进详情，hover 看邻居。

### 3. localStorage 收藏夹（`/favorites` + 全站星标）

点星标 → 加 slug 进 localStorage 的 Set。Header 右上角实时显示收藏数。`/favorites` 页列出所有收藏 + 清空按钮。

实现细节：自定义事件 `atlas-kit-favorites-changed`（同 tab 跨组件同步，native `storage` 事件不向写入 tab 触发）+ native `storage` 事件（跨 tab 同步）。SSR-safe：initial render 返回空 Set，`useEffect` 后读 storage。

### 4. /random：随机一张 + 同系列再抽

`/random` 是个 client island，sessionStorage 存最近 20 张 slug 防重复。24 个 kind 过滤 chips（URL `?kind=X` 深链，浏览器 back 工作）。Space 键重抽。3 个 action 按钮：再换一张 / 同系列再抽 / 看详情。

### 5. PWA（手机可装 + 离线访问）

`public/manifest.webmanifest` + `public/sw.js` + `src/components/sw-register.tsx`。SW 三档缓存策略：

- HTML 页面：`network-first`，网络挂了回退 SW 缓存
- `/_next/static/*` + `/fonts/*`：`cache-first`（Next.js content-hash，永久不变）
- CloudBase CDN 图：`stale-while-revalidate`

iOS Safari "添加到主屏幕" + Android Chrome install banner 都 work。

### 6. 键盘快捷键

`src/components/keyboard-shortcuts.tsx` 全局 `keydown` 监听器。`?` 打开帮助模态框，`/` focus 搜索框，`g h` / `g c` / `g s` / `g t` / `g g` / `g f` 跳路由，`s` 收藏当前卡（仅 `/cards/[slug]`）。

实现坑：listener 用 `useRef` 存 `lastG` 时间戳（不触发 effect 重绑），跟"输入框 typing 不触发"靠 `isTypingTarget` guard 区分。

### 7. /create AI 向导（4 步：主题 → 系列 → 配色 → 生图）

`src/app/api/generate/route.ts` 调 `mavis` MCP daemon（`http://127.0.0.1:15321`）的 `matrix_generate_image` 工具，全程通过 prompt 模板驱动。**prompt 模板归档在 `prompt-template/`，不在代码里**，route.ts 只是 spawn 一个 Node 脚本读模板（确保 CLI 和 wizard 用同一份 prompt，详见下文"难题 3"）。

### 8. /launch 独立 marketing 页面

`public/launch/index.html` + `public/launch/imgs/hero.jpg`，纯静态不走 Next.js App Router。这是为了以后可以从 atlas-kit repo 拆出去做独立 launch site 留个口子。

---

## 二、技术栈

| 类别 | 选型 | 备注 |
|---|---|---|
| Framework | Next.js 14.2 App Router | React Server Components 拉满 |
| Styling | Tailwind CSS + 设计 token | 浅 / 深 / system 三主题 |
| 数据 | `data/cards.json` 单文件 | 391 条 × 25 字段，TypeScript 严格 |
| 图片 CDN | 微信小程序 CloudBase | `636c-cloud1-...tcb.qcloud.la/cards/...` |
| 图片 resize | sharp + 自写脚本 | thumb 384w / card 600w / full 1024w |
| AI 生图 | matrix_generate_image via mavis MCP | daemon HTTP 直调，绕过 mmx CLI 在 Windows 的 daemon discovery 问题 |
| AI 文字 | MiniMax M2.7-highspeed via mmx | envelope retry 处理 ~30% 小 prompt undefined 返回 |
| 状态 | localStorage（favorites）+ RSC（其它） | 不用数据库 |
| 图谱 | force-graph (d3-force) + canvas | image-first 节点 |
| 搜索 | fuse.js | title 3x + tag 1x 加权 |
| 地图 | Leaflet + OSM（仅 12 张有坐标的卡） | |
| PWA | 自写 service worker（workbox 太重） | |
| 部署 | Vercel Hobby | bundle < 5MB |

整套没有 TypeScript ORM、没有 Redux、没有 GraphQL、没有 webpack 自定义配置。**Next.js 默认就够用，没引入任何重型基础设施**。

---

## 三、踩过的坑

这一段是这篇文章真正想写的。挑了 9 个最具体的"出问题 → 调查 → 修"小故事，chronological 顺序。每个尽量说清楚"症状是什么、为什么这样、最终怎么解"。

### 坑 1：mmx 在 Windows 上不工作

我开发环境是 Windows。mmx CLI（MiniMax 文字聊天工具）是个 `.ps1` 脚本，Node `child_process.execFile` 调它得 `powershell.exe -File mmx.ps1`，不能直接 `spawn("mmx")`（返回 ENOENT）。

更糟的是，mmx 偶尔会自己 daemonize，Node spawn 的子进程拿不到 stdout 直接挂。

**解决**：绕过 mmx CLI，直接 HTTP 调 MiniMax 的 `/v1/text/chatcompletion_v2` endpoint。Promise.all + env retry + envelope 解析。M2.7 的 thinking_content 经常吃掉 11k+ token 预算，prompt 必须用 M2.7-highspeed + `max_tokens: 4000+` 否则截断。

这个洞让我意识到：**AI 工具链在 Windows 上的坑比想象中多，能 HTTP 直调就别 spawn CLI**。

### 坑 2：M2.7 的 47% 幻觉率

早期我让 M2.7-highspeed 帮我写 30 张音乐卡片的 description（"这是 XX 的代表作品，风格是 XX..."）。

**结果 47% 的卡有事实错误**：把"郭静 2007"写成了"周杰伦 2005"，把"你的香气"专辑归属写错，把某张原声带的发行年份写错。

更阴险的是 M2.7 还会**伪造参考链接**，给出的 URL 经常是不存在的或者指到无关页面。

**解决**：**所有"具体作品"（音乐 / 动漫 / 电影）类卡片全部 handwrite**，AI draft + 人工核查。每个事实陈述都过维基或百度百科，每个 source URL 都要亲手点开验证。这是个慢活儿，单卡 45-90 分钟，但这是图鉴社可信度的基石。

**教训**：AI 的"幻觉率"是分布不是数字。通用领域（猫 / 山 / 城市风光）幻觉率低（<10%），但**真人真事 + 文化特定主题**幻觉率能到 40-60%。这些领域不能信 AI，必须人工。

### 坑 3：Wizard 和 CLI 用不同 prompt → 输出风格不一致

`/create` 向导和 `node scripts/build-prompt.mjs` 这两个入口一开始用了不同的 prompt 模板。Wizard 输出的图和 CLI 输出的图风格飘忽不定。

**解决**：**prompt 模板归档到 `prompt-template/` 目录**（main-template.md + categories/*.md），两边都 `cat` 文件然后 spawn 进程读。脚本加 slot 占位符检测（如果模板里还有 `【填写主题】` 这种未替换占位符，bail 出来报错而不是发送半成品 prompt）。

这之后两边输出风格就一致了。**单一来源真理 (single source of truth) 对 prompt 也适用**。

### 坑 4：Vercel Hobby 100 MB 静态上限

361 张卡（早期数）× 3 个尺寸 × PNG = 早就超 100MB。我第一版把图全放 `public/cards/` 里，build 直接 fail。

**解决**：
1. 早期用 `reencode-full-webp.mjs` 把所有 `-full.png`（5.5 MB × 60 张）转成 `-full.webp`（300 KB × 60 张）
2. 加 `.vercelignore` 排除 `public/cards/`，让所有图走 CloudBase CDN
3. 用 `next/image` 的 `unoptimized: true` 绕过 Vercel 的图像优化（CloudBase 已经给了正确的尺寸 + 格式）

这套组合下 public/ 目录 < 5MB，bundle 远低于 100MB 上限。

### 坑 5：R26 → R55 路径迁移的"删除 1173 个 redirect"

R26 我把图从 `/cards/<slug>-card.png` 迁到了 `/cards/<kind>/<slug>/<slug>-card.png`。当时加了个 `next.config.mjs` `redirects()` 把所有老路径 301 到新路径，1173 条。

R55 上 CloudBase 之后，所有 `cards.json` 都指向 CDN URL 了，老路径根本没人访问。但 `next.config.mjs` 里那 1173 条 redirect 还在，导致 `next build` 报"exceeds 1000 routes" 警告。

**解决**：删了那 1173 条 redirect（commit `c48769d`）。**副作用**：R26 之前的 share 链接 404。但这些链接发布才 2 周，没外部引用，可以接受。

**教训**：redirects() 是双刃剑，加了就要记得删。**没有持续访问的 redirect 应该定期清**。

### 坑 6：image tier sizing 的"看起来差不多但有差"

R55e 我做了个 A/B 测试：card.png (600w lossless) vs full.webp (1024w q90) 在 1280w 显示上的视觉差异。

**结果：肉眼几乎一样**。

- card.png 600w 上采样到 1280w (2.13×) → 因为是 lossless，细节都还在
- full.webp 1024w 上采样到 1280w (1.25×) → 有损压缩，但放大倍率小

两个在 1280w 显示上人眼看不出区别。但 1024w 文件是 q90 有损，长期保留不同版本会让人误以为"full 版本肯定更好"。

**解决**：**R55e 取消，没改文件**。600w lossless 用作主图，1024w lossless 用作 lightbox。接受 1024w 是更高分辨率但 display 1280w 的细节还原。

**教训**：**别为了"感觉对"做没必要的改动**。先 A/B test，没差就保持现状。

### 坑 7：ThemeToggle hydration mismatch

上线后浏览器 console 报：

```
Expected server HTML to contain a matching <rect> in <svg>.
```

ThemeToggle 是 client component，里面根据 `useTheme()` 返回的 theme 渲染 Sun / Moon / Monitor icon。Monitor icon 的 SVG 里有个 `<rect>`，Sun / Moon 没有。

**问题**：`useState(() => { const stored = localStorage.getItem("theme"); ... })` 这种 initializer pattern，server 跑返回 defaultTheme=light → Sun，client 第一次 render 跑 localStorage，如果用户存了 "system" → Monitor。两个 React 树就不一致。

**解决**：加 `mounted` flag，`useEffect(() => setMounted(true), [])` 在 mount 后才显示真实 icon。Mount 前固定显示 Sun（跟 server 渲染一致）。

但这个修复**漏了 ThemeProvider 自己**。ThemeProvider 也有同样的 `useState(() => localStorage...)` pattern，只是它包的是 `<ThemeContext.Provider>`（不发 DOM），server 和 client 的 context value 不一样 React 18 dev 的 hydration walker 会 bail 然后报一个误导性的错（"`<footer>` missing in `<div>`"，实际 footer 渲染是对的，纯粹是 upstream context value 不一致触发 bail）。

**教训**：**所有 `useState(() => ...)` initializer 里读 localStorage / Date.now() / navigator 都是 hydration trap**。保持 init SSR-safe，storage 读挪到 useEffect。R55h 修了 ThemeProvider（commit `35c4be1`）。

### 坑 8：Vercel node runtime + satori 外部 fetch = 500

预 launch checklist curl 验 `/opengraph-image` 返回 500。本地 `next start` 没事。

OG image 用 satori 渲染时里面有 4 张 card thumbnail，用 `<img src={c.image}>` 热链 CloudBase CDN。**Vercel serverless 函数 inline fetch 外部 CDN URL 失败**（timeout 或 CORS），但本地 server 有直连权限没事。

**解决**：去 4 张 thumbnail，纯文字 OG。字号加大 + 88px A logo + 状态栏 "391 张图鉴 · 12 个分类 · AI 一键生成"。视觉上仍然有冲击力（dark museum + gold accent），但 0 外部 fetch 依赖。

**教训**：**build 绿 ≠ production 绿**。`next start` 和 Vercel serverless 函数的 network 访问权限不一样，satori 这种 inline-fetch 模式在生产会炸。Pre-launch checklist 必须 curl 验生产 URL。

### 坑 9：CloudBase bucket 没 CORS header

R55g 把所有图迁到 CloudBase 之后，`/graph` 页面的 canvas 渲染里 `<img>` 拿不到图（CloudBase 没返回 `Access-Control-Allow-Origin`）。

**两条路**：
- 加 `crossOrigin = "anonymous"` → CORS 错误 390 条 console error
- 不加 `crossOrigin` → canvas tainted，`ctx.drawImage()` 抛 SecurityError

**临时方案**：不加 crossOrigin + try/catch drawImage + `img.onerror = () => {}`。Graph 节点显示成 colored circle，缩略图看不见但图谱布局正常。

**永久方案**：CloudBase 控制台 → 存储 → CORS 规则，加 atlas-kit 域名。配好之后删 try/catch，加回 `crossOrigin = "anonymous"`（commit `fadd006` 即 R55i）。

**教训**：**画布 / WebGL / Canvas 渲染的图片必须有 CORS header**。托管到对象存储要记得配。

---

## 四、写在最后

5 周里学到的最大教训不是技术细节（那些都是单点修复），而是**做内容产品的工作流**：

- **AI 是加速器，不是内容生产者**。每个事实都需要人工核查，每个图都需要人工挑，每个版式都需要人工调 prompt。这是单人 side project 能撑 391 张卡的唯一原因 —— AI 把"画"的部分从 5 分钟压到 10 秒，把"知道画什么"和"画得对不对"留给人。
- **单一来源真理对 prompt 也适用**。Wizard 和 CLI 共用 prompt 模板文件，谁都不能私自改。
- **本地 build 绿 ≠ production 绿**。Pre-launch checklist 必须 curl 验生产 URL，验 OG image / sitemap / favicon / 各种路由。
- **hydration 错误经常是上游 context value 触发的下游误报**。"footer missing in div" 的真凶可能是 ThemeProvider 的 useState 初始化读 localStorage。

如果对项目感兴趣：

- 站点：[atlas-kit-six.vercel.app](https://atlas-kit-six.vercel.app)
- Launch 页面：[atlas-kit-six.vercel.app/launch](https://atlas-kit-six.vercel.app/launch)
- 源码：[github.com/mishishi/atlas-kit](https://github.com/mishishi/atlas-kit)（MIT，Issues / Discussions 都开）

代码量、文件数、commit 数都不大（核心源码 < 10k 行），有兴趣翻代码的话从 `src/lib/data.ts` 开始。

---

*5 周 / 1 人 / 业余时间 / 0 资金。ship fast，validate with real users.*
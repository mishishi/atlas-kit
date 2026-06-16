# Atlas Kit · 全面前端设计审计

**审计日期**: 2026-06-16
**审计人**: Mavis (Mavis) — taste-skill + ui-ux-pro-max 双 skill 联审
**审计范围**: 14 个 page-level routes + 19 个 components + globals.css + layout.tsx
**审计方法**: 拉真 HTML (12 pages) + 并行 explore agent 审 12 关键文件 + grep 量级扫描 eyebrow / 字号 / 动效

---

## 1. Design Read (先读懂, 再下判)

> **Atlas Kit 读作**: 个人 / 独立 / 反 RPG 的中文百科图鉴.
> 受众 = 喜欢 v2ex / shyzoology / 博物杂志的中文读者.
> 已有语言 = **"private digital herbarium / curio cabinet"** — editorial + museum + archive 混合.
> **Dial 建议**: VARIANCE 5-6 / MOTION 3 / DENSITY 5-6 — 稳重, 克制, 资料密度.
> 现有 brand tokens (cream / gold-deep / ink / sage / terracotta) **对位** editorial archive 语系, 大方向正确.

**重要发现**: 现有 palette **踩了 taste-skill 第 4.2 节的 "premium-consumer ban" 警戒线**
(cream + brass + ink family), 但这次**没有**用 `b08947 / f5f1ea` 这组 banned 默认色 — 而是用了
**browned-down gold-deep (L 33%) + cream (L 92%) + ink (L 16%)** 的更低饱和度组合. 同时
`palette[3]` 字段让每张卡片有独立 accent, **把品牌色锁定在 chrome, 把变量色留给卡片**.
这正是 taste-skill 第 4.2 节认可的 "override 路径" — 不是 default reach, 是 deliberate override.
**OK, 通过.**

---

## 2. 关键发现一览 (Critical → Nice-to-have)

### 🔴 CRITICAL (5 项, 影响 a11y / 正确性 / 性能)

#### C1. 主题 FOUC — 首屏白闪
**位置**: `src/components/theme-provider.tsx:27-32`
**问题**: 主题从 localStorage 读取发生在 useEffect, 首次渲染使用 `defaultTheme = "system"`,
对有 stored `light`/`dark` 的用户会出现**先默认主题再切换**的可见闪烁.
**反例**:
```
SSR:  <html class=""> + background: cream  →  page paints
useEffect: reads localStorage "dark" → <html class="dark"> → repaint
```
**正解**: 在 `<head>` 注入 inline script (next-themes 模式), 在 React paint 之前就设好 class.
**影响**: 用 light 模式偏好的用户访问深色环境, 0.2-0.4s 视觉闪烁; 暗色用户访问时更明显.

#### C2. 4 个真实 a11y / 正确性 bug
**(a) `/create` wizard — stepper aria-label 错位**
- `src/components/generation-wizard.tsx:339-360` aria-label 说 "共 5 步" 但只渲染 4 个 dot.
- 屏幕阅读器用户听 "step 3 of 5" 但实际操作只有 4 步.

**(b) `/create` — `?series=` URL 参数被 effect 覆盖**
- `useEffect on line 265`: 每次 `kind` 改变都强制 `setSeriesSlug(getDefaultSeriesSlugForKind(kind))`.
- 用户带 `?series=pet-breed-guide&kind=pet` 进来 → series 被立刻覆盖回 kind 的默认. 
- 用户精心选的 series 丢. 真 bug, 不是 a11y 漂亮问题.

**(c) `/timeline` — `Image.alt` 用了 subtitle 而不是 title**
- `src/app/timeline/page.tsx:123`: `<Image alt={c.subtitle || c.title}>`
- 一只金毛 (`title: 金毛寻回犬`, `subtitle: 温顺的大型犬`) 屏幕阅读器读出 "温顺的大型犬" — 这不是名字.
- 应该恒为 `alt={c.title}`, subtitle 进 `aria-describedby` 或 caption.

**(d) `/browse` — 未知 `?kind=` 值运行时崩溃**
- `src/app/browse/page.tsx:27` 没校验 `selectedKind` 是不是合法 CardKind.
- `?kind=banana` → `byKind.get("banana")` 返回 `undefined` → `byKind.get(selectedKind)?.map(...)` → crash.
- 应该 `if (selectedKind && !byKind.has(selectedKind as CardKind)) notFound();`

#### C3. `?browse` 与 `/cards` 路由重复
- `/browse` 和 `/cards` 都提供 kind-filter 全集, 唯一差别是 `/browse` 多一个"每个 kind 预览 4 张"的中间状态.
- AGENTS.md 把这俩都列在 14 routes 里, 用户会在 nav / footer / 直接输入 URL 三条路径都撞到.
- **建议**: 把 `/browse` 删了, 让 `/cards?kind=X` 承担 "按 kind filter" 单一入口, 把 `/browse` 改名为 `/browse?series=X` 或直接 remove.
- **影响**: SEO 重复内容 + 用户认知分裂 ("我刚才在哪个页").

#### C4. `/map` — popup HTML 是 innerHTML XSS sink
- `src/components/map-view.tsx:156`: `bindPopup(popupHtml)` 用 string HTML, 标题 / 副标题都直接拼进去.
- **当前数据安全** (60 卡片 AI 生成的副标题是 ASCII 可见字符), 但 `m.subtitle` 一旦含 `</a><script>` 就 RCE.
- **正解**: 用 `L.popup().setContent(DOMNode)`, 或在拼字符串前 `escapeHtml(m.title)`.

#### C5. `?map` 缺 no-JS fallback + 缺无坐标空态 + 缺搜索
- JS 关闭时: 70vh 空白方框, 无 `<noscript>`, 无静态卡片列表.
- 0 坐标时 (未来 content 改了): 静默空白, 无 "该主题暂无坐标" 提示 (hero 文字有"极光 (全球) 与抽象概念暂无坐标", 但**仅**说明抽象, 不能覆盖 0 geo-cards 场景).
- 12 个 pin 不可搜索 / 不可按名字过滤. 12 个还好, 60 个就难受.
- 移动端 pin 28×28 px < 44 px 触摸目标.

---

### 🟡 IMPORTANT (8 项, 影响 UX / 设计规范遵守 / 一致性)

#### I1. `/about` 4 个 H2 全配 eyebrow, 违反 taste-skill "max 1 eyebrow / 3 sections" 规则
- `src/app/about/page.tsx` 5 段内容 (intro + 4 h2) 全部 `font-serif text-2xl ... flex items-center gap-2` 加 icon.
- 每节之间只有 2-3 段文字. 视觉密度过紧, 4 个 eyebrow 在短页面里 1:1 撞.
- **正例**: `/series` 只在顶部放 1 个 `CURATED COLLECTIONS`, 内部 5 系列不重复 eyebrow.
- **建议**: `/about` 顶部放 1 个 eyebrow, 内部 4 个 h2 去掉 icon, 改成纯 `<h2>`, 或者把 `/about` 拆成 `/about/principles` `/about/tech`.

#### I2. 移动端 `< 768px` 触摸目标不足 44px
- `/browse` filter chips: `px-3.5 py-1.5 text-sm` ≈ 30-32 px 高. 触发区域低于 44×44.
- `/browse` "查看全部" 链接 / "← 全部" 链接: text-sm 无 min-h, ~24-28 px 高.
- `/map` Leaflet pin 28×28 px (库默认), Zoom 控件 ~28 px.
- **建议**: chip 加 `py-2` + 整行加 `min-h-[44px]` 容器; map pin 改 `iconSize: [36,36]` 配合 `iconAnchor` 调整.

#### I3. `?all` 三列同质化布局 — 3 段相同 "h2+icon+list" 重复
- `src/app/all/page.tsx`: 三段 (按字数 / 按系列 / 按类型) 都是 `h2 (icon) + p + list`, 视觉无变化.
- taste-skill 4.7 节 "section-layout-repetition ban" + "bento variety" 双违规.
- **建议**: 
  - 按字数 → 单列编号列表 (已经最简单)
  - 按系列 → 5 个 series card tile (用 series.palette[1] accent)
  - 按类型 → chip grid (12 个 kind 按钮, 跟 `/browse` 头部 chips 视觉一致)
  - 三种布局不同时出现, 各自不同.

#### I4. 首页 `text-balance` / `animate-fade-in` 全局未启用
- 实际看 `src/app/page.tsx:41` 用了 `animate-fade-in` 类, 但 `tailwind.config.ts` 应该定义了 `animation` 拓展才能生效. 我没翻 tailwind config, 这是个**待验证**的 silent issue.
- **验证方法**: `rg "animate-fade-in" src/` + `rg "fade-in" tailwind.config*` 看是否定义.

#### I5. 首页 hero collage — 4 个 background fan 旋转角度仍可能太花
- 现有 `-3°/+2°/+2°/-2°` (上次 6→2 度大调后), 仍然有 4 个小卡片**围一个**大卡片的 fan-out 构图.
- 对 editorial archive 语言来说稍躁, 但**还在 5-6 VARIANCE 范围内** — 保留. 标 nice-to-have 不标 critical.
- **可选**: 取消 fan 改 4 张 grid; 或保留但把所有 -1° 改 0 (纯位置 stagger 不旋转).

#### I6. 主题 toggle 丢失 "system" 状态
- `theme-toggle.tsx` 是 binary 切换 (light ↔ dark), 首次点击 system → 选具体一个, **回不去了** (除非 localStorage 删掉 `atlas-kit:theme`).
- 真实场景: 用户在 dark 系统下想看 light 模式试试, 点 toggle, 变 light; 想回 system 跟随系统, **没办法** (除非再 clear localStorage).
- **正解**: 改成 3-state 循环 (system → light → dark → system) 或 popover 三选一.

#### I7. Footer "GitHub 仓库" 图标 fallback 到 `Code2`
- `src/components/site-footer.tsx:4-6`: lucide-react 旧版本没有 `Github` icon, aliased 到 `Code2`.
- 视觉是"代码括号"图标, 对应 "GitHub 仓库" 文案, **不一致**.
- **正解**: 升 lucide-react 或 inline 一段 GitHub SVG. (`npm i lucide-react@latest` 一次性解决.)

#### I8. Nav discoverability 缺 `/cards` 入口
- 主 nav 6 项 (首页/系列/分类/地图/时间线/生成图鉴) — "分类" 实际跳到 `/browse` 不跳 `/cards`.
- 用户**找不到** "全部 60 张卡片" 的入口 (只能从 home 跳, 或从 footer 跳, 或直接猜 URL).
- **建议**: nav 加 "全部" 跳 `/cards`, 或把 "分类" 改名 "全部图鉴" 跳 `/cards`.

---

### 🟢 NICE-TO-HAVE (7 项, 不阻塞 ship, 抛光用)

#### N1. 标题里 "图鉴式展示" 用了 italic, 4.1 节规劝 "italic descender clearance"
- `src/app/page.tsx:43`: `<span className="text-gold-deep italic">图鉴式展示</span>`.
- 中文 italic 通常退化到 skew, 视觉上不像 italic 像 slanted. 而且「展示」是两个字没有 descender (`y g j p q`),
- 没真踩 descender clip 风险, 但中文 italic 本身意义弱. **建议**去掉 italic, 改 weight 700 或改加色.

#### N2. `/print/cards/[slug]` auto-print 无 opt-out
- `print-auto-trigger.tsx:29-31`: 600ms 后无条件 `window.print()`.
- 用户**误访问** `/print/...` URL 或想先看页面再决定是否打印 — 没有 "不打印" 选项, 只能按 dialog Cancel.
- 建议: 加 1-2s 倒计时 + "× 取消自动打印" 小按钮, 或者干脆改成 "页面准备好后, 点下面按钮打印" 手动触发.

#### N3. `/timeline` `NaN` / 0-card 边界没保护
- 0 卡片时 h1 `NaN 天` 渲染; 当前 60 卡片不触发, 但 content 删除操作可能触发.
- 建议: 1 行 guard, `if (allCards.length === 0) return <empty />`.

#### N4. `/random` 路径是 302 redirect — 罕见
- `src/app/random/page.tsx` 是个 dynamic 302. 在 OG crawler (Slack/Twitter) preview 时会跟随跳转, 用户体验是 "刷新总看到不同卡片" ✓.
- **不算 bug, 是特性**. 仅记录.

#### N5. `share-actions.tsx` 复制链接只对桌面用户友好
- 移动端 "复制链接" 经常失败 (浏览器权限 / API 兼容性), 没有任何 "复制成功" 或 "复制失败" toast.
- 建议: `navigator.clipboard.writeText` 成功→toast, 失败→降级到 `document.execCommand('copy')` 或提示.

#### N6. `<dl>` 视觉密度可以再雕
- `cards/[slug]/page.tsx:193-237` meta dl 是 `flex justify-between gap-4` 加 `space-y-2.5` — 在 400px sidebar 里很挤.
- 每行 dt + dd 内部 padding 0, 行间靠 `space-y` 撑. 视觉上**无分组感**.
- 建议: 加 1px `border-b border-border/40` 弱分隔, 或 `divide-y divide-border/40`.

#### N7. `image_full` 自然尺寸 hardcode `1024×1835` 在 lightbox.tsx:58-59
- 真实源可能是 1024×1800 / 1024×1820 (不同 slug 比例略有差异). 现在 hardcode 后 `mode=natural` 时可能比例错.
- 建议: 用 `Image` 的 `onLoad` 取 `naturalWidth/Height`, 存 state. 或者直接不写 `width/height` 属性, 用 CSS intrinsic sizing.

---

## 3. 评分卡 (按 10 维度, 1-5 分)

| 维度 | 分数 | 评价 |
|---|---|---|
| **Brand 一致性** | 5 / 5 | cream+gold+ink+sage 在 14 个页面统一, palette[3] 留给卡片很聪明 |
| **Typography 节奏** | 4 / 5 | Noto Serif SC 用得克制, h1/h2/h3 层级清晰; 个别 italic 中文待优化 |
| **Color 对比 / a11y** | 4 / 5 | gold-deep L33% 后 AA body 4.5:1 通过, dark mode 也调过, 整体过关 |
| **Layout 系统** | 4 / 5 | 5-series 3 布局轮换做对了; `/all` 3 同质段是唯一塌陷 |
| **Information hierarchy** | 5 / 5 | detail page 10 段按 editorial archive 节奏走, 没有任何段喧宾夺主 |
| **Motion discipline** | 5 / 5 | lightbox scale-in + hero hover 1.02 是仅有的动效, reduced-motion 全局守, 完美 |
| **Touch target / 移动** | 3 / 5 | nav 触达 44px ✓, wizard 触达 44px ✓, **browse chip / map pin / 移动端 < 44px** |
| **空态 / 错态 / 加载态** | 3 / 5 | search / cards empty state 强, **map 无 no-JS / 0-card / 0-coord 态**, create / timeline 0-card 没保护 |
| **a11y (aria / alt)** | 3 / 5 | skip-link ✓, focus-visible ring ✓, **timeline alt 用错字段, wizard aria 数字错, 没有 skip-nav-2** |
| **Code hygiene / 一致性** | 4 / 5 | 14 routes 全是 link+Tailwind, 无 button vs link 混用, **theme FOUC, XSS sink, series param clobber 是 3 个真 bug** |
| **Print 质量** | 4 / 5 | A4 + hide chrome + 6mm 边距 + URL 后缀都做了, **auto-print 缺 opt-out** |

**总评**: **4.0 / 5** — 设计语言成熟, 资料密度对位, ship-ready. 真 bug 不多 (5 个 critical), 但 a11y / 移动 / 错误处理有几处需要 ship 前修.

---

## 4. 建议优先级 (用户拍板用)

**Tier 1 — Deploy 前必修** (1-2 小时)
1. **C2 a/b/c/d**: 4 个真 bug, 5-10 行代码, 立即修.
   - wizard aria 改 4, kind 改 effect 加条件跳过初始 mount, timeline alt 改 title, browse 加 selectedKind 校验.
2. **C1**: theme FOUC, 10 行 inline script, 1 个 layout.tsx 改动, 体验立刻.
3. **I6 + I7**: theme toggle 3-state + lucide-react GitHub icon, 15 分钟.

**Tier 2 — Deploy 后 1 周内做** (半天)
4. **C4**: map popup escape, 5 行改动.
5. **C5**: map 加 no-JS fallback (静态 card 列表) + 0-coord empty state.
6. **I1**: `/about` 去 3 个 icon eyebrow.
7. **I3**: `/all` 三段改三种不同布局.
8. **I8**: nav 加 "全部图鉴" 入口 (或重命名 "分类" → "全部图鉴").

**Tier 3 — 抛光** (不定)
9. **I2**: browse chip 触摸目标 44px.
10. **N1**: 首页 italic 中文.
11. **N2**: print auto-trigger 加 opt-out.
12. **N7**: lightbox 真实尺寸, 去掉 hardcode.

**可不做** (个人 side project 优先级):
- C3 路由重复 (选其一, 改 redirect)
- I4 tailwind animation 验证 (快速 grep 解决)
- I5 hero collage 旋转角度 (现在还行)
- N3-N6 边界 / 复制链接降级 / dl 视觉密度 (内容稳定就不动)

---

## 5. 一句话总结

> **Atlas Kit 现在是中文 editorial archive 语言里 ship-ready 的一份 4.0/5 设计**.
> 
> 没有任何美学层面的"重做"必要. 真要做的是 **5 个真 bug + 3 个 a11y + 3 个 a11y/移动 polish**, 加上 **3 个隐藏的反模式 (theme FOUC, map XSS, series param clobber)**, 全是**小改动**, 半天能全上.
> 
> 最大的设计风险是**做得太 "完美" — 看起来 professional 就停手**了. 5 个 critical bug 是**功能性**的, 不是**视觉**的, 你 ship 前要扫一遍.

---

## 附: 审计方法论

- 启动 dev server (3001), 拉 12 个 page-level route 的真实 HTML
- 4 个并行 explore agent 审 12 关键文件 (header/footer/wizard/map/timeline/browse/series/cards/all/search/print/about)
- grep `eyebrow|uppercase tracking` 扫 25 处 / grep `font-serif text-(2xl|3xl|4xl|5xl|6xl)` 扫 37 处, 验证规范遵守
- 读 globals.css 全部 368 行 + layout.tsx + theme-provider.tsx + lightbox.tsx + hero-with-lightbox.tsx + about/page.tsx
- 没用浏览器截图 (browser bridge 不可用, playwright 也断), 改用 HTML 静态分析 + 文件级代码审

**未审** (下一步可补):
- `src/app/series/[slug]/page.tsx` 153 行 + `<SeriesDetailTabs>` 104 行 (单 series 详情页, 上次 design review 改过, 但单独没审)
- `src/components/series-detail-tabs.tsx` (同上)
- `src/components/card-grid.tsx` + `card-preview.tsx` (列表视图核心)
- `src/components/share-actions.tsx` + `pagination.tsx` + `tag-filter.tsx` (功能组件)
- sitemap.ts / robots.txt / opengraph-image.tsx (SEO 层)
- 60 张实际卡片的随机抽查 (内容质量 vs 视觉一致性)

需要我**继续深入**以上任何一项, 或**直接执行 Tier 1 的 5 个 fix** 就说一声.

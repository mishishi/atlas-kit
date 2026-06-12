import Link from "next/link";
import { Sparkles, Compass, Layers, Zap } from "lucide-react";

export const metadata = {
  title: "关于 · 图鉴社",
  description: "关于图鉴社 Atlas Kit 这个项目",
};

export default function AboutPage() {
  return (
    <div className="container py-12 md:py-20 max-w-3xl">
      <h1 className="font-serif text-3xl md:text-4xl font-bold mb-6">关于图鉴社</h1>

      <div className="prose prose-stone dark:prose-invert max-w-none space-y-6 text-foreground/90 leading-relaxed">
        <p className="text-lg">
          <strong>图鉴社 (Atlas Kit)</strong> 是一个系列化中文科普图鉴卡片集。
          每一张图鉴都像翻一页百科书: 主视觉、基础档案、外观特征、性格习性、养护建议、适配评分、优缺点对比、趣味冷知识、健康风险 — 9 个模块完整呈现一个主题。
        </p>

        <h2 className="font-serif text-2xl font-semibold mt-10 mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-gold-deep" />
          为什么做这个
        </h2>
        <p>
          看到一张漂亮的图鉴卡片,大家通常的反应是"想要更多"或者"想要这样的图"。但市面上的 AI 生图工具,每次都给你一张"自由发挥"的图,版式飘忽不定、字段重复、文字乱码 — 没法系列化,没法收藏。
        </p>
        <p>
          图鉴社解决的就是这个问题: <strong>固定的 9 模块骨架 + 任意主题 = 可系列化、可收藏、可复用</strong> 的中文科普图鉴。
        </p>

        <h2 className="font-serif text-2xl font-semibold mt-10 mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5 text-gold-deep" />
          设计原则
        </h2>
        <ul className="list-disc list-inside space-y-2">
          <li><strong>模块化</strong>: 每张图鉴都是 9 个固定模块的组合,而不是 AI 随机排版</li>
          <li><strong>字段槽位约束</strong>: 每个模块有明确的字段数量,避免重复/缺失</li>
          <li><strong>风格锚点</strong>: "博物馆图鉴 / 知识卡 / 杂志感" 这套调性反复强化</li>
          <li><strong>纯中文输出</strong>: 除拉丁学名外,所有文字必须为简体中文</li>
          <li><strong>轻阴影 + 圆角 + 衬线标题</strong>: 区别于普通商业 SaaS 的冷感</li>
        </ul>

        <h2 className="font-serif text-2xl font-semibold mt-10 mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-gold-deep" />
          技术栈
        </h2>
        <ul className="list-disc list-inside space-y-2">
          <li><strong>Next.js 14</strong> App Router · React Server Components</li>
          <li><strong>Tailwind CSS</strong> + 设计 token 主题切换</li>
          <li><strong>Lucide Icons</strong> · 矢量图标,无 emoji</li>
          <li><strong>AI 生图</strong> · 通过 mavis MCP 调用 matrix_generate_image</li>
          <li><strong>数据存储</strong> · MVP 阶段使用本地 JSON</li>
        </ul>

        <h2 className="font-serif text-2xl font-semibold mt-10 mb-4 flex items-center gap-2">
          <Compass className="h-5 w-5 text-gold-deep" />
          开始探索
        </h2>
        <div className="flex flex-wrap gap-3 not-prose">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-gold-deep px-5 py-2.5 text-sm font-medium text-cream hover:bg-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
          >
            浏览图鉴
          </Link>
          <Link
            href="/create"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            生成你自己的
          </Link>
        </div>
      </div>
    </div>
  );
}
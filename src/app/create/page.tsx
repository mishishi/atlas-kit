import { Suspense } from "react";
import { Sparkles } from "lucide-react";
import { GenerationWizard } from "@/components/generation-wizard";

export const metadata = {
  title: "生成图鉴 · 图鉴社",
  description: "输入主题，AI 一键生成高质量中文科普图鉴",
};

export default function CreatePage() {
  return (
    <div className="container py-12 md:py-16">
      <header className="mx-auto max-w-2xl text-center mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold bg-gold/10 px-3 py-1 text-xs text-gold-deep mb-5">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          AI 驱动
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">生成你的图鉴</h1>
        <p className="text-muted-foreground leading-relaxed">
          输入任意主题, 选择类型与配色, AI 将为你打造一张博物馆级图鉴卡片。<br />
          通常需要 <span className="font-serif font-bold text-foreground">30-60 秒</span>。
        </p>
      </header>

      {/* Suspense required because GenerationWizard reads useSearchParams() to
          restore state from ?step=&q=&kind=&series=&palette= on mount. */}
      <Suspense fallback={<GenerationWizardSkeleton />}>
        <GenerationWizard />
      </Suspense>
    </div>
  );
}

function GenerationWizardSkeleton() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-center justify-center gap-2" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className="h-8 w-8 rounded-full bg-muted" />
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card p-6 md:p-8 shadow-card paper-grain">
        <div className="h-6 w-1/3 rounded skeleton" />
        <div className="mt-3 h-4 w-1/2 rounded skeleton" />
        <div className="mt-6 h-32 rounded skeleton" />
      </div>
    </div>
  );
}
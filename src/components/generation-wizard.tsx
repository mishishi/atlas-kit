"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles, Loader2, Check, CheckCircle2, BookMarked } from "lucide-react";
import { cn } from "@/lib/utils";
import { THEME_TYPES, type ThemeType } from "@/lib/theme-types";
import { SERIES_TYPES, type SeriesType, getDefaultSeriesSlugForKind, recommendSeries } from "@/lib/series-types";

type Step = 1 | 2 | 3 | 4 | 5;
type Kind = ThemeType["key"];

// Single source of truth: theme-types.ts
// Wizard buttons read directly from THEME_TYPES — no duplicate list.
// UI no longer renders emoji (Lucide-only icon policy); the THEME_TYPES.emoji
// field is still kept on the source for the prompt template (visual anchor for AI).
const KINDS: { key: Kind; label: string; desc: string }[] = THEME_TYPES.map(
  (t) => ({ key: t.key as Kind, label: t.label, desc: t.description }),
);

const PALETTES: { key: string; label: string; colors: [string, string, string] }[] = [
  { key: "auto", label: "自动推荐", colors: ["#F5F0E6", "#B8956A", "#A8B89C"] },
  { key: "warm", label: "暖橙系", colors: ["#FAF3E9", "#C97064", "#D9B48E"] },
  { key: "cool", label: "冷蓝系", colors: ["#F0F4F7", "#6B8294", "#B7C5CE"] },
  { key: "earth", label: "大地色", colors: ["#F5F0E6", "#8C7F6E", "#A8B89C"] },
  { key: "monochrome", label: "黑白系", colors: ["#F5F0E6", "#2E2A24", "#A8B89C"] },
  { key: "botanical", label: "植物系", colors: ["#F5F0E6", "#A8B89C", "#7A8B6E"] },
];

export function GenerationWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [topic, setTopic] = useState("");
  const [kind, setKind] = useState<Kind>("pet");
  const [seriesSlug, setSeriesSlug] = useState<string>(getDefaultSeriesSlugForKind("pet"));
  const [palette, setPalette] = useState("auto");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When kind changes, re-default the series (and pre-highlight the best match for current topic)
  useEffect(() => {
    setSeriesSlug(getDefaultSeriesSlugForKind(kind));
  }, [kind]);

  // AI recommender: rank series against current (topic, kind) for "推荐" badge
  const recommendations = useMemo(
    () => recommendSeries(topic, kind, 3),
    [topic, kind],
  );

  const canNext = (s: Step) => {
    if (s === 1) return topic.trim().length > 0 && topic.trim().length <= 30;
    if (s === 2) return !!kind;
    if (s === 3) return !!seriesSlug;
    if (s === 4) return !!palette;
    return false;
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), kind, seriesSlug, palette }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `生成失败 (${res.status})`);
      }
      const data = await res.json();
      // Redirect to the newly created card detail page
      router.push(`/cards/${data.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败,请重试");
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Stepper */}
      <div
        role="group"
        aria-label={`生成图鉴流程,当前第 ${step} 步,共 5 步`}
        className="mb-8 flex items-center justify-center gap-2"
      >
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className="flex items-center">
            <div
              aria-current={step === s ? "step" : undefined}
              className={cn(
                "grid h-8 w-8 place-items-center rounded-full text-xs font-medium transition-colors",
                step >= s ? "bg-gold-deep text-cream" : "bg-muted text-muted-foreground",
              )}
            >
              {step > s ? <Check className="h-4 w-4" aria-hidden="true" /> : s}
            </div>
            {s < 5 && (
              <div
                aria-hidden="true"
                className={cn("h-px w-8 transition-colors", step > s ? "bg-gold-deep" : "bg-border")}
              />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-6 md:p-8 shadow-card paper-grain">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-xl font-semibold mb-1">输入主题</h2>
              <p className="text-sm text-muted-foreground">比如 "金毛寻回犬"、"普洱茶"、"二十四节气"</p>
            </div>
            <label className="block">
              <span className="sr-only">图鉴主题</span>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="输入你想生成的图鉴主题..."
                maxLength={30}
                aria-describedby="topic-counter"
                className="w-full rounded-md border border-border bg-background px-4 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                autoFocus
              />
            </label>
            <div id="topic-counter" className="text-xs text-muted-foreground text-right tabular-nums">
              {topic.length} / 30
            </div>
          </div>
        )}

        {step === 2 && (
          <div role="group" aria-labelledby="step2-title" className="space-y-4">
            <div>
              <h2 id="step2-title" className="font-serif text-xl font-semibold mb-1">选择类型</h2>
              <p className="text-sm text-muted-foreground">不同类型有不同的字段槽位</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {KINDS.map((k) => {
                const selected = kind === k.key;
                return (
                  <button
                    key={k.key}
                    type="button"
                    onClick={() => setKind(k.key)}
                    aria-pressed={selected}
                    aria-label={k.desc ? `${k.label} — ${k.desc}` : k.label}
                    className={cn(
                      "relative flex min-h-[44px] flex-col items-start gap-1 rounded-md border p-4 text-left transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      selected
                        ? "border-gold-deep bg-gold-deep text-cream shadow-card-hover scale-[0.98]"
                        : "border-border bg-background text-foreground hover:border-gold hover:bg-muted/50",
                    )}
                  >
                    {selected && (
                      <CheckCircle2 className="absolute top-2 right-2 h-5 w-5 text-cream" aria-hidden="true" />
                    )}
                    <span className={cn("font-serif font-medium text-base leading-snug", !selected && "text-foreground")}>
                      {k.label}
                    </span>
                    <span className={cn("text-xs", selected ? "text-cream/80" : "text-muted-foreground")}>
                      {k.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div role="group" aria-labelledby="step3-title" className="space-y-4">
            <div>
              <h2 id="step3-title" className="font-serif text-xl font-semibold mb-1">选择系列归属</h2>
              <p className="text-sm text-muted-foreground">这张图鉴会加入哪个系列收藏</p>
            </div>
            <div className="space-y-3">
              {SERIES_TYPES.map((s) => {
                const selected = seriesSlug === s.slug;
                const isTop = recommendations[0]?.series.slug === s.slug;
                const reason = recommendations.find((r) => r.series.slug === s.slug)?.reason;
                return (
                  <button
                    key={s.slug}
                    type="button"
                    onClick={() => setSeriesSlug(s.slug)}
                    aria-pressed={selected}
                    aria-label={reason ? `${s.name} — ${reason}` : s.name}
                    className={cn(
                      "relative w-full flex min-h-[44px] items-center gap-4 rounded-md border p-4 text-left transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      selected
                        ? "border-gold-deep shadow-card-hover scale-[0.99]"
                        : "border-border bg-background hover:border-gold hover:bg-muted/30",
                    )}
                    style={selected ? { backgroundColor: s.palette[0] } : undefined}
                  >
                    {/* Palette swatches */}
                    <div className="flex flex-col gap-0.5 shrink-0" aria-hidden="true">
                      <div className="h-3 w-10 rounded-sm" style={{ backgroundColor: s.palette[0] }} />
                      <div className="h-3 w-10 rounded-sm" style={{ backgroundColor: s.palette[1] }} />
                      <div className="h-3 w-10 rounded-sm" style={{ backgroundColor: s.palette[2] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <BookMarked className="h-4 w-4 text-gold-deep" aria-hidden="true" />
                        <span className="font-serif font-semibold">{s.name}</span>
                        {isTop && !selected && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/20 text-gold-deep font-medium">
                            AI 推荐
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{s.tagline}</p>
                      {selected && reason && (
                        <p className="text-[11px] text-gold-deep mt-1.5">💡 {reason}</p>
                      )}
                    </div>
                    {selected && (
                      <CheckCircle2 className="h-5 w-5 text-gold-deep shrink-0" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div role="group" aria-labelledby="step4-title" className="space-y-4">
            <div>
              <h2 id="step4-title" className="font-serif text-xl font-semibold mb-1">选择配色</h2>
              <p className="text-sm text-muted-foreground">或选「自动推荐」让 AI 根据主题决定</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PALETTES.map((p) => {
                const selected = palette === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPalette(p.key)}
                    aria-pressed={selected}
                    aria-label={`配色: ${p.label}`}
                    className={cn(
                      "relative flex min-h-[44px] flex-col gap-2 rounded-md border p-3 text-left transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      selected
                        ? "border-gold-deep bg-gold-deep text-cream shadow-card-hover scale-[0.98]"
                        : "border-border bg-background text-foreground hover:border-gold hover:bg-muted/50",
                    )}
                  >
                    {selected && (
                      <CheckCircle2 className="absolute top-2 right-2 h-5 w-5 text-cream" aria-hidden="true" />
                    )}
                    <div className="flex gap-1" aria-hidden="true">
                      {p.colors.map((c, i) => (
                        <div key={i} className="h-6 flex-1 rounded-sm border border-border" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <span className={cn("font-medium text-sm", !selected && "text-foreground")}>
                      {p.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 text-center py-8">
            <div>
              <h2 className="font-serif text-xl font-semibold mb-1">确认生成</h2>
              <p className="text-sm text-muted-foreground">检查信息无误后点击生成</p>
            </div>

            <dl className="mx-auto max-w-md space-y-3 text-left">
              <div className="flex justify-between gap-4 rounded-md bg-muted/50 p-3">
                <dt className="text-muted-foreground text-sm">主题</dt>
                <dd className="font-medium">{topic}</dd>
              </div>
              <div className="flex justify-between gap-4 rounded-md bg-muted/50 p-3">
                <dt className="text-muted-foreground text-sm">类型</dt>
                <dd className="font-medium">{KINDS.find((k) => k.key === kind)?.label}</dd>
              </div>
              <div className="flex justify-between gap-4 rounded-md bg-muted/50 p-3">
                <dt className="text-muted-foreground text-sm">系列</dt>
                <dd className="font-medium">{SERIES_TYPES.find((s) => s.slug === seriesSlug)?.name}</dd>
              </div>
              <div className="flex justify-between gap-4 rounded-md bg-muted/50 p-3">
                <dt className="text-muted-foreground text-sm">配色</dt>
                <dd className="font-medium">{PALETTES.find((p) => p.key === palette)?.label}</dd>
              </div>
            </dl>

            {error && (
              <div
                role="alert"
                className="mx-auto max-w-md rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              aria-busy={generating}
              className={cn(
                "inline-flex min-h-[44px] items-center gap-2 rounded-md bg-gold-deep px-8 py-3 text-base font-medium text-cream shadow-card transition-all",
                "hover:bg-gold hover:-translate-y-0.5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
              )}
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  AI 创作中...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                  生成图鉴
                </>
              )}
            </button>

            {generating && (
              <p className="text-xs text-muted-foreground">
                通常需要 30-60 秒,可以喝杯茶 ☕
              </p>
            )}
          </div>
        )}

        {/* Nav */}
        {step < 5 && (
          <div className="mt-8 flex items-center justify-between pt-6 border-t border-border">
            <button
              type="button"
              onClick={() => setStep((step - 1) as Step)}
              disabled={step === 1}
              className={cn(
                "inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-4 py-2 text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                step === 1
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              上一步
            </button>
            <button
              type="button"
              onClick={() => setStep((step + 1) as Step)}
              disabled={!canNext(step)}
              className={cn(
                "inline-flex min-h-[44px] items-center gap-1.5 rounded-md bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors",
                "hover:bg-foreground/90",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              )}
            >
              下一步
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
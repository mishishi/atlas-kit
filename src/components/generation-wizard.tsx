"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles, Loader2, Check, CheckCircle2, BookMarked, Lightbulb, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { THEME_TYPES, type ThemeType } from "@/lib/theme-types";
import { SERIES_TYPES, type SeriesType, getDefaultSeriesSlugForKind, recommendSeries } from "@/lib/series-types";
import cardsData from "../../data/cards.json";

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

// Top 3 most-picked kinds from existing data — used as a hint on step 2 so
// new users know what's popular. Computed at module load (build-time).
const POPULAR_KINDS: { key: Kind; label: string; count: number }[] = (() => {
  const counts = new Map<Kind, number>();
  for (const c of cardsData as { kind: Kind }[]) {
    counts.set(c.kind, (counts.get(c.kind) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, count]) => ({
      key: k,
      label: THEME_TYPES.find((t) => t.key === k)?.label ?? k,
      count,
    }));
})();

function PopularKindsHint() {
  if (POPULAR_KINDS.length === 0) return null;
  return (
    <p className="text-xs text-muted-foreground mb-2">
      已有 {cardsData.length} 张图鉴, 最受欢迎的 3 个类型:{" "}
      {POPULAR_KINDS.map((p, i) => (
        <span key={p.key}>
          <span className="font-medium text-foreground">{p.label}</span>
          <span className="text-muted-foreground/70 tabular-nums ml-0.5">({p.count})</span>
          {i < POPULAR_KINDS.length - 1 && <span className="mx-1.5">·</span>}
        </span>
      ))}
    </p>
  );
}

// Wizard state backup key — survives accidental page refresh / browser crash.
const WIZARD_DRAFT_KEY = "atlas-kit:wizard-draft-v1";

interface WizardDraft {
  step: Step;
  topic: string;
  kind: Kind;
  seriesSlug: string;
  palette: string;
  savedAt: number;
}

function loadDraft(): WizardDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WIZARD_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WizardDraft;
    // Expire drafts older than 7 days — they're stale
    if (Date.now() - parsed.savedAt > 7 * 24 * 60 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(WIZARD_DRAFT_KEY);
  } catch {
    // ignore quota / disabled storage
  }
}

export function GenerationWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ── Restore state from URL on mount (deep-link support: share "stuck on step 3 with topic X") ──
  // URL takes precedence over localStorage; localStorage only kicks in if URL is empty.
  const urlStep = (() => {
    const s = Number(searchParams.get("step") ?? "");
    return s >= 1 && s <= 5 ? (s as Step) : null;
  })();
  const draft = loadDraft();
  const initialStep =
    urlStep ??
    (draft && draft.step >= 1 && draft.step <= 5 ? draft.step : 1);
  const initialTopic = searchParams.get("q") ?? draft?.topic ?? "";
  const initialKind = (() => {
    const k = searchParams.get("kind") ?? draft?.kind ?? "pet";
    return THEME_TYPES.some((t) => t.key === k) ? (k as Kind) : "pet";
  })();
  const initialSeries = (() => {
    const s = searchParams.get("series") ?? draft?.seriesSlug ?? getDefaultSeriesSlugForKind(initialKind);
    return s;
  })();
  const initialPalette = searchParams.get("palette") ?? draft?.palette ?? "auto";

  const [step, setStep] = useState<Step>(initialStep);
  const [topic, setTopic] = useState(initialTopic);
  const [kind, setKind] = useState<Kind>(initialKind);
  const [seriesSlug, setSeriesSlug] = useState<string>(initialSeries);
  const [palette, setPalette] = useState(initialPalette);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // AbortController so user can cancel a 30-60s generation run
  const abortRef = useRef<AbortController | null>(null);

  // ── Persist state to localStorage on every change (debounced 300ms) ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = setTimeout(() => {
      try {
        const draft: WizardDraft = {
          step, topic, kind, seriesSlug, palette, savedAt: Date.now(),
        };
        window.localStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // ignore quota errors
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [step, topic, kind, seriesSlug, palette]);

  // ── Sync state → URL (replaceState, no scroll) ──
  const syncUrl = useCallback(
    (next: { step?: Step; q?: string; kind?: Kind; series?: string; palette?: string }) => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      if (next.step) params.set("step", String(next.step));
      if (next.q !== undefined) params.set("q", next.q);
      if (next.kind) params.set("kind", next.kind);
      if (next.series) params.set("series", next.series);
      if (next.palette) params.set("palette", next.palette);
      const qs = params.toString();
      const url = qs ? `/create?${qs}` : "/create";
      window.history.replaceState(null, "", url);
    },
    [],
  );

  // When kind changes, re-default the series (and pre-highlight the best match for current topic)
  useEffect(() => {
    setSeriesSlug(getDefaultSeriesSlugForKind(kind));
  }, [kind]);

  // Mirror step changes into the URL so the back button + shareable links work
  useEffect(() => {
    syncUrl({ step, q: topic, kind, series: seriesSlug, palette });
  }, [step, topic, kind, seriesSlug, palette, syncUrl]);

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
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), kind, seriesSlug, palette }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `生成失败 (${res.status})`);
      }
      const data = await res.json();
      // Redirect to the newly created card detail page
      clearDraft();
      const seriesName = SERIES_TYPES.find((s) => s.slug === seriesSlug)?.name ?? seriesSlug;
      toast.success(`已收录到「${seriesName}」`, {
        description: `${data.title} · No.${data.image.match(/-(\w+)\.png$/)?.[1] ?? "?"}`,
        duration: 4000,
      });
      router.push(`/cards/${data.slug}`);
    } catch (e: any) {
      if (e?.name === "AbortError") {
        setError("已取消生成");
      } else {
        setError(e instanceof Error ? e.message : "生成失败,请重试");
      }
      setGenerating(false);
      abortRef.current = null;
    }
  };

  const handleCancelGenerate = () => {
    abortRef.current?.abort();
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Stepper */}
      <div
        role="group"
        aria-label={`生成图鉴流程,当前第 ${step} 步,共 5 步`}
        className="mb-8"
      >
        {/* Step breadcrumb — clickable to jump back, shows step name + state */}
        <ol
          className="mb-3 flex items-center justify-center gap-1.5 text-xs flex-wrap list-none p-0"
          aria-label="生成图鉴步骤"
        >
          {[
            { n: 1, label: "主题" },
            { n: 2, label: "类型" },
            { n: 3, label: "系列" },
            { n: 4, label: "配色" },
            { n: 5, label: "确认" },
          ].map((s) => {
            const done = step > s.n;
            const current = step === s.n;
            const reachable = done || current;
            const Wrapper: "button" | "span" = reachable ? "button" : "span";
            return (
              <li key={s.n} className="contents">
                <Wrapper
                  type={reachable ? "button" : undefined}
                  onClick={
                    reachable
                      ? () => setStep(s.n as Step)
                      : undefined
                  }
                  aria-current={current ? "step" : undefined}
                  disabled={!reachable}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors",
                    current && "bg-gold/10 font-medium text-gold-deep",
                    done && "text-foreground hover:bg-muted cursor-pointer",
                    !reachable && "text-muted-foreground/60 cursor-not-allowed",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  )}
                >
                  {done ? (
                    <Check className="h-3 w-3 text-gold-deep" aria-hidden="true" />
                  ) : (
                    <span
                      className={cn(
                        "grid h-4 w-4 place-items-center rounded-full text-[10px] font-medium tabular-nums",
                        current ? "bg-gold-deep text-cream" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {s.n}
                    </span>
                  )}
                  <span>{s.label}</span>
                </Wrapper>
                {s.n < 5 && (
                  <span aria-hidden="true" className="text-muted-foreground/30">/</span>
                )}
              </li>
            );
          })}
        </ol>

        {/* Stepper dots — visual progress */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center">
              <div
                aria-hidden="true"
                className={cn(
                  "h-1.5 w-8 rounded-full transition-colors",
                  step >= s ? "bg-gold-deep" : "bg-muted",
                )}
              />
            </div>
          ))}
        </div>
      </div>

      <div
        // Re-mount on step change to re-trigger the entrance animation
        key={`step-${step}`}
        className="rounded-lg border border-border bg-card p-6 md:p-8 shadow-card paper-grain animate-step-in"
      >
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-xl font-semibold mb-1">输入主题</h2>
              <p className="text-sm text-muted-foreground mb-3">点一个试试, 或自己输入任意主题 (30 字以内)</p>
              <ul className="flex flex-wrap gap-1.5 list-none p-0" aria-label="主题示例">
                {["金毛寻回犬", "西湖龙井", "二十四节气", "雪豹", "玛瑙"].map((example) => (
                  <li key={example}>
                    <button
                      type="button"
                      onClick={() => setTopic(example)}
                      className={cn(
                        "inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        topic === example
                          ? "border-gold-deep bg-gold text-cream"
                          : "border-border bg-background text-muted-foreground hover:border-gold hover:text-foreground",
                      )}
                    >
                      {example}
                    </button>
                  </li>
                ))}
              </ul>
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
              <p className="text-sm text-muted-foreground mb-2">不同类型有不同的字段槽位</p>
              {/* Show the top 3 most-picked kinds from existing cards as a quick hint */}
              <PopularKindsHint />
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
                        <p className="text-[11px] text-gold-deep mt-1.5 flex items-start gap-1">
                          <Lightbulb className="h-3 w-3 mt-0.5 shrink-0" aria-hidden="true" />
                          <span>{reason}</span>
                        </p>
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

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
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
                <button
                  type="button"
                  onClick={handleCancelGenerate}
                  className={cn(
                    "inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-card px-5 py-3 text-sm font-medium",
                    "hover:bg-muted",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "transition-colors",
                  )}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  取消
                </button>
              )}
            </div>

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
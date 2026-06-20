"use client";

/**
 * Lightbox — fullscreen modal image viewer.
 *
 * Design choices (Plan A: self-built client component):
 * - 0 dependencies, full control over the cream/gold brand
 * - Uses bg-scrim (--scrim CSS var) for the backdrop, matches the
 *   design system token (same as other overlays would)
 * - ESC closes; click on backdrop closes; body scroll locked while
 *   open; focus is trapped by the close button being the only focusable
 *   element (good enough for a 1-image viewer — full focus trap
 *   would need yet-another-react-lightbox or a focus-trap lib)
 * - scale-in keyframe (already in tailwind.config) gives a subtle
 *   open animation
 *
 * Zoom model (Round 31 — fix "放大没效果" bug):
 * - Default: `fit` — the image is rendered at its natural
 *   aspect (9/16) and CSS-scaled down to fit the viewport.
 * - `100%` — image is shown at native pixel size (768×1376 for
 *   recent 1K cards, 1024×1835 for older 2K cards), overflowing
 *   the container so the user can pan with scroll / wheel.
 * - `150%` / `200%` — CSS scale on top of 100% (NOT new pixels,
 *   just pixelated zoom for inspection; clearly labeled as such
 *   so users don't expect more).
 * - Click image toggles fit ↔ 100%. + / - keys cycle through
 *   100% / 150% / 200%. 0 / R resets to fit.
 *
 * Why plain <img> instead of next/image (Round 31):
 * The previous <Image sizes="(max-width: 1024px) 100vw, 1024px">
 * made the browser pick a smaller srcset entry on small viewports
 * (e.g. mobile → w=640 → ~390×698 actual bytes). Combined with
 * Next.js dev-mode optimizer quirks, the loaded image was smaller
 * than the source file, so 100% "natural" mode rendered at nearly
 * the same size as fit mode on mobile — making zoom feel broken.
 * A plain <img src=full.webp> loads the actual file every time,
 * so 100% mode always shows the real source resolution.
 *
 * Image source is `image_full` (WebP, 768×1376 or 1024×1835
 * depending on generation batch) passed in by the parent.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { X, Download, ZoomIn, ZoomOut, RotateCcw, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";

interface LightboxProps {
  open: boolean;
  onClose: () => void;
  /** 1024w high-res PNG */
  src: string;
  alt: string;
  /** Optional filename for the download link (e.g. "labrador-retriever") */
  filename?: string;
  /** Optional caption shown below the image (e.g. card subtitle) */
  caption?: string;
}

/** Display modes: fit-to-viewport (CSS-scaled, whole image visible)
 *  or 100% natural pixel size (overflows, user can pan).
 *  Round 31: 150% / 200% added as pixelated zoom-in beyond natural,
 *  for users who want to inspect small details (clearly labeled). */
type DisplayMode = "fit" | "100%" | "150%" | "200%";

/** Zoom multiplier for the rendered image. fit → 100% via the image
 *  click / "100%" button; 100% → 150% → 200% via repeated zoom-in. */
const ZOOM_LEVELS: DisplayMode[] = ["100%", "150%", "200%"];

/** Default size for the -full.webp tier. Round 31 note: with the
 *  per-card directory migration (R26) and 1K vs 2K generation
 *  batches, files are now a mix of 768×1376 (recent 1K cards like
 *  luoyang, 成都, 大理, 拉萨, ...) and 1024×1835 (older 2K cards).
 *  DEFAULT_W/H is just an initial layout hint before the real
 *  naturalWidth / naturalHeight is read onLoad. */
const DEFAULT_W = 1024;
const DEFAULT_H = 1835;

export function Lightbox({ open, onClose, src, alt, filename, caption }: LightboxProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<DisplayMode>("fit");
  // N7 fix: read the real image dimensions onLoad so the 'natural'
  // mode renders at the correct aspect ratio for each card (the
  // hardcoded 1024×1835 was a 9/16 guess; some cards are slightly
  // taller or shorter).
  const [naturalDims, setNaturalDims] = useState<{ w: number; h: number } | null>(null);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC closes; + / - cycles through 100% / 150% / 200%; 0 / r resets to fit
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setMode((m) => {
          if (m === "fit") return ZOOM_LEVELS[0];
          const idx = ZOOM_LEVELS.indexOf(m);
          return ZOOM_LEVELS[Math.min(idx + 1, ZOOM_LEVELS.length - 1)];
        });
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setMode((m) => {
          if (m === "fit") return "fit";
          const idx = ZOOM_LEVELS.indexOf(m);
          if (idx <= 0) return "fit";
          return ZOOM_LEVELS[idx - 1];
        });
      } else if (e.key === "0" || e.key.toLowerCase() === "r") {
        e.preventDefault();
        setMode("fit");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Auto-focus the close button so keyboard users can dismiss immediately
  useEffect(() => {
    if (open) closeBtnRef.current?.focus();
  }, [open]);

  // Reset to fit mode on open (otherwise the next open might be
  // stuck at a zoomed-in state, which overflows the viewport on a
  // smaller screen)
  useEffect(() => {
    if (open) setMode("fit");
  }, [open]);

  // Round 19 fix: `naturalDims` is set inside the img onLoad handler.
  // Under React 18 strict mode the component mounts/unmounts/mounts,
  // and on a fast unmount the image might still resolve the src and fire
  // onLoad AFTER unmount — calling setState on an unmounted component
  // is a no-op in React 18 but logs a warning. Track open state and
  // skip the setState if we already closed.
  const openRef = useRef(open);
  openRef.current = open;

  // Click on image: fit ↔ 100% (single-toggle for clarity; the
  // 150% / 200% are reached via the zoom-in button or + key).
  const toggleMode = useCallback(() => {
    setMode((m) => (m === "fit" ? "100%" : "fit"));
  }, []);

  // Zoom-in: 100% → 150% → 200% → 200% (clamp).
  // Zoom-out: 100% → fit (skipping 150% / 200% on the way back is
  // intentional — going to fit first feels more natural than stepping
  // down through every zoom level).
  const zoomIn = useCallback(() => {
    setMode((m) => {
      if (m === "fit") return "100%";
      const idx = ZOOM_LEVELS.indexOf(m);
      return ZOOM_LEVELS[Math.min(idx + 1, ZOOM_LEVELS.length - 1)];
    });
  }, []);
  const zoomOut = useCallback(() => {
    setMode((m) => (m === "fit" ? "fit" : "fit"));
  }, []);

  // Whether the current mode is "100% or larger" (overflows, can pan)
  const isPannable = mode !== "fit";
  // Zoom multiplier (CSS scale on top of natural pixel size)
  const zoomMul = mode === "fit" ? 1 : mode === "100%" ? 1 : mode === "150%" ? 1.5 : 2;

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim animate-fade-in p-4 sm:p-8"
    >
      {/* Close (X) — top right. */}
      <button
        ref={closeBtnRef}
        type="button"
        onClick={onClose}
        aria-label="关闭大图"
        className={cn(
          "absolute right-4 top-4 z-10 grid h-11 w-11 min-h-[44px] min-w-[44px] place-items-center rounded-full",
          "bg-card/90 text-foreground shadow-card-hover backdrop-blur",
          "hover:bg-card hover:text-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "transition-colors",
        )}
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Image container — click on the figure does NOT close (stops
          bubbling) so right-click / long-press on the image stays put. */}
      <figure
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] flex-col items-center gap-3 animate-scale-in"
      >
        <div
          className={cn(
            "relative rounded-lg shadow-dark-card ring-1 ring-border/40 scrollbar-editorial",
            isPannable
              ? "overflow-auto cursor-grab active:cursor-grabbing"
              : "overflow-hidden cursor-zoom-in",
          )}
          style={{
            maxHeight: "calc(100vh - 8rem)",
            maxWidth: "calc(100vw - 2rem)",
          }}
          onClick={toggleMode}
        >
          {/* Round 31 fix: plain <img> instead of next/image. The
              previous <Image sizes="(max-width: 1024px) 100vw, 1024px">
              made the browser pick a smaller srcset entry on small
              viewports (mobile → w=640 → ~390×698 actual bytes),
              combined with Next.js dev-mode quirks, the loaded image
              was smaller than the source file. So 100% "natural" mode
              rendered at nearly the same size as fit mode on mobile,
              making zoom feel broken ("放大没效果").

              Plain <img> always loads the full-resolution WebP,
              so 100% mode shows the actual source resolution.
              We still use width/height attrs (set from naturalDims
              onLoad) to prevent CLS during the initial paint. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            width={naturalDims?.w ?? DEFAULT_W}
            height={naturalDims?.h ?? DEFAULT_H}
            draggable={false}
            decoding="async"
            fetchPriority="high"
            onLoad={(e) => {
              // Skip if lightbox closed while the image was loading
              // (race against the open→close transition).
              if (!openRef.current) return;
              const img = e.currentTarget;
              if (img.naturalWidth && img.naturalHeight) {
                setNaturalDims({ w: img.naturalWidth, h: img.naturalHeight });
              }
            }}
            className={cn(
              "block select-none",
              mode === "fit"
                // CSS-scaled to fit the container (max-w/max-h on parent
                // constrains the wrapper; the image fills it while keeping
                // the 9/16 aspect via w-auto / h-auto).
                ? "h-full w-auto max-h-[calc(100vh-8rem)] max-w-full"
                // Natural pixel size, overflows the container for panning.
                // Tailwind preflight's `img { max-width: 100%; }` would
                // clamp the image to the container width — we override
                // with max-w-none so the user actually sees the full
                // 768×1376 / 1024×1835 source (and can scroll it).
                : "h-auto w-auto max-w-none",
            )}
            style={
              mode !== "fit" && mode !== "100%"
                ? {
                    // CSS scale on top of natural pixel size. NOT new
                    // pixels — pixelated zoom for inspection. We use
                    // transform (not width/height) so the source
                    // resolution is preserved for the user to pan
                    // around at original pixel fidelity, then upscaled
                    // by the GPU for display.
                    transform: `scale(${zoomMul})`,
                    transformOrigin: "top left",
                  }
                : undefined
            }
          />
        </div>

        {/* Caption + mode controls + download row */}
        <figcaption className="flex w-full flex-wrap items-center justify-between gap-3 rounded-md bg-card/95 px-4 py-2.5 text-sm shadow-card backdrop-blur">
          <div className="flex min-w-0 items-center gap-2 text-foreground">
            <span className="font-serif truncate">{caption ?? alt}</span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Mode controls (Round 31):
                - "适应" = fit-to-viewport (whole image visible)
                - "100%" = native pixel size, overflows + pans
                - "150%" / "200%" = pixelated zoom-in beyond natural
                  (CSS scale on top of 100%, NOT new resolution)
                - Left button (ZoomOut) always resets to fit
                - Middle label shows current mode + doubles as reset
                - Right button (ZoomIn) cycles 100% → 150% → 200% */}
            <div
              role="group"
              aria-label="显示模式"
              className="flex items-center gap-0.5 rounded-md border border-border bg-card/50 p-0.5"
            >
              <button
                type="button"
                onClick={zoomOut}
                disabled={mode === "fit"}
                aria-label="缩小到适应窗口"
                className={cn(
                  // Round 19 fix: bumped min-h/min-w from 32px to 44px to
                  // satisfy WCAG 2.5.5 touch target on the 3 mode-toggle
                  // buttons. The other 2 buttons (close, download) were
                  // already 44px; these slipped through Round 14's audit.
                  "grid h-10 w-10 min-h-[44px] min-w-[44px] place-items-center rounded text-foreground",
                  "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
                  "transition-colors",
                )}
              >
                <ZoomOut className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={zoomOut}
                disabled={mode === "fit"}
                aria-label="重置为适应窗口"
                className={cn(
                  "min-h-[44px] min-w-[64px] rounded px-2 text-xs font-medium tabular-nums text-foreground",
                  "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent",
                  "transition-colors",
                )}
              >
                {mode === "fit" ? (
                  <span>适应</span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" aria-hidden="true" />
                    适应
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={zoomIn}
                disabled={mode === "200%"}
                aria-label={
                  mode === "fit"
                    ? "放大到原始 100% 尺寸"
                    : mode === "100%"
                      ? "放大到 150%"
                      : mode === "150%"
                        ? "放大到 200%"
                        : "已到最大放大"
                }
                className={cn(
                  "grid h-10 w-10 min-h-[44px] min-w-[44px] place-items-center rounded text-foreground",
                  "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
                  "transition-colors",
                )}
              >
                <ZoomIn className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Mode indicator pill — shows the current mode label
                (100% / 150% / 200%) on the right side of the caption.
                Hidden in fit mode (the "适应" label already covers it). */}
            {mode !== "fit" && (
              <span
                aria-live="polite"
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium tabular-nums text-foreground"
              >
                <Maximize className="h-3 w-3" aria-hidden="true" />
                {mode}
                {(mode === "150%" || mode === "200%") && (
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                    · 像素放大
                  </span>
                )}
              </span>
            )}

            {filename && (
              <a
                href={src}
                download={`${filename}.webp`}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-md bg-gold-deep px-3 py-1.5 text-xs font-medium text-cream",
                  "hover:bg-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "transition-colors",
                )}
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                下载原图
              </a>
            )}
          </div>
        </figcaption>
      </figure>
    </div>
  );
}

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
 * Zoom model (2026-06-15 fix — was a fake CSS transform: scale()
 * on a 600w PNG, looked pixelated):
 * - Default: `fit` — the 1024w image is rendered at its natural
 *   aspect (9/16) and CSS-scaled down to fit the viewport, with
 *   `object-contain` so the user sees the whole picture.
 * - `100%` (or "原始尺寸") — the image is shown at native 1024×1820
 *   pixels, overflowing the container. The user can scroll inside
 *   the modal to pan around, or use the `+` / `-` keyboard shortcut.
 * - Click on the image toggles `fit` ↔ `100%` (cursor: zoom-in
 *   at fit, zoom-out at 100%).
 *
 * Image source is `image_full` (1024w WebP) passed in by the parent.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, Download, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
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
 *  or 100% natural pixel size (overflows, user can pan). */
type DisplayMode = "fit" | "natural";

/** Default size for the -full.webp tier. The matrix image generator
 *  returns 1536w; resize-cards.mjs was supposed to scale down to
 *  1024w but `withoutEnlargement: true` was wrong (1536 < 2048
 *  source → no-op, files stayed 1536w). The 1024w tier was finally
 *  realized by scripts/reencode-full-webp.mjs (2026-06-16) which
 *  also re-encoded PNG → WebP (334 MB → 19 MB, fits Vercel Hobby
 *  100 MB static upload cap).
 *
 *  We pass these as `width` / `height` to next/image as a layout
 *  hint to prevent CLS while the image loads. Once loaded, we read
 *  the real `naturalWidth` / `naturalHeight` so the 'natural' mode
 *  renders at the actual aspect ratio (some cards are 1024×1820,
 *  others 1024×1835, etc). */
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

  // ESC closes; + / - toggles fit ↔ natural; 0 / r resets to fit
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
        setMode("natural");
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setMode("fit");
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
  // stuck at natural, which overflows the viewport on a smaller screen)
  useEffect(() => {
    if (open) setMode("fit");
  }, [open]);

  const toggleMode = useCallback(() => {
    setMode((m) => (m === "fit" ? "natural" : "fit"));
  }, []);

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
            mode === "fit"
              ? "overflow-hidden cursor-zoom-in"
              : "overflow-auto cursor-zoom-out",
          )}
          style={{
            maxHeight: "calc(100vh - 8rem)",
            maxWidth: "calc(100vw - 2rem)",
          }}
          onClick={toggleMode}
        >
          {/* Render at intrinsic 1024×1820. In 'fit' mode, CSS scales
              the wrapper down to viewport via the outer max-w/max-h
              + object-contain-style behavior. In 'natural' mode, the
              image overflows the container (overflow-auto lets the
              user pan with mouse wheel / scroll). */}
          <Image
            src={src}
            alt={alt}
            width={naturalDims?.w ?? DEFAULT_W}
            height={naturalDims?.h ?? DEFAULT_H}
            sizes="(max-width: 1024px) 100vw, 1024px"
            quality={95}
            priority
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget as HTMLImageElement;
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
                : "h-auto w-auto",
            )}
          />
        </div>

        {/* Caption + mode controls + download row */}
        <figcaption className="flex w-full flex-wrap items-center justify-between gap-3 rounded-md bg-card/95 px-4 py-2.5 text-sm shadow-card backdrop-blur">
          <div className="flex min-w-0 items-center gap-2 text-foreground">
            <span className="font-serif truncate">{caption ?? alt}</span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Mode controls — was a fake '100%/150%/200%/300%' CSS
                transform: scale() (bug fix 2026-06-15: the scale only
                stretched pixels, no real resolution). Now toggles
                between 'fit' (whole image, scaled to viewport) and
                '100%' (native 1024w, overflows + pans). The middle
                label doubles as a reset to 'fit'. */}
            <div
              role="group"
              aria-label="显示模式"
              className="flex items-center gap-0.5 rounded-md border border-border bg-card/50 p-0.5"
            >
              <button
                type="button"
                onClick={() => setMode("fit")}
                disabled={mode === "fit"}
                aria-label="适应窗口"
                className={cn(
                  "grid h-8 w-8 min-h-[32px] min-w-[32px] place-items-center rounded text-foreground",
                  "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
                  "transition-colors",
                )}
              >
                <ZoomOut className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setMode("fit")}
                disabled={mode === "fit"}
                aria-label="重置为适应窗口"
                className={cn(
                  "min-h-[32px] min-w-[52px] rounded px-1.5 text-xs font-medium tabular-nums text-foreground",
                  "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent",
                  "transition-colors",
                )}
              >
                {mode === "natural" ? (
                  <span className="inline-flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" aria-hidden="true" />
                    适应
                  </span>
                ) : (
                  "适应"
                )}
              </button>
              <button
                type="button"
                onClick={() => setMode("natural")}
                disabled={mode === "natural"}
                aria-label="原始 100% 尺寸"
                className={cn(
                  "grid h-8 w-8 min-h-[32px] min-w-[32px] place-items-center rounded text-foreground",
                  "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
                  "transition-colors",
                )}
              >
                <ZoomIn className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

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

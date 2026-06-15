"use client";

/**
 * Lightbox — fullscreen modal image viewer.
 *
 * Design choices (Plan A: 自建 client component):
 * - 0 dependencies, full control over the cream/gold brand
 * - Uses bg-scrim (--scrim CSS var) for the backdrop, matches the
 *   design system token (same as other overlays would)
 * - ESC closes; click on backdrop closes; body scroll locked while
 *   open; focus is trapped by the close button being the only focusable
 *   element (good enough for a 1-image viewer — full focus trap
 *   would need yet-another-react-lightbox or a focus-trap lib)
 * - scale-in keyframe (already in tailwind.config) gives a subtle
 *   open animation
 * - Zoom controls: + / - buttons in the footer (was a decorative
 *   icon that did nothing — fixed in commit immediately after first
 *   ship). 1× / 1.5× / 2× / 3× via CSS transform: scale() so we
 *   don't need a higher-res source. + / - keyboard shortcuts work
 *   when the lightbox has focus.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, Download, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface LightboxProps {
  open: boolean;
  onClose: () => void;
  src: string;
  alt: string;
  /** Optional filename for the download link (e.g. "labrador-retriever") */
  filename?: string;
  /** Optional caption shown below the image (e.g. card subtitle) */
  caption?: string;
}

const ZOOM_LEVELS = [1, 1.5, 2, 3] as const;
type ZoomLevel = (typeof ZOOM_LEVELS)[number];

export function Lightbox({ open, onClose, src, alt, filename, caption }: LightboxProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [zoom, setZoom] = useState<ZoomLevel>(1);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC closes; +/- adjusts zoom; 0 resets
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Ignore when the user is typing in an input (none in this
      // modal, but defensive in case we add a caption input later)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((z) => ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, ZOOM_LEVELS.indexOf(z) + 1)] ?? z);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom((z) => ZOOM_LEVELS[Math.max(0, ZOOM_LEVELS.indexOf(z) - 1)] ?? z);
      } else if (e.key === "0") {
        e.preventDefault();
        setZoom(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Auto-focus the close button so keyboard users can dismiss immediately
  useEffect(() => {
    if (open) closeBtnRef.current?.focus();
  }, [open]);

  // Reset zoom when the lightbox re-opens (otherwise it would stay
  // at the last level across sessions and confuse the user)
  useEffect(() => {
    if (open) setZoom(1);
  }, [open]);

  const zoomIn = useCallback(() => {
    setZoom((z) => ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, ZOOM_LEVELS.indexOf(z) + 1)] ?? z);
  }, []);
  const zoomOut = useCallback(() => {
    setZoom((z) => ZOOM_LEVELS[Math.max(0, ZOOM_LEVELS.indexOf(z) - 1)] ?? z);
  }, []);
  const zoomReset = useCallback(() => setZoom(1), []);

  if (!open) return null;

  const canZoomIn = zoom < ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
  const canZoomOut = zoom > ZOOM_LEVELS[0];
  const isZoomed = zoom > 1;

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
          bubbling) so right-click / long-press on the image stays put.
          When zoomed in, the image overflows; overflow-auto on the
          inner div lets the user pan around the larger image. */}
      <figure
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] flex-col items-center gap-3 animate-scale-in"
      >
        <div
          className={cn(
            "relative overflow-auto rounded-lg shadow-dark-card ring-1 ring-border/40",
            isZoomed ? "cursor-zoom-out" : "cursor-zoom-in",
          )}
          style={{ maxHeight: "calc(100vh - 8rem)", maxWidth: "calc(100vw - 2rem)" }}
          onClick={() => (isZoomed ? zoomReset() : zoomIn())}
        >
          <Image
            src={src}
            alt={alt}
            width={900}
            height={1600}
            sizes="(max-width: 768px) 100vw, 900px"
            quality={95}
            priority
            className="block w-auto max-w-none select-none"
            style={{
              // At 1× the image is constrained to the viewport; at higher
              // zoom levels it grows past the container (which is
              // overflow-auto so the user can pan). maxHeight on the
              // parent only applies at 1×; once scaled, the rendered
              // image is larger and pannable.
              maxHeight: zoom === 1 ? "calc(100vh - 8rem)" : undefined,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              transition: "transform 200ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            draggable={false}
          />
        </div>

        {/* Caption + zoom controls + download row */}
        <figcaption className="flex w-full flex-wrap items-center justify-between gap-3 rounded-md bg-card/95 px-4 py-2.5 text-sm shadow-card backdrop-blur">
          <div className="flex min-w-0 items-center gap-2 text-foreground">
            <span className="font-serif truncate">{caption ?? alt}</span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Zoom controls — previously a decorative icon (bug fixed
                2026-06-15). + / - / reset. Disabled state at the
                bounds, with a clear 100% label so the user always
                knows the current level. */}
            <div
              role="group"
              aria-label="缩放"
              className="flex items-center gap-0.5 rounded-md border border-border bg-card/50 p-0.5"
            >
              <button
                type="button"
                onClick={zoomOut}
                disabled={!canZoomOut}
                aria-label="缩小"
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
                onClick={zoomReset}
                disabled={!isZoomed}
                aria-label={`重置缩放 (当前 ${Math.round(zoom * 100)}%)`}
                className={cn(
                  "min-h-[32px] min-w-[44px] rounded px-1.5 text-xs font-medium tabular-nums text-foreground",
                  "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent",
                  "transition-colors",
                )}
              >
                {isZoomed ? (
                  <span className="inline-flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" aria-hidden="true" />
                    {Math.round(zoom * 100)}%
                  </span>
                ) : (
                  "100%"
                )}
              </button>
              <button
                type="button"
                onClick={zoomIn}
                disabled={!canZoomIn}
                aria-label="放大"
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
                download={`${filename}.png`}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-md bg-gold-deep px-3 py-1.5 text-xs font-medium text-cream",
                  "hover:bg-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "transition-colors",
                )}
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                下载
              </a>
            )}
          </div>
        </figcaption>
      </figure>
    </div>
  );
}

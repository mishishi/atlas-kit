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
 *   zoom-in feel
 * - Forwards ref to the image so the trigger can do a FLIP-style
 *   open animation later (not implemented in Plan A — keep simple)
 */
import { useEffect, useRef } from "react";
import Image from "next/image";
import { X, Download, ZoomIn } from "lucide-react";
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

export function Lightbox({ open, onClose, src, alt, filename, caption }: LightboxProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Auto-focus the close button so keyboard users can dismiss immediately
  useEffect(() => {
    if (open) closeBtnRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim animate-fade-in p-4 sm:p-8"
    >
      {/* Close (X) — top right. Click doesn't bubble to the backdrop
          because the close button has its own onClick that calls
          onClose, and the backdrop onClick is the only onClick on
          the outer div. The X button is above the inner content
          so clicks on it don't reach the backdrop. */}
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

      {/* Image container — click here does NOT close (stops bubbling)
          so the user can right-click / long-press the image without
          accidentally dismissing. */}
      <figure
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] flex-col items-center gap-3 animate-scale-in"
      >
        <div className="relative overflow-hidden rounded-lg shadow-dark-card ring-1 ring-border/40">
          {/* The image is rendered at the natural card aspect (9/16)
              and scaled to fit the viewport. The width/height is the
              full card aspect rectangle — Next/Image will fit the
              actual image inside without cropping. */}
          <Image
            src={src}
            alt={alt}
            width={900}
            height={1600}
            sizes="(max-width: 768px) 100vw, 900px"
            quality={95}
            className="max-h-[calc(100vh-8rem)] w-auto max-w-[calc(100vw-2rem)] object-contain"
            priority
          />
        </div>

        {/* Caption + download row */}
        <figcaption className="flex w-full items-center justify-between gap-3 rounded-md bg-card/95 px-4 py-2.5 text-sm shadow-card backdrop-blur">
          <div className="flex min-w-0 items-center gap-2 text-foreground">
            <ZoomIn className="h-4 w-4 shrink-0 text-gold-deep" aria-hidden="true" />
            <span className="truncate font-serif">{caption ?? alt}</span>
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
        </figcaption>
      </figure>
    </div>
  );
}

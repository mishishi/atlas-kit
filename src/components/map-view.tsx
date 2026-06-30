"use client";

/**
 * MapView — Leaflet (CDN) wrapper rendered as a single useEffect.
 * 12 markers over a China-centered OSM tile layer. Pin click opens
 * a popup with the card thumb + title + subtitle, linking to the
 * card detail page.
 *
 * Why plain Leaflet (not react-leaflet):
 *   - 0 new dependencies, 0 SSR headaches (we're already client)
 *   - For 12 static markers, the imperative API is faster to
 *     read and runs in ~150 lines vs 200+ with react-leaflet +
 *     dynamic import + leaflet CSS imports
 *
 * Why a custom gold pin instead of the default blue marker:
 *   the cream/gold/ink brand requires warm tones. The default
 *   Leaflet blue clashes with the page.
 *
 * React 18 strict-mode safety: useEffect's [markers] dep is unstable
 * (parent passes a fresh array each render), so we instead key the
 * effect on a stable markers-fingerprint + use a ref to read the
 * current markers inside the effect. This way re-renders don't
 * tear down the map.
 *
 * Popup safety (2026-06-16 fix — audit C4): previously used
 * `marker.bindPopup(string)` which is an innerHTML sink. The 600
 * card subtitles are all editorially safe, but a future content
 * edit with `</a><script>` would be RCE. Now we build the popup
 * as a real DOM node and pass it to bindPopup, escaping all
 * text values explicitly.
 */
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface MapMarker {
  slug: string;
  title: string;
  subtitle: string;
  image: string;
  kind: string;
  lat: number;
  lng: number;
}

interface MapViewProps {
  markers: MapMarker[];
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_JS_INTEGRITY = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
const LEAFLET_CSS_INTEGRITY = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";

// Pin sizing — 36×36 keeps the 44×44 touch-target rule when the user
// taps slightly off the pin (Leaflet expands the hit area implicitly
// for touch events on small markers). Original was 28×28 which was
// under the WCAG 2.5.5 minimum.
const PIN_SIZE = 36;
const PIN_ANCHOR = 18;

function loadCss(href: string, integrity: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[href="${href}"]`)) return resolve();
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.integrity = integrity;
    link.crossOrigin = "";
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load ${href}`));
    document.head.appendChild(link);
  });
}

function loadScript(src: string, integrity: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).L) return resolve();
      const start = Date.now();
      const t = setInterval(() => {
        if ((window as any).L) {
          clearInterval(t);
          resolve();
        } else if (Date.now() - start > 2000) {
          clearInterval(t);
          reject(new Error("Script already in DOM but `L` never appeared"));
        }
      }, 50);
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.integrity = integrity;
    s.crossOrigin = "";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

/** Build the popup DOM for a marker. Returns a real HTMLElement so
 *  we can pass it to Leaflet's `bindPopup(node, opts)` and never
 *  touch innerHTML. All text content uses textContent (auto-escaped).
 *
 *  Round 18 fix: text colors were hard-coded hex (#2e2a24 / #6f6a5e /
 *  #87603f). The popup wrapper itself uses hsl(var(--background)) so
 *  it flips on theme change, but the inner text stayed dark, which
 *  crashed contrast on dark mode (wrapper became deep charcoal but
 *  text stayed near-black). Now all text uses `color: inherit` and
 *  the theme-aware color comes from globals.css `.atlas-popup` rules.
 *  Class `atlas-popup-content` on the text wrapper is the hook. */
function buildPopupNode(m: MapMarker): HTMLDivElement {
  const root = document.createElement("div");
  root.style.cssText = "display: flex; gap: 10px; align-items: center; text-decoration: none; color: inherit;";

  const link = document.createElement("a");
  link.href = `/cards/${m.slug}`;
  link.style.cssText = "display: flex; gap: 10px; align-items: center; text-decoration: none; color: inherit; min-width: 0;";

  // Thumbnail
  const thumb = document.createElement("div");
  thumb.className = "atlas-popup-thumb";
  thumb.style.cssText = "position: relative; width: 48px; height: 64px; flex-shrink: 0; border-radius: 4px; overflow: hidden;";
  const img = document.createElement("img");
  img.src = m.image;
  img.alt = m.title; // alt is attribute, NOT innerHTML — safe
  img.style.cssText = "width: 100%; height: 100%; object-fit: cover;";
  thumb.appendChild(img);

  // Text
  const textWrap = document.createElement("div");
  textWrap.className = "atlas-popup-text";
  textWrap.style.cssText = "min-width: 0;";
  const title = document.createElement("p");
  title.className = "atlas-popup-title";
  title.style.cssText = "font-family: serif; font-weight: 600; font-size: 14px; line-height: 1.2; margin: 0;";
  title.textContent = m.title; // textContent auto-escapes
  const sub = document.createElement("p");
  sub.className = "atlas-popup-sub";
  sub.style.cssText = "text-align: left; font-size: 11px; margin-top: 2px; margin-bottom: 0;";
  sub.textContent = m.subtitle || "";
  const cta = document.createElement("p");
  cta.className = "atlas-popup-cta";
  cta.style.cssText = "text-align: left; font-size: 11px; margin-top: 4px; margin-bottom: 0;";
  cta.textContent = "→ 查看图鉴";

  textWrap.appendChild(title);
  textWrap.appendChild(sub);
  textWrap.appendChild(cta);
  link.appendChild(thumb);
  link.appendChild(textWrap);
  root.appendChild(link);
  return root;
}

export function MapView({ markers }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<MapMarker[]>(markers);
  markersRef.current = markers;
  // Client-side name search (C5 fix). Server can't filter the popup
  // markers, so we re-filter the displayed set on the client.
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "empty">(
    markers.length === 0 ? "empty" : "loading",
  );

  // Pin -> Leaflet marker handle, so we can show/hide on search.
  const markerHandles = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    if (markers.length === 0) {
      setStatus("empty");
      return;
    }

    (async () => {
      try {
        await Promise.all([
          loadCss(LEAFLET_CSS, LEAFLET_CSS_INTEGRITY),
          loadScript(LEAFLET_JS, LEAFLET_JS_INTEGRITY),
        ]);
        if (cancelled) return;
        const L = (window as any).L;
        if (!L) {
          console.error("Leaflet loaded but window.L is not set");
          return;
        }
        if (!containerRef.current) return;

        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        markerHandles.current.clear();

        const map = L.map(containerRef.current, {
          center: [34.5, 105],
          zoom: 4,
          minZoom: 3,
          maxZoom: 18,
          scrollWheelZoom: true,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        for (const m of markersRef.current) {
          const icon = L.divIcon({
            className: "atlas-marker",
            html: `<div style="
              width: ${PIN_SIZE}px; height: ${PIN_SIZE}px; border-radius: 50%;
              background: hsl(28 32% 33%);
              border: 3px solid hsl(38 30% 92%);
              box-shadow: 0 2px 6px rgba(0,0,0,0.25);
              display: flex; align-items: center; justify-content: center;
              color: hsl(38 30% 92%); font-family: serif; font-size: 16px;
              font-weight: 700;
            ">${escapeHtml(m.title).slice(0, 1)}</div>`,
            iconSize: [PIN_SIZE, PIN_SIZE],
            iconAnchor: [PIN_ANCHOR, PIN_ANCHOR],
          });
          const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
          // C4 fix: build popup from DOM, no innerHTML sink
          const popupNode = buildPopupNode(m);
          marker.bindPopup(popupNode, {
            maxWidth: 240,
            className: "atlas-popup",
          });
          markerHandles.current.set(m.slug, marker);
        }

        mapRef.current = map;
        setStatus("ready");
        setTimeout(() => {
          if (mapRef.current) mapRef.current.invalidateSize();
        }, 100);
      } catch (e) {
        console.error("Failed to initialize map:", e);
        if (containerRef.current && !cancelled) {
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // C5: client-side search filter — toggle marker visibility by slug
  useEffect(() => {
    if (status !== "ready") return;
    const q = query.trim().toLowerCase();
    if (!q) {
      // Show all
      for (const m of markerHandles.current.values()) {
        if (!mapRef.current) continue;
        if (m.getElement && m.getElement().style.display === "none") {
          m.addTo(mapRef.current);
        }
      }
      return;
    }
    for (const [slug, m] of markerHandles.current.entries()) {
      const card = markersRef.current.find((x) => x.slug === slug);
      if (!card) continue;
      const hay = `${card.title} ${card.subtitle} ${card.kind}`.toLowerCase();
      const hit = hay.includes(q);
      if (hit) {
        if (m.getElement && m.getElement().style.display === "none") {
          m.addTo(mapRef.current);
        }
      } else {
        if (mapRef.current && m.getElement) m.getElement().style.display = "none";
      }
    }
  }, [query, status]);

  // 0-card state
  if (status === "empty") {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
        <p className="font-serif text-base font-semibold mb-2">暂无带坐标的图鉴</p>
        <p className="text-sm text-muted-foreground">
          极光 (全球) 与抽象概念暂无坐标, 留在文本图鉴里. 等收录了带地理坐标的图鉴, 它们会出现在这.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* C5: client-side search input. Pure filter on the markers we
          already have, no API roundtrip. */}
      <div className="relative max-w-md">
        <label htmlFor="map-search" className="sr-only">
          按名称筛选地图标记
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id="map-search"
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder="按名称搜索 (例: 故宫 / 兵马俑)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-[44px] w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <div className="relative">
        <div
          ref={containerRef}
          className={cn(
            "h-[70vh] min-h-[500px] w-full rounded-lg border border-border shadow-card overflow-hidden bg-muted",
            status === "error" && "hidden",
          )}
          role="region"
          aria-label="图鉴地理分布地图"
        />
        {/* Error state — replaces the map container's innerHTML (the
            earlier approach lost the rounded border). Now we layer a
            full-size overlay on top of the empty container. */}
        {status === "error" && (
          <div className="grid h-[70vh] min-h-[500px] w-full place-items-center rounded-lg border border-border bg-card text-center">
            <div>
              <p className="font-serif text-base font-semibold mb-2">地图加载失败</p>
              <p className="text-sm text-muted-foreground">请检查网络连接后刷新重试.</p>
            </div>
          </div>
        )}
        {/* No-JS fallback: a static list of geo cards. Rendered in
            HTML so users with JS disabled (or a11y readers) can still
            reach every marker. */}
        <noscript>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {markers.map((m) => (
              <li key={m.slug}>
                <a
                  href={`/cards/${m.slug}`}
                  className="flex items-center gap-3 rounded-md border border-border bg-card p-3 hover:border-gold"
                >
                  <Image
                    src={m.image}
                    alt={m.title}
                    width={48}
                    height={64}
                    className="rounded-sm object-cover"
                  />
                  <span className="font-serif text-sm font-medium">{m.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </noscript>
      </div>
    </div>
  );
}

/** Local HTML escape for the icon's first-character label only.
 *  Leaflet uses this as innerHTML, but we only pass 1 character
 *  (a CJK ideograph or letter) and escape just to be safe. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

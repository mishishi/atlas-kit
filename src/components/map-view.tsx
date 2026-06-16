"use client";

/**
 * MapView — Leaflet (CDN) wrapper rendered as a single useEffect.
 * 12 markers over a China-centered OSM tile layer. Pin click jumps
 * to the card's detail page.
 *
 * Why plain Leaflet (not react-leaflet):
 *   - 0 new dependencies, 0 SSR headaches (we're already client)
 *   - For 12 static markers, the imperative API is faster to
 *     read and runs in 80 lines vs 200 with react-leaflet +
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
 */
import { useEffect, useRef } from "react";

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
      // Already in the DOM. If `L` is set we resolve immediately;
      // otherwise poll briefly to wait for in-flight execution.
      if ((window as any).L) return resolve();
      // Give the in-flight script up to 2s to expose `L` (handles
      // the common case where the same useEffect re-runs while the
      // first script is still loading)
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

export function MapView({ markers }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  // Stash the latest markers in a ref so the init effect can read
  // them without re-running (markers is a fresh array each render).
  const markersRef = useRef<MapMarker[]>(markers);
  markersRef.current = markers;

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

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

        // Tear down any previous map (StrictMode double-mount,
        // or HMR re-runs the effect)
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

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
              width: 28px; height: 28px; border-radius: 50%;
              background: hsl(28 32% 33%);
              border: 3px solid hsl(38 30% 92%);
              box-shadow: 0 2px 6px rgba(0,0,0,0.25);
              display: flex; align-items: center; justify-content: center;
              color: hsl(38 30% 92%); font-family: serif; font-size: 14px;
              font-weight: 700;
            ">${m.title.slice(0, 1)}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
          const popupHtml = `
            <a href="/cards/${m.slug}" style="display: flex; gap: 10px; align-items: center; text-decoration: none; color: inherit;">
              <div style="position: relative; width: 48px; height: 64px; flex-shrink: 0; border-radius: 4px; overflow: hidden; background: #f5f0e6;">
                <img src="${m.image}" alt="${m.title}" style="width: 100%; height: 100%; object-fit: cover;" />
              </div>
              <div style="min-width: 0;">
                <p style="font-family: serif; font-weight: 600; font-size: 14px; line-height: 1.2; color: #2e2a24;">${m.title}</p>
                <p style="text-align: left; font-size: 11px; color: #6f6a5e; margin-top: 2px;">${m.subtitle || ""}</p>
                <p style="text-align: left; font-size: 11px; color: #87603f; margin-top: 4px;">→ 查看图鉴</p>
              </div>
            </a>
          `;
          marker.bindPopup(popupHtml, {
            maxWidth: 240,
            className: "atlas-popup",
          });
        }

        mapRef.current = map;
        // Force a redraw in case the container was sized after
        // L.map() initialized (common when the page just loaded)
        setTimeout(() => {
          if (mapRef.current) mapRef.current.invalidateSize();
        }, 100);
      } catch (e) {
        console.error("Failed to initialize map:", e);
        if (containerRef.current) {
          containerRef.current.innerHTML =
            '<div style="padding: 24px; color: #6f6a5e; font-size: 14px;">地图加载失败, 请检查网络连接后刷新重试。</div>';
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
    // Intentionally only run once on mount. Markers updates are
    // picked up via markersRef inside the effect. (If the marker
    // set ever changes in a way that needs re-rendering, bump
    // this dep and handle the re-add case.)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-[70vh] min-h-[500px] w-full rounded-lg border border-border shadow-card overflow-hidden bg-muted"
      role="region"
      aria-label="图鉴地理分布地图"
    />
  );
}

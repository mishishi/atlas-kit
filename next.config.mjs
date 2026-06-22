import bundleAnalyzer from "@next/bundle-analyzer";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 2026-06-21: cards.json image paths were migrated from local /cards/
  // to 微信小程序 CloudBase CDN (https://636c-cloud1-d9gv1q8ikad5e9721-1442530204.tcb.qcloud.la).
  // next/image needs remotePatterns to optimize external URLs — without it,
  // server SSR (build time) and client hydration disagree on the <img>
  // markup → "Expected server HTML to contain a matching <path> in <svg>"
  // hydration errors on the home page (where 5 hero collage <Image> + 5
  // series cover <Image> + 8 featured <Image> all use CDN URLs).
  images: {
    // 2026-06-21: cards.json image paths were migrated to 微信小程序 CloudBase
    // CDN. unoptimized: true bypasses next/image's optimizer entirely:
    //   1. CloudBase doesn't return Access-Control-Allow-Origin or
    //      Cache-Control headers, so the optimizer throws "upstream response
    //      is invalid" errors at runtime.
    //   2. CDN already serves the right format + size per tier
    //      (thumb.webp 384w / card.png 600w / full.webp 1024w).
    //   3. We save the optimizer's fetch round-trip.
    //
    // Trade-off: no responsive resize or auto-format conversion. CDN already
    // serves correct format, and we use fixed sizes via fill + sizes= attrs.
    // remotePatterns omitted — unoptimized mode bypasses the loader, so they're
    // not consulted (and removing them avoids a /_document PageNotFoundError
    // seen during build when both are set together).
    unoptimized: true,
  },
  // R55 (2026-06-22): redirects() removed. Previously we kept 391 × 3 =
  // 1173 301 redirects mapping old flat paths (`/cards/<slug>-card.png`)
  // → new per-card-dir paths (`/cards/<kind>/<slug>/<slug>-card.png`).
  // That was needed R26 (when we migrated the local disk layout).
  //
  // Now post-R55, all 391 cards.json image fields point at CloudBase
  // CDN URLs (no local refs). The old flat-path URLs were never
  // publicly indexed (the R26 migration happened within 2 weeks of
  // launch and we have no external flat-path links in the wild).
  // Removed 1173 routes to clear the "exceeds 1000" build warning.
  // If pre-R26 share links 404 in the wild, easy to add 1 catch-all
  // `{ source: '/cards/:slug-:rest', destination: '/cards', permanent: true }`.
  // P4: security headers (CSP-style baseline; CSP itself left to hosting).
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

// P1: bundle analyzer — `ANALYZE=true npm run build` opens the report.
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

export default withBundleAnalyzer(nextConfig);

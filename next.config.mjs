import bundleAnalyzer from "@next/bundle-analyzer";
import fs from "node:fs";
import path from "node:path";

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
  // Round 26 (2026-06-17): redirect old flat card paths to the new
  // per-card directory layout. Old `/cards/<slug>-{card,thumb,full}.{png,webp}`
  // → `/cards/<kind>/<slug>/<slug>-{card,thumb,full}.{png,webp}`.
  //
  // Why a 301 (permanent): preserves SEO + share-link equity from any
  // externally-linked URL (微信 / Twitter / search engines). Vercel
  // serves these redirects at the edge, no runtime cost.
  //
  // The slug→kind mapping is built at config-load time from the
  // canonical cards.json (single source of truth). The redirect is
  // slug-agnostic — it derives kind from cards.json per slug, so
  // adding a new kind in src/lib/types.ts needs no change here.
  async redirects() {
    const cards = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "data", "cards.json"), "utf8"),
    );
    const cardSlugToKind = Object.fromEntries(cards.map((c) => [c.slug, c.kind]));
    const suffixes = ["card.png", "thumb.webp", "full.webp"];
    const out = [];
    for (const slug of Object.keys(cardSlugToKind)) {
      const kind = cardSlugToKind[slug];
      for (const suf of suffixes) {
        const oldPath = `/cards/${slug}-${suf}`;
        const newPath = `/cards/${kind}/${slug}/${slug}-${suf}`;
        out.push({
          source: oldPath,
          destination: newPath,
          permanent: true, // 301
        });
      }
    }
    return out;
  },
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

import bundleAnalyzer from "@next/bundle-analyzer";
import fs from "node:fs";
import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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

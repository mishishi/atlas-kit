// Edge-safe brand tokens — for contexts that cannot use CSS vars.
//
// Why this file exists
// ─────────────────────
// Atlas Kit's design tokens are HSL triplets declared in
// src/app/globals.css and consumed via Tailwind's `hsl(var(--token))`
// utility. That pipeline requires the CSS bundle to be parsed at
// render time, which is NOT available in:
//
//   1. next/og ImageResponse (opengraph-image.tsx) — edge runtime,
//      cannot import CSS modules or read :root CSS vars
//   2. favicon/icon route (icon.tsx) — same edge runtime
//   3. global-error.tsx — runs OUTSIDE the root layout (i.e.
//      before Tailwind/CSS loads), so CSS vars are not yet
//      applied to the document
//
// The colors below are duplicated from globals.css as RGB hex
// strings. Update both files together when re-branding.
//
// Note: this is a deliberate trade-off (single source of truth
// in globals.css is the goal, but the three edge contexts above
// can't reach it). If you rebrand, update all four places:
//   1. src/app/globals.css (lines 14-66, 109-121)
//   2. src/lib/edge-tokens.ts (this file)
//   3. tailwind.config.ts (no — these are derived from CSS vars
//      via hsl(var(--*)), no duplication needed)
//   4. smoke-test the three edge surfaces after rebranding

export const EDGE_TOKENS = {
  // Brand surfaces (light mode)
  cream: "#F5F0E6",          // --background, --surface, --brand-cream
  creamDeep: "#E5DED0",     // --border, --input, --brand-line
  ink: "#2E2A24",            // --foreground, --card-foreground
  inkSoft: "#6B655A",       // --muted-foreground
  inkMute: "#9C9588",       // --muted
  // Brand primary (light mode)
  gold: "#B8956A",           // --primary, --brand-gold
  goldDeep: "#87603F",       // --brand-gold-deep (P1 darkened for AA)
  // Status
  destructive: "#C97064",   // --destructive
  destructiveSoft: "rgba(201, 112, 100, 0.1)", // derived from --destructive
  // White (for buttons on light bg)
  white: "#FFFFFF",
} as const;

export type EdgeToken = keyof typeof EDGE_TOKENS;

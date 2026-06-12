import type { Config } from "tailwindcss";

/**
 * Atlas Kit design tokens — sourced from ui-ux-pro-max v2 design-system queries
 * (Style: "Minimalism & Swiss Style"; Typography: "Magazine Style" — Bodoni/Public Sans).
 *
 * Local fonts: Noto Serif SC + Noto Sans SC (next/font/local), no Google Fonts URL.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // ── Semantic layers (use these for layout) ──
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        elevated: "hsl(var(--elevated))",
        overlay: "hsl(var(--overlay))",
        scrim: "hsl(var(--scrim))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // ── Status (with -soft variants for tinted backgrounds) ──
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          soft: "hsl(var(--destructive-soft))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          soft: "hsl(var(--warning-soft))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          soft: "hsl(var(--success-soft))",
        },
        // ── Brand palette — "Editorial Archive" direction.
        // Pulled from CSS vars so dark mode flips correctly.
        // Use these for explicit brand moments only; prefer semantic tokens above. ──
        cream: "hsl(var(--brand-cream))",
        "cream-deep": "hsl(var(--brand-cream-deep))",
        sage: "hsl(var(--brand-sage))",
        "sage-deep": "hsl(var(--brand-sage-deep))",
        gold: "hsl(var(--brand-gold))",
        "gold-deep": "hsl(var(--brand-gold-deep))",
        ink: "hsl(var(--brand-ink))",
        "ink-soft": "hsl(var(--brand-ink-soft))",
        "ink-mute": "hsl(var(--brand-ink-mute))",
        terracotta: "hsl(var(--brand-terracotta))",
        line: "hsl(var(--brand-line))",
        "line-soft": "hsl(var(--brand-line-soft))",
      },
      borderRadius: {
        // 4/8 dp rhythm — used by skill best practice
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
      },
      fontFamily: {
        // Loaded by next/font/local in layout.tsx — no Google Fonts URL
        sans: [
          "var(--font-sans)",
          '"Helvetica Neue"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          "system-ui",
          "sans-serif",
        ],
        serif: [
          "var(--font-serif)",
          '"Songti SC"',
          '"Source Han Serif SC"',
          '"Noto Serif CJK SC"',
          "Georgia",
          "serif",
        ],
      },
      // skill ux: 4-level elevation scale (was 3, now expanded for hover/active)
      boxShadow: {
        "card": "0 2px 8px rgba(60, 50, 30, 0.04), 0 1px 2px rgba(60, 50, 30, 0.06)",
        "card-hover":
          "0 4px 16px rgba(60, 50, 30, 0.08), 0 2px 4px rgba(60, 50, 30, 0.06)",
        "card-active":
          "0 1px 2px rgba(60, 50, 30, 0.08), 0 0 0 1px rgba(60, 50, 30, 0.04)",
        "dark-card": "0 4px 16px rgba(0, 0, 0, 0.3)",
        "focus-ring": "0 0 0 3px hsl(var(--ring) / 0.4)",
      },
      // skill ux: 8dp spacing rhythm (4/8/12/16/24/32/48/64)
      spacing: {
        "section": "4rem",      // 64px
        "section-sm": "3rem",   // 48px
        "card-pad": "1.25rem",  // 20px
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        // skill §7: spring-physics feel for state changes
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 250ms cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scale-in 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        "shimmer": "shimmer 2s linear infinite",
      },
      transitionTimingFunction: {
        "spring": "cubic-bezier(0.16, 1, 0.3, 1)",
        "ease-out-soft": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
export default config;

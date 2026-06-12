import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ThemeProvider } from "@/components/theme-provider";
import { WebVitals } from "@/components/web-vitals";

// Local fonts only — no Google Fonts URL.
// Files copied from C:\Windows\Fonts into src/app/fonts/.
// Noto Sans SC (sans) + Noto Serif SC (serif) — both are Variable Fonts so
// one file covers all weights (100-900).
const notoSansSC = localFont({
  src: "./fonts/NotoSansSC-VF.ttf",
  variable: "--font-sans",
  display: "swap",
  weight: "100 900",
  fallback: [
    '"PingFang SC"',
    '"Microsoft YaHei"',
    '"Helvetica Neue"',
    "system-ui",
    "sans-serif",
  ],
});

const notoSerifSC = localFont({
  src: "./fonts/NotoSerifSC-VF.ttf",
  variable: "--font-serif",
  display: "swap",
  weight: "100 900",
  fallback: [
    '"Songti SC"',
    '"Source Han Serif SC"',
    '"Noto Serif CJK SC"',
    "Georgia",
    "serif",
  ],
});

export const metadata: Metadata = {
  title: "图鉴社 · Atlas Kit — 系列化中文科普图鉴",
  description: "高质量、可系列化的中文科普图鉴卡片集。浏览、收藏、并通过 AI 一键生成你自己的图鉴。",
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "图鉴社 · Atlas Kit",
    description: "系列化中文科普图鉴卡片集 · 博物馆质感 · AI 一键生成",
    type: "website",
    locale: "zh_CN",
    // images auto-resolved from /opengraph-image.tsx (1200x630)
  },
  twitter: {
    card: "summary_large_image",
    title: "图鉴社 · Atlas Kit",
    description: "系列化中文科普图鉴卡片集",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${notoSansSC.variable} ${notoSerifSC.variable}`}
    >
      <head>
        {/* Preconnect to the matrix CDN so AI-generated images start
            downloading in parallel with the HTML body. Best-effort: misses
            are silent and cost nothing. */}
        <link rel="preconnect" href="https://cdn.minimaxi.com" crossOrigin="anonymous" />
        {/* theme-color: matches brand cream so Safari/Chrome mobile chrome
            blends instead of having a stark white bar. */}
        <meta name="theme-color" content="#f7f2e8" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1a1814" media="(prefers-color-scheme: dark)" />
      </head>
      <body className="min-h-dvh antialiased font-sans">
        <ThemeProvider defaultTheme="light">
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <main id="main" className="flex-1" tabIndex={-1}>{children}</main>
            <SiteFooter />
          </div>
        </ThemeProvider>
        {/* Toast notifications — inherits theme from <html class="dark"> via sonner theme="system" */}
        <Toaster
          position="bottom-center"
          theme="system"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: "font-sans",
              title: "font-serif",
            },
          }}
        />
        <WebVitals />
      </body>
    </html>
  );
}

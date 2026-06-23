"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolvedTheme: "light" | "dark";
}>({
  theme: "system",
  setTheme: () => {},
  resolvedTheme: "light",
});

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  // R55h (2026-06-23): ThemeProvider useState initializer was reading
  // localStorage on the FIRST render (server returns defaultTheme,
  // client reads localStorage). Even though `<ThemeContext.Provider>`
  // doesn't emit a DOM element, the provider's VALUE differs between
  // server and client. React 18 dev mode's hydration checker flags
  // downstream mismatches when the context value flips during
  // hydration — symptom was a misleading
  //   "Expected server HTML to contain a matching <footer> in <div>"
  // on /graph (and other pages), even though SiteFooter rendered
  // correctly on both sides. The `<footer>` was collateral damage:
  // the hydration walker bailed at the first divergence it noticed
  // (ThemeProvider's value mismatch) and reported the closest DOM
  // ancestor's missing element.
  //
  // Fix: keep useState init SSR-safe (always returns defaultTheme on
  // first render). Hydrate the stored value inside useEffect, AFTER
  // the first paint. Same pattern as the R55c ThemeToggle fix
  // (mounted flag + post-mount effect).
  //
  // FOUC prevention: the inline <script> in layout.tsx already
  // applied the .dark class to <html> before paint, so the visual
  // is correct from the first frame. We only need React state to
  // catch up.
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(
    "light",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("theme");
    if (stored === "light" || stored === "dark" || stored === "system") {
      setTheme(stored);
    }
    // resolvedTheme follows the .dark class that the bootstrap
    // <script> already applied — no need to re-read.
    setResolvedTheme(
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    );
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (isDark: boolean) => {
      root.classList.toggle("dark", isDark);
      setResolvedTheme(isDark ? "dark" : "light");
    };
    if (theme === "system") {
      apply(media.matches);
      const handler = (e: MediaQueryListEvent) => apply(e.matches);
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    } else {
      apply(theme === "dark");
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
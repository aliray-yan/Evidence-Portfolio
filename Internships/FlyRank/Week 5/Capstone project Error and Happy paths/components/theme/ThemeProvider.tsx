"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * components/theme/ThemeProvider.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Thin wrapper so the root layout doesn't need "use client" itself just to
 * mount next-themes. attribute="class" toggles the .dark class on <html>,
 * which is what every color token in globals.css keys off (see the .dark
 * block there). defaultTheme="system" respects the visitor's OS preference
 * on first visit; after that, next-themes persists their explicit choice
 * to localStorage itself.
 */
export default function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}

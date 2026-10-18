import type { Metadata } from "next";
import { GsapMotion } from "@/components/motion/GsapMotion";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/orbitron";
import "@fontsource-variable/cormorant-garamond";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "TemplateForge",
  description: "A visual website-template builder for browsing, customizing, previewing, and exporting templates."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <GsapMotion />
        {children}
      </body>
    </html>
  );
}

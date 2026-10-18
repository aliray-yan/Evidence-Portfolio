import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";
import ThemeProvider from "@/components/theme/ThemeProvider";

// next/font self-hosts these at build time — no external request at
// runtime, no layout shift.
//
// Space Grotesk for display headings: a geometric grotesk with just
// enough character (the squared-off "G", the tall x-height) to feel
// technical and considered without forcing every headline into all-caps
// to earn its keep. Inter for body text — a neutral, highly legible
// workhorse that gets out of the way of the content. JetBrains Mono is
// the accent voice: eyebrow labels, tags, timestamps, and stat numbers —
// a restrained nod to this being a developer/SOC-analyst's site, used as
// seasoning rather than the whole dish.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: `${SITE_NAME} | ${SITE_TAGLINE}`,
  description:
    "A professional cybersecurity portfolio and content management platform showcasing projects, certifications, technical skills, and security research.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning is required by next-themes: it sets the
    // .dark class on <html> before React hydrates (via an inline script),
    // which legitimately differs from the server-rendered markup — this
    // tells React that's expected, not a bug.
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetBrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased min-h-dvh">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

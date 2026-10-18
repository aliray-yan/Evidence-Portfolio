import type { Metadata } from "next";
import { Archivo_Black, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";
import ThemeProvider from "@/components/theme/ThemeProvider";

// next/font self-hosts these at build time — no external request at
// runtime, no layout shift. Archivo Black for bold display headings
// (matches the condensed all-caps look of the reference design), Plus
// Jakarta Sans for body text (warmer and friendlier than a generic
// system sans, pairs well with Archivo Black without competing with it).
const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-archivo-black",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
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
      className={`${archivoBlack.variable} ${plusJakartaSans.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased min-h-screen">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

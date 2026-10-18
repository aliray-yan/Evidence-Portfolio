import type { Metadata } from "next";
import { Fraunces, Archivo } from "next/font/google";
import { AnalysisProvider } from "@/lib/analysis-store";
import { Nav } from "@/components/nav";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  style: ["normal", "italic"],
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SkinVision AI — AI-assisted visual skin analysis",
  description:
    "Upload a facial photo to receive an AI-assisted, non-diagnostic analysis of visible skin concerns and general skincare guidance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${archivo.variable}`}>
      <body className="min-h-screen antialiased">
        <AnalysisProvider>
          <Nav />
          <main>{children}</main>
        </AnalysisProvider>
      </body>
    </html>
  );
}

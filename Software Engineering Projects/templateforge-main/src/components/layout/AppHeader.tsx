"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/layout/Logo";

export function AppHeader() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("templateforge-theme");
    const shouldDark = stored === "dark";
    setDark(shouldDark);
    document.documentElement.classList.toggle("dark", shouldDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    window.localStorage.setItem("templateforge-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  }

  return (
    <header data-gsap="nav" className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-ink/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="TemplateForge home">
          <Logo dense />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          <Link className="rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800" href="/library">
            Library
          </Link>
          <Link className="rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800" href="/projects">
            My Projects
          </Link>
          <Link className="rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800" href="/export">
            Export
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="icon" aria-label={dark ? "Switch to light UI mode" : "Switch to dark UI mode"} onClick={toggleTheme}>
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </Button>
          <Link href="/library">
            <Button size="sm">Start Building</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

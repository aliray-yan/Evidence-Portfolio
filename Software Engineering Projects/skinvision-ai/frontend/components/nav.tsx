import Link from "next/link";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur-sm">
      <div className="border-b border-line px-4 py-2 text-center text-xs text-ink-muted sm:px-6">
        AI-assisted estimates for education, not a medical diagnosis.
      </div>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="font-display text-xl italic tracking-tight text-ink">
          SkinVision AI
        </Link>
        <nav className="flex items-center gap-6 text-sm text-ink-muted">
          <a href="/#how-it-works" className="hidden hover:text-ink sm:inline">
            How it works
          </a>
          <Link
            href="/analyze"
            className="rounded-full border border-ink/20 px-4 py-2 text-ink transition-colors hover:border-ink/40"
          >
            Analyze your skin
          </Link>
        </nav>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { NAV_LINKS, SITE_OWNER } from "@/lib/constants";
import NavLink from "./NavLink";
import ThemeToggle from "@/components/theme/ThemeToggle";

const DESKTOP_LINK_CLASS = "focus-ring rounded-full px-4 py-2 text-sm transition-colors";
const MOBILE_LINK_CLASS = "focus-ring block rounded-full px-4 py-2 text-sm transition-colors";
const ACTIVE_CLASS = "bg-muted text-primary";
const INACTIVE_CLASS = "text-muted-foreground hover:text-foreground";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="focus-ring font-display rounded text-lg tracking-tight text-foreground"
          onClick={() => setIsOpen(false)}
        >
          {SITE_OWNER}
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-2 md:flex">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <NavLink
                  href={link.href}
                  className={DESKTOP_LINK_CLASS}
                  activeClassName={ACTIVE_CLASS}
                  inactiveClassName={INACTIVE_CLASS}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <ThemeToggle />
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="focus-ring flex flex-col gap-1.5 rounded p-2"
            aria-label="Toggle navigation menu"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <span
              className={`block h-0.5 w-6 bg-foreground transition-transform ${
                isOpen ? "translate-y-2 rotate-45" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-6 bg-foreground transition-opacity ${
                isOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`block h-0.5 w-6 bg-foreground transition-transform ${
                isOpen ? "-translate-y-2 -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {isOpen && (
        <ul className="flex flex-col gap-1 border-t border-border px-6 pb-4 md:hidden">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <NavLink
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={MOBILE_LINK_CLASS}
                activeClassName={ACTIVE_CLASS}
                inactiveClassName={INACTIVE_CLASS}
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}

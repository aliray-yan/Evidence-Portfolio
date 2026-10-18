"use client";

import { DASHBOARD_LINKS } from "@/lib/constants";
import NavLink from "./NavLink";

const LINK_CLASS = "focus-ring block rounded-lg px-3.5 py-2 text-sm transition-colors";
const ACTIVE_CLASS = "bg-primary/10 font-medium text-primary";
const INACTIVE_CLASS = "text-muted-foreground hover:bg-muted hover:text-foreground";

export default function DashboardSidebar() {
  return (
    <aside className="w-full shrink-0 border-border bg-card md:h-dvh md:w-60 md:border-r">
      <div className="px-6 py-6">
        <p className="font-display flex items-center gap-2 text-sm font-semibold text-foreground">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />
          Admin Panel
        </p>
      </div>

      <nav>
        <ul className="flex flex-col gap-1 px-3">
          {DASHBOARD_LINKS.map((link) => (
            <li key={link.href}>
              <NavLink
                href={link.href}
                exact={link.href === "/dashboard"}
                className={LINK_CLASS}
                activeClassName={ACTIVE_CLASS}
                inactiveClassName={INACTIVE_CLASS}
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="mx-3 my-4 border-t border-border" />

        <ul className="px-3">
          <li>
            <NavLink
              href="/"
              className={LINK_CLASS}
              activeClassName={ACTIVE_CLASS}
              inactiveClassName={INACTIVE_CLASS}
            >
              &larr; Back to Site
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

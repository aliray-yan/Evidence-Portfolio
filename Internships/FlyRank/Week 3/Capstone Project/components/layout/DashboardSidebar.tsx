"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DASHBOARD_LINKS } from "@/lib/constants";

export default function DashboardSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <aside className="w-full shrink-0 border-navy-800 bg-navy-900 md:h-screen md:w-60 md:border-r">
      <div className="px-6 py-6">
        <p className="font-mono text-sm font-semibold text-slate-100">
          <span className="text-cyan-400">{"//"}</span> admin panel
        </p>
      </div>

      <nav>
        <ul className="flex flex-col gap-1 px-3">
          {DASHBOARD_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`focus-ring block rounded px-3 py-2 text-sm transition-colors ${
                  isActive(link.href)
                    ? "bg-navy-800 text-cyan-400"
                    : "text-slate-400 hover:bg-navy-800 hover:text-slate-100"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mx-3 my-4 border-t border-navy-800" />

        <ul className="px-3">
          <li>
            <Link
              href="/"
              className="focus-ring block rounded px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-navy-800 hover:text-slate-100"
            >
              &larr; Back to Site
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

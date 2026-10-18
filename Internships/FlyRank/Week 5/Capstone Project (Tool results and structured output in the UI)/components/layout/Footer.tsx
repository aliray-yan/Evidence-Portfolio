import Link from "next/link";
import { GITHUB_URL, LINKEDIN_URL, SITE_OWNER } from "@/lib/constants";

const FOOTER_LINKS = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-10 text-sm text-muted-foreground md:flex-row md:justify-between md:gap-4">
        <p>
          &copy; {new Date().getFullYear()} {SITE_OWNER}. All rights reserved.
        </p>

        <ul className="flex flex-wrap items-center justify-center gap-6">
          {FOOTER_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="focus-ring rounded transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub profile"
            className="focus-ring rounded transition-colors hover:text-primary"
          >
            GitHub
          </a>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn profile"
            className="focus-ring rounded transition-colors hover:text-primary"
          >
            LinkedIn
          </a>
        </div>
      </div>

      <p className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        Built with Next.js &amp; Tailwind CSS
      </p>
    </footer>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import PlaceholderBanner from "@/components/ui/PlaceholderBanner";

export const metadata: Metadata = {
  title: "Blog | Cyber Portfolio CMS",
  description: "CTF solutions, security research, and technical tutorials.",
};

const PLACEHOLDER_POSTS = [
  {
    slug: "reconstructing-a-13-stage-attack-chain",
    title: "Reconstructing a 13-Stage Attack Chain from Windows Event Logs",
    date: "2026-06-14",
    excerpt:
      "A walkthrough of mapping a multi-stage intrusion to MITRE ATT&CK using event logs and packet capture.",
    tags: ["CTF", "Security"],
  },
  {
    slug: "wazuh-detection-rules-for-t1110",
    title: "Writing Wazuh Detection Rules for T1110 Brute Force",
    date: "2026-05-02",
    excerpt:
      "Notes on building and tuning a custom detection rule set for brute-force login attempts.",
    tags: ["Tutorial", "Research"],
  },
];

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-100 md:text-4xl">
        Blog &amp; Write-ups
      </h1>
      <p className="mt-2 text-slate-400">
        CTF solutions, security research, and technical tutorials.
      </p>

      <div className="mt-8">
        <PlaceholderBanner
          message="Blog content will load from the database."
          phase="Phase 5"
        />
      </div>

      <div className="mt-10 space-y-6">
        {PLACEHOLDER_POSTS.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="focus-ring block rounded-lg border border-navy-800 bg-navy-800 p-6 transition-colors hover:border-cyan-400"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>{post.date}</span>
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-navy-950 px-2 py-0.5 font-mono text-cyan-400"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h2 className="mt-3 text-lg font-semibold text-slate-100">
              {post.title}
            </h2>
            <p className="mt-2 text-sm text-slate-400">{post.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

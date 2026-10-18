import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { SITE_OWNER } from "@/lib/constants";

const FEATURED_PROJECTS = [
  {
    slug: "isop",
    title: "ISOP",
    description:
      "Intelligent SOC Operations Platform integrating threat intel feeds and AI-driven correlation.",
    tags: ["Node.js", "PostgreSQL", "SIEM"],
  },
  {
    slug: "ihadrs",
    title: "IHADRS",
    description:
      "Host-based attack detection engine with MITRE-mapped rules and anomaly detection.",
    tags: ["Python", "FastAPI", "ML"],
  },
  {
    slug: "sniper-defense",
    title: "Tactical Sniper Defense",
    description:
      "Browser-based tactical defense game built with vanilla JS and HTML5 Canvas.",
    tags: ["JavaScript", "Canvas"],
  },
];

const SKILL_GROUPS = [
  {
    title: "Cybersecurity",
    items: ["SIEM", "Threat Intelligence", "Incident Response", "Network Security"],
  },
  {
    title: "Development",
    items: ["TypeScript", "React", "Next.js", "Node.js"],
  },
  {
    title: "Tools & Platforms",
    items: ["Wazuh", "Wireshark", "Kali Linux", "Git"],
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <p className="mb-4 font-mono text-sm text-cyan-400">
            Hi, I&apos;m {SITE_OWNER}
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-100 md:text-6xl">
            Cybersecurity Student &amp;{" "}
            <span className="text-cyan-400">Frontend AI Engineer</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-400">
            Building secure, scalable systems — from SOC detection engineering
            to full-stack platforms that put real security data to work.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/projects"
              className="focus-ring rounded bg-cyan-400 px-6 py-3 text-sm font-semibold text-navy-950 transition-opacity hover:opacity-90"
            >
              View My Projects
            </Link>
            <Link
              href="/contact"
              className="focus-ring rounded border border-navy-800 px-6 py-3 text-sm font-semibold text-slate-100 transition-colors hover:border-cyan-400"
            >
              Contact Me
            </Link>
          </div>
        </section>

        {/* Featured Projects */}
        <section className="border-t border-navy-800 bg-navy-900/40">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="text-2xl font-bold text-slate-100">
              Featured Projects
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Projects will be loaded from the CMS in a future phase.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {FEATURED_PROJECTS.map((project) => (
                <div
                  key={project.slug}
                  className="rounded-lg border border-navy-800 bg-navy-800 p-6"
                >
                  <h3 className="text-lg font-semibold text-slate-100">
                    {project.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {project.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-navy-950 px-2 py-1 font-mono text-xs text-cyan-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled
                    className="mt-6 w-full rounded border border-navy-800 px-4 py-2 text-sm text-slate-400"
                  >
                    GitHub
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Skills Preview */}
        <section className="border-t border-navy-800">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="text-2xl font-bold text-slate-100">Core Skills</h2>

            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {SKILL_GROUPS.map((group) => (
                <div key={group.title}>
                  <h3 className="font-mono text-sm text-cyan-400">
                    {group.title}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {group.items.map((item) => (
                      <li key={item} className="text-sm text-slate-400">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-navy-800 bg-navy-900/40">
          <div className="mx-auto max-w-6xl px-6 py-20 text-center">
            <h2 className="text-2xl font-bold text-slate-100 md:text-3xl">
              Interested in working together?
            </h2>
            <div className="mt-8">
              <Link
                href="/contact"
                className="focus-ring inline-block rounded bg-cyan-400 px-8 py-3 text-sm font-semibold text-navy-950 transition-opacity hover:opacity-90"
              >
                Get in Touch
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

import type { Metadata } from "next";
import PlaceholderBanner from "@/components/ui/PlaceholderBanner";

export const metadata: Metadata = {
  title: "About | Cyber Portfolio CMS",
  description: "Professional background, education, and career goals.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-100 md:text-4xl">
        About Me
      </h1>

      <section className="mt-10">
        <h2 className="font-mono text-sm text-cyan-400">
          Professional Summary
        </h2>
        <p className="mt-3 leading-relaxed text-slate-400">
          I&apos;m a cybersecurity-focused software engineering student with a
          strong interest in blue team operations, detection engineering, and
          building the tools security teams rely on every day. My work sits
          at the intersection of full-stack development and applied security
          — designing systems that don&apos;t just look secure, but hold up
          under real incident response conditions.
        </p>
        <p className="mt-3 leading-relaxed text-slate-400">
          Over the past few years I&apos;ve moved from learning the
          fundamentals of web development to building SIEM detection rules,
          analyzing malware, and reconstructing multi-stage attack chains
          from raw logs. This portfolio itself is part of that practice: a
          production-style platform built to demonstrate real engineering
          discipline, not just a tutorial exercise.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-sm text-cyan-400">Education</h2>
        <div className="mt-3 rounded-lg border border-navy-800 bg-navy-800 p-5">
          <p className="font-semibold text-slate-100">
            BS Software Engineering
          </p>
          <p className="text-sm text-slate-400">
            Government College University Faisalabad (GCUF) &mdash; 2023–2027
          </p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-sm text-cyan-400">Experience</h2>
        <div className="mt-3 space-y-4">
          <div className="rounded-lg border border-navy-800 bg-navy-800 p-5">
            <p className="font-semibold text-slate-100">
              SOC Analyst Apprentice
            </p>
            <p className="text-sm text-slate-400">
              Blue team detection engineering, SIEM rule development, and
              incident response practice.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-sm text-cyan-400">Interests</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {["Cybersecurity", "Frontend Development", "Security Research"].map(
            (interest) => (
              <li
                key={interest}
                className="rounded bg-navy-800 px-3 py-1 text-sm text-slate-100"
              >
                {interest}
              </li>
            ),
          )}
        </ul>
      </section>

      <div className="mt-12">
        <PlaceholderBanner
          message="Content managed via CMS."
          phase="Phase 5"
        />
      </div>
    </div>
  );
}

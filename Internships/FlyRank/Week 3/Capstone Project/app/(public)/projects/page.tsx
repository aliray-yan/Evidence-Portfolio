import type { Metadata } from "next";
import Link from "next/link";
import PlaceholderBanner from "@/components/ui/PlaceholderBanner";

export const metadata: Metadata = {
  title: "Projects | Cyber Portfolio CMS",
  description: "Security tools, development projects, and research work.",
};

const PLACEHOLDER_PROJECTS = [
  {
    slug: "isop",
    title: "ISOP",
    description:
      "Intelligent SOC Operations Platform with AI-driven threat correlation.",
    category: "Security",
    tags: ["Node.js", "PostgreSQL", "SIEM"],
  },
  {
    slug: "ihadrs",
    title: "IHADRS",
    description: "Host-based attack detection engine with 30 MITRE-mapped rules.",
    category: "Security",
    tags: ["Python", "FastAPI", "ML"],
  },
  {
    slug: "template-forge",
    title: "TemplateForge v2",
    description: "Client-side visual website builder exporting to multiple frameworks.",
    category: "Development",
    tags: ["Next.js", "TypeScript", "Zustand"],
  },
];

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-100 md:text-4xl">
        Projects
      </h1>
      <p className="mt-2 text-slate-400">
        Security tools, development projects, and research work.
      </p>

      <div className="mt-8">
        <PlaceholderBanner
          message="Project data will load from the database."
          phase="Phase 3"
        />
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {PLACEHOLDER_PROJECTS.map((project) => (
          <div
            key={project.slug}
            className="flex flex-col rounded-lg border border-navy-800 bg-navy-800 p-6"
          >
            <span className="w-fit rounded bg-navy-950 px-2 py-1 font-mono text-xs text-cyan-400">
              {project.category}
            </span>
            <h2 className="mt-4 text-lg font-semibold text-slate-100">
              {project.title}
            </h2>
            <p className="mt-2 flex-1 text-sm text-slate-400">
              {project.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-navy-950 px-2 py-1 font-mono text-xs text-slate-400"
                >
                  {tag}
                </span>
              ))}
            </div>
            <Link
              href={`/projects/${project.slug}`}
              className="focus-ring mt-6 rounded border border-navy-800 px-4 py-2 text-center text-sm text-slate-100 transition-colors hover:border-cyan-400"
            >
              View Details &rarr;
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

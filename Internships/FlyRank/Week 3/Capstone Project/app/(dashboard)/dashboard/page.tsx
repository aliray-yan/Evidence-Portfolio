import type { Metadata } from "next";
import PlaceholderBanner from "@/components/ui/PlaceholderBanner";

export const metadata: Metadata = {
  title: "Dashboard | Cyber Portfolio CMS",
};

const STATS = [
  { label: "Projects", value: 0 },
  { label: "Blog Posts", value: 0 },
  { label: "Certifications", value: 0 },
  { label: "Skills", value: 0 },
];

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-navy-800 bg-navy-800 p-6"
          >
            <p className="text-3xl font-bold text-cyan-400">{stat.value}</p>
            <p className="mt-1 text-sm text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <button
          type="button"
          disabled
          className="focus-ring rounded border border-navy-800 px-4 py-2 text-sm text-slate-400 opacity-60"
        >
          + New Project
        </button>
        <button
          type="button"
          disabled
          className="focus-ring rounded border border-navy-800 px-4 py-2 text-sm text-slate-400 opacity-60"
        >
          + New Post
        </button>
      </div>

      <div className="mt-10">
        <PlaceholderBanner
          message="CMS functionality is coming."
          phase="Phase 5"
        />
      </div>
    </div>
  );
}

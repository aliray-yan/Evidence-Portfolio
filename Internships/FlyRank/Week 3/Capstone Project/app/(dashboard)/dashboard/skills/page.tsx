import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Skills | Cyber Portfolio CMS",
};

export default function DashboardSkillsPage() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-100">Manage Skills</h1>
        <button
          type="button"
          disabled
          className="focus-ring rounded bg-cyan-400 px-4 py-2 text-sm font-semibold text-navy-950 opacity-60"
        >
          + Add Skill
        </button>
      </div>

      <div className="mt-10 rounded-lg border border-dashed border-navy-800 p-12 text-center">
        <p className="text-sm text-slate-400">
          No skills yet. Coming in Phase 5.
        </p>
      </div>
    </div>
  );
}

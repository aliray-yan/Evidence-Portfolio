import type { Metadata } from "next";
import { SITE_EMAIL, SITE_OWNER, SITE_TAGLINE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Settings | Cyber Portfolio CMS",
};

export default function DashboardSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-100">Settings</h1>

      <div className="mt-8 space-y-6">
        <section className="rounded-lg border border-navy-800 bg-navy-800 p-6">
          <h2 className="font-mono text-sm text-cyan-400">Profile</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Name</dt>
              <dd className="text-slate-100">{SITE_OWNER}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Title</dt>
              <dd className="text-slate-100">{SITE_TAGLINE}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Bio</dt>
              <dd className="text-right text-slate-100">
                Placeholder bio text.
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-navy-800 bg-navy-800 p-6">
          <h2 className="font-mono text-sm text-cyan-400">Social Links</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">GitHub</dt>
              <dd className="text-slate-100">github.com/alirayyan</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">LinkedIn</dt>
              <dd className="text-slate-100">linkedin.com/in/alirayyan</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Contact Email</dt>
              <dd className="text-slate-100">{SITE_EMAIL}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-navy-800 bg-navy-800 p-6">
          <h2 className="font-mono text-sm text-cyan-400">Resume</h2>
          <p className="mt-4 text-sm text-slate-100">resume-placeholder.pdf</p>
        </section>
      </div>

      <p className="mt-8 text-xs text-slate-400">
        Settings management coming in Phase 5.
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Admin Login | Cyber Portfolio CMS",
  description: "Sign in to manage your portfolio content.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-lg border border-navy-800 bg-navy-900 p-8">
        <p className="font-mono text-xs text-cyan-400">{SITE_NAME}</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-100">
          Admin Login
        </h1>

        <form className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-100"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              disabled
              className="focus-ring mt-2 w-full rounded border border-navy-800 bg-navy-950 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-400 disabled:opacity-60"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-100"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              disabled
              className="focus-ring mt-2 w-full rounded border border-navy-800 bg-navy-950 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-400 disabled:opacity-60"
              placeholder="••••••••"
            />
          </div>

          <button
            type="button"
            disabled
            className="focus-ring w-full rounded bg-cyan-400 px-6 py-3 text-sm font-semibold text-navy-950 opacity-60"
          >
            Log In
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Authentication coming in Phase 4.
        </p>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Admin Login | Cyber Portfolio CMS",
  description: "Sign in to manage your portfolio content.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8">
        <p className="font-semibold uppercase tracking-wide text-xs text-primary">{SITE_NAME}</p>
        <h1 className="font-display mt-2 text-2xl uppercase text-foreground">
          Admin Login
        </h1>

        <form className="mt-8 space-y-5">
          <Input
            id="email"
            name="email"
            type="email"
            label="Email"
            disabled
            placeholder="you@example.com"
            tone="inset"
          />
          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            disabled
            placeholder="••••••••"
            tone="inset"
          />

          <Button type="button" disabled fullWidth>
            Log In
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Authentication coming in Phase 4.
        </p>
      </div>
    </div>
  );
}

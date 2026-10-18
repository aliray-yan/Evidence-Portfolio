import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { SITE_EMAIL, SITE_OWNER, SITE_TAGLINE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Settings | Cyber Portfolio CMS",
};

export default function DashboardSettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" size="panel" />

      <div className="mt-8 space-y-6">
        <Card>
          <h2 className="font-semibold uppercase tracking-wide text-sm text-primary">Profile</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="text-foreground">{SITE_OWNER}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Title</dt>
              <dd className="text-foreground">{SITE_TAGLINE}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Bio</dt>
              <dd className="text-right text-foreground">
                Placeholder bio text.
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="font-semibold uppercase tracking-wide text-sm text-primary">Social Links</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">GitHub</dt>
              <dd className="text-foreground">github.com/aliray-yan</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">LinkedIn</dt>
              <dd className="text-foreground">
                linkedin.com/in/ali-rayyan-cybersecurity
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Contact Email</dt>
              <dd className="text-foreground">{SITE_EMAIL}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="font-semibold uppercase tracking-wide text-sm text-primary">Resume</h2>
          <p className="mt-4 text-sm text-foreground">Ali Rayyan.pdf</p>
        </Card>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Settings management coming in Phase 5.
      </p>
    </div>
  );
}

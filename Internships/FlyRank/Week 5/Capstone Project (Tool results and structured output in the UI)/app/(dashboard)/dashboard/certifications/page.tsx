import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Manage Certifications | Cyber Portfolio CMS",
};

export default function DashboardCertificationsPage() {
  return (
    <div>
      <PageHeader
        title="Manage Certifications"
        size="panel"
        action={<Button disabled>+ Add Certification</Button>}
      />
      <div className="mt-10">
        <EmptyState message="No certifications yet. Coming in Phase 5." />
      </div>
    </div>
  );
}

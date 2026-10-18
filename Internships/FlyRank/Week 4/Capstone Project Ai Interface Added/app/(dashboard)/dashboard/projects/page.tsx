import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Manage Projects | Cyber Portfolio CMS",
};

export default function DashboardProjectsPage() {
  return (
    <div>
      <PageHeader
        title="Manage Projects"
        size="panel"
        action={<Button disabled>+ Add Project</Button>}
      />
      <div className="mt-10">
        <EmptyState message="No projects yet. Project management coming in Phase 5." />
      </div>
    </div>
  );
}

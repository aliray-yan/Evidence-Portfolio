import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Manage Skills | Cyber Portfolio CMS",
};

export default function DashboardSkillsPage() {
  return (
    <div>
      <PageHeader
        title="Manage Skills"
        size="panel"
        action={<Button disabled>+ Add Skill</Button>}
      />
      <div className="mt-10">
        <EmptyState message="No skills yet. Coming in Phase 5." />
      </div>
    </div>
  );
}

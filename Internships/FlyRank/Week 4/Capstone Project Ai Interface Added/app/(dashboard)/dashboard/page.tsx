import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Button from "@/components/ui/Button";
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
      <PageHeader title="Dashboard" size="panel" />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <Button variant="outline" disabled>
          + New Project
        </Button>
        <Button variant="outline" disabled>
          + New Post
        </Button>
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

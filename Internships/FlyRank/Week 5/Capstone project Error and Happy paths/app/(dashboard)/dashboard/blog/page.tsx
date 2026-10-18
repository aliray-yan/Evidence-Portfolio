import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Manage Blog Posts | Cyber Portfolio CMS",
};

export default function DashboardBlogPage() {
  return (
    <div>
      <PageHeader
        title="Manage Blog Posts"
        size="panel"
        action={<Button disabled>+ New Post</Button>}
      />
      <div className="mt-10">
        <EmptyState message="No posts yet. Blog management coming in Phase 5." />
      </div>
    </div>
  );
}

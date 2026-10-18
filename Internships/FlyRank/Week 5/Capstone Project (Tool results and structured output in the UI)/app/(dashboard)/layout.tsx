import DashboardSidebar from "@/components/layout/DashboardSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <DashboardSidebar />
      <div className="flex-1">
        <div className="border-b border-border bg-destructive/10 px-6 py-2 text-center text-xs text-destructive md:text-left">
          Protected route — authentication coming in Phase 4.
        </div>
        <main className="px-6 py-10 md:px-10">{children}</main>
      </div>
    </div>
  );
}

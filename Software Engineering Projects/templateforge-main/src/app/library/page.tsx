import { AppHeader } from "@/components/layout/AppHeader";
import { TemplateBrowser } from "@/components/library/TemplateBrowser";

export default function LibraryPage() {
  return (
    <main className="min-h-screen bg-mist text-ink dark:bg-ink dark:text-white">
      <AppHeader />
      <TemplateBrowser />
    </main>
  );
}

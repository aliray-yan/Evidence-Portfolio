import { Suspense } from "react";
import { ExportClient } from "@/components/export/ExportClient";

export default function ExportPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center">Loading export...</div>}>
      <ExportClient />
    </Suspense>
  );
}

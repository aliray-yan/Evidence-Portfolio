import { Suspense } from "react";
import { BuilderApp } from "@/components/builder/BuilderApp";

export default function BuilderPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center">Loading TemplateForge...</div>}>
      <BuilderApp />
    </Suspense>
  );
}

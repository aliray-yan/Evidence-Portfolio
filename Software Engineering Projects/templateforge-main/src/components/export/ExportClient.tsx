"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Clipboard, Download, FileArchive, FolderTree, Wand2 } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { TemplateRenderer } from "@/components/preview/TemplateRenderer";
import { getTemplateById } from "@/data/templates";
import { copyToClipboard, downloadZip, ExportScope, getExportFiles } from "@/lib/exporter";
import { findProjectOrTemplate, makeProjectFromTemplate, upsertProject } from "@/lib/projects";
import { Project } from "@/lib/types";

function tree(files: string[]) {
  const root: Record<string, unknown> = {};

  files.forEach((file) => {
    let node = root;
    file.split("/").forEach((part, index, parts) => {
      if (index === parts.length - 1) {
        node[part] = true;
      } else {
        node[part] = (node[part] as Record<string, unknown>) ?? {};
        node = node[part] as Record<string, unknown>;
      }
    });
  });

  function render(node: Record<string, unknown>, depth = 0): string[] {
    return Object.entries(node).flatMap(([key, value]) => {
      const prefix = `${"  ".repeat(depth)}${value === true ? "- " : "+ "}${key}`;
      return value === true ? [prefix] : [prefix, ...render(value as Record<string, unknown>, depth + 1)];
    });
  }

  return render(root).join("\n");
}

export function ExportClient() {
  const params = useSearchParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [scope, setScope] = useState<ExportScope>("project");
  const [pageId, setPageId] = useState("home");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const loaded = findProjectOrTemplate(params.get("projectId"), params.get("templateId"));
    setProject(loaded);
    setPageId(loaded.pages[0]?.id ?? "home");
  }, [params]);

  const template = project ? getTemplateById(project.templateId) : null;
  const page = project?.pages.find((entry) => entry.id === pageId) ?? project?.pages[0];
  const files = useMemo(() => (project ? getExportFiles(project, scope, pageId) : []), [pageId, project, scope]);
  const readme = files.find((file) => file.path.toLowerCase().endsWith("readme.md") || file.path.toLowerCase().endsWith("integration-notes.md"))?.content ?? "";

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 1800);
  }

  if (!project || !template || !page) {
    return (
      <main className="min-h-screen bg-mist text-ink dark:bg-ink dark:text-white">
        <AppHeader />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">Loading export...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-mist text-ink dark:bg-ink dark:text-white">
      <AppHeader />
      {notice && <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white shadow-panel dark:bg-white dark:text-ink">{notice}</div>}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Link href={params.get("projectId") ? `/builder?projectId=${params.get("projectId")}` : "/library"} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-ink dark:hover:text-white">
          <ArrowLeft size={16} /> Back
        </Link>

        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge>{template.exportType}</Badge>
            <h1 data-gsap="fade-up" className="font-display mt-3 text-4xl font-black">Export {project.name}</h1>
            <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-400">
              Generate a ZIP with source files, setup instructions, and the correct folder structure for this template type.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!params.get("projectId") && (
              <Button
                variant="secondary"
                onClick={() => {
                  const saved = upsertProject(makeProjectFromTemplate(template));
                  router.push(`/builder?projectId=${saved.id}`);
                }}
              >
                <Wand2 size={16} /> Customize First
              </Button>
            )}
            <Button
              onClick={async () => {
                await downloadZip(project, scope, pageId);
                flash("ZIP downloaded");
              }}
            >
              <FileArchive size={16} /> Download ZIP
            </Button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="grid content-start gap-4">
            <section data-gsap="scale-in" className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <h2 className="mb-4 font-black">Export Options</h2>
              <div className="grid gap-3">
                <Field label="Scope">
                  <Select value={scope} onChange={(event) => setScope(event.target.value as ExportScope)}>
                    <option value="project">Export Entire Project</option>
                    <option value="page">Export Current Page</option>
                  </Select>
                </Field>
                <Field label="Page">
                  <Select value={pageId} onChange={(event) => setPageId(event.target.value)}>
                    {project.pages.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800">
                  <div className="font-black">Format</div>
                  <div className="mt-1 text-slate-500">{template.exportType === "shopify" ? "Shopify Liquid theme ZIP" : template.exportType === "shopline" ? "Shopline-ready storefront ZIP" : template.exportType === "framework" ? "Framework project ZIP" : template.exportType === "animated" ? "Animated source ZIP" : "Static HTML/CSS/JS ZIP"}</div>
                </div>
              </div>
            </section>

            <section data-gsap="scale-in" className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-3 flex items-center gap-2 font-black">
                <FolderTree size={18} /> Folder Structure
              </div>
              <pre className="panel-scrollbar max-h-80 overflow-auto rounded-md bg-slate-950 p-4 text-xs leading-5 text-slate-100">{tree(files.map((file) => file.path))}</pre>
            </section>
          </aside>

          <section className="grid gap-5">
            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-black">README Preview</h2>
                <Button variant="secondary" size="sm" onClick={async () => { await copyToClipboard(readme); flash("README copied"); }}>
                  <Clipboard size={15} /> Copy
                </Button>
              </div>
              <pre className="panel-scrollbar max-h-72 overflow-auto rounded-md bg-slate-100 p-4 text-xs leading-5 text-slate-700 dark:bg-slate-900 dark:text-slate-200">{readme}</pre>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-black">Current Page Preview</h2>
                <Button variant="secondary" size="sm" onClick={() => downloadZip(project, "page", pageId)}>
                  <Download size={15} /> Export Page
                </Button>
              </div>
              <div className="max-h-[680px] overflow-auto rounded-lg bg-slate-200 p-4 dark:bg-[#101722]">
                <div className="mx-auto max-w-5xl overflow-hidden rounded-lg bg-white shadow-canvas">
                  <TemplateRenderer page={page} settings={project.settings} />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

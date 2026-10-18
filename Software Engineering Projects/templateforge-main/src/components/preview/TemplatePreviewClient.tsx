"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Clipboard, Download, Gauge, Laptop, Layers3, Presentation, Smartphone, Sparkles, Tablet, Wand2 } from "lucide-react";
import { getTemplateById } from "@/data/templates";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AppHeader } from "@/components/layout/AppHeader";
import { TemplateRenderer } from "@/components/preview/TemplateRenderer";
import { makeProjectFromTemplate, upsertProject } from "@/lib/projects";
import { DeviceMode } from "@/lib/types";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getTemplateInsight, getTemplateStackLabel } from "@/lib/templateInsights";

const widths: Record<DeviceMode, number> = {
  desktop: 1120,
  tablet: 768,
  mobile: 390
};

export function TemplatePreviewClient({ templateId }: { templateId: string }) {
  const router = useRouter();
  const template = getTemplateById(templateId);
  const [pageId, setPageId] = useState(template?.pages[0]?.id ?? "home");
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [copied, setCopied] = useState(false);
  const page = useMemo(() => template?.pages.find((entry) => entry.id === pageId) ?? template?.pages[0], [pageId, template]);

  if (!template || !page) {
    return (
      <main className="min-h-screen bg-mist text-ink dark:bg-ink dark:text-white">
        <AppHeader />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h1 className="text-3xl font-black">Template not found</h1>
          <p className="mt-3 text-slate-500">The selected template may have been moved.</p>
          <Link href="/library">
            <Button className="mt-6">Back to library</Button>
          </Link>
        </div>
      </main>
    );
  }

  function useTemplate() {
    if (!template) return;
    const project = upsertProject(makeProjectFromTemplate(template));
    router.push(`/builder?projectId=${project.id}`);
  }

  const deviceOptions: Array<{ id: DeviceMode; icon: typeof Laptop; label: string }> = [
    { id: "desktop", icon: Laptop, label: "Desktop" },
    { id: "tablet", icon: Tablet, label: "Tablet" },
    { id: "mobile", icon: Smartphone, label: "Mobile" }
  ];
  const insight = getTemplateInsight(template);

  async function copyBrief() {
    if (!template) return;
    await navigator.clipboard.writeText(`${insight.brief}\n\nStack: ${getTemplateStackLabel(template)}\nExport: ${insight.exportReadiness}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main className="min-h-screen bg-mist text-ink dark:bg-ink dark:text-white">
      <AppHeader />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <Link href="/library" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-ink dark:hover:text-white">
              <ArrowLeft size={16} /> Back to library
            </Link>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge>{template.category}</Badge>
              <Badge>{template.websiteType}</Badge>
              <Badge>{template.framework}</Badge>
              {template.animationLibrary && <Badge>{template.animationLibrary}</Badge>}
            </div>
            <h1 data-gsap="fade-up" className="font-display text-3xl font-black sm:text-5xl">{template.name}</h1>
            <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-400">{template.description}</p>
            <div className="mt-5 grid max-w-4xl gap-3 sm:grid-cols-3">
              {[
                { icon: Sparkles, label: "Design DNA", value: insight.designDna },
                { icon: Gauge, label: "Quality Score", value: `${insight.score}/100` },
                { icon: Layers3, label: "Stack", value: getTemplateStackLabel(template) }
              ].map((entry) => (
                <div key={entry.label} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <entry.icon size={18} className="mb-3 text-forge-blue" />
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{entry.label}</div>
                  <div className="mt-1 text-sm font-black">{entry.value}</div>
                </div>
              ))}
            </div>
          </div>
          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Creative brief</div>
                <h2 className="font-display mt-1 text-xl font-black">Why It Works</h2>
              </div>
              <div className="grid h-14 w-14 place-items-center rounded-full bg-ink text-lg font-black text-white dark:bg-white dark:text-ink">{insight.score}</div>
            </div>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">{insight.brief}</p>
            <div className="mt-4 grid gap-2">
              {insight.strengths.slice(0, 4).map((strength) => (
                <div key={strength} className="flex items-start gap-2 rounded-md bg-slate-50 p-2 text-xs font-bold dark:bg-slate-900">
                  <Check size={14} className="mt-0.5 shrink-0 text-forge-green" />
                  {strength}
                </div>
              ))}
            </div>
            <Button variant="secondary" className="mt-4 w-full" onClick={copyBrief}>
              <Clipboard size={16} /> {copied ? "Brief Copied" : "Copy Brief"}
            </Button>
          </aside>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
            <Link href={`/presentation/${template.id}`}>
              <Button variant="secondary">
                <Presentation size={16} /> Present
              </Button>
            </Link>
            <Button variant="secondary" onClick={() => router.push(`/export?templateId=${template.id}`)}>
              <Download size={16} /> Export Preview
            </Button>
            <Button onClick={useTemplate}>
              <Wand2 size={16} /> Use This Template
            </Button>
        </div>

        <div data-gsap="fade-up" className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex flex-wrap gap-2" aria-label="Template pages">
            {template.pages.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setPageId(entry.id)}
                className={cn("rounded-md border border-slate-200 px-3 py-2 text-sm font-bold dark:border-slate-800", pageId === entry.id && "border-ink bg-slate-100 dark:border-white dark:bg-slate-900")}
              >
                {entry.name}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-md border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
            {deviceOptions.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setDevice(entry.id)}
                aria-label={`${entry.label} preview`}
                className={cn("grid h-9 w-10 place-items-center rounded text-slate-500", device === entry.id && "bg-white text-ink shadow-sm dark:bg-slate-700 dark:text-white")}
              >
                <entry.icon size={17} />
              </button>
            ))}
          </div>
        </div>

        <div data-gsap="fade-up" className="mb-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Page architecture</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {template.pages.map((entry) => (
                <div key={entry.id} className={cn("rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800", pageId === entry.id && "border-ink bg-slate-100 dark:border-white dark:bg-slate-900")}>
                  <div className="font-black">{entry.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{entry.sections.length} sections / {entry.slug}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Selected page sections</div>
            <div className="flex flex-wrap gap-2">
              {page.sections.map((section) => (
                <span key={section.id} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold dark:border-slate-800">
                  {section.title}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="canvas-scrollbar overflow-auto rounded-lg bg-slate-200 p-5 dark:bg-[#101722]">
          <div className="mx-auto overflow-hidden rounded-lg bg-white shadow-canvas transition-all" style={{ width: widths[device] }}>
            <TemplateRenderer page={page} settings={template.editableSettings} />
          </div>
        </div>
      </div>
    </main>
  );
}

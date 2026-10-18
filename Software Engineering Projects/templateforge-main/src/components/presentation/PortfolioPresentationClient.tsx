"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Code2, Download, Layers3, MonitorSmartphone, Sparkles, Wand2 } from "lucide-react";
import { getTemplateById } from "@/data/templates";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TemplateRenderer } from "@/components/preview/TemplateRenderer";
import { getTemplateInsight, getTemplateStackLabel } from "@/lib/templateInsights";
import { cn } from "@/lib/utils";

export function PortfolioPresentationClient({ templateId }: { templateId: string }) {
  const template = getTemplateById(templateId);
  const [slide, setSlide] = useState(0);

  const insight = useMemo(() => (template ? getTemplateInsight(template) : null), [template]);
  const slides = useMemo(() => {
    if (!template || !insight) return [];
    return [
      {
        label: "Concept",
        title: template.name,
        body: insight.brief,
        icon: Sparkles
      },
      {
        label: "System",
        title: insight.designDna,
        body: `${template.colorStyle}. ${template.layoutStyle}. Navigation: ${template.navStyle}. Hero: ${template.heroStyle}.`,
        icon: Layers3
      },
      {
        label: "Experience",
        title: insight.commerceDepth,
        body: `${template.pages.length} pages and ${template.sections.length} reusable sections make this a complete site direction, not just a hero mockup.`,
        icon: MonitorSmartphone
      },
      {
        label: "Export",
        title: insight.exportReadiness,
        body: `Stack: ${getTemplateStackLabel(template)}. The export pipeline generates source folders, README guidance, and platform-aware structure.`,
        icon: Code2
      }
    ];
  }, [insight, template]);

  if (!template || !insight || slides.length === 0) {
    return (
      <main className="min-h-screen bg-mist text-ink dark:bg-ink dark:text-white">
        <AppHeader />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-3xl font-black">Presentation not found</h1>
          <Link href="/library">
            <Button className="mt-6">Back to library</Button>
          </Link>
        </div>
      </main>
    );
  }

  const active = slides[slide];

  return (
    <main className="min-h-screen bg-black text-white">
      <AppHeader />
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="tf-ambient-grid absolute inset-0 opacity-40" />
        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <Link href={`/templates/${template.id}`} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-white/55 hover:text-white">
              <ArrowLeft size={16} /> Template preview
            </Link>
            <Badge className="mb-5 border-white/20 bg-white/10 text-white">Portfolio presentation mode</Badge>
            <div className="mb-4 flex items-center gap-3 text-xs font-black uppercase tracking-[0.24em] text-forge-pink">
              <active.icon size={18} /> {active.label} / {slide + 1} of {slides.length}
            </div>
            <h1 className="font-display text-4xl font-black leading-none sm:text-6xl">{active.title}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">{active.body}</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["Score", `${insight.score}/100`],
                ["Pages", `${template.pages.length}`],
                ["Sections", `${template.sections.length}`]
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/10 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">{label}</div>
                  <div className="mt-2 text-2xl font-black">{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => setSlide((value) => Math.max(0, value - 1))} disabled={slide === 0}>
                <ArrowLeft size={16} /> Previous
              </Button>
              <Button onClick={() => setSlide((value) => Math.min(slides.length - 1, value + 1))} disabled={slide === slides.length - 1}>
                Next <ArrowRight size={16} />
              </Button>
              <Link href={`/builder?templateId=${template.id}`}>
                <Button variant="secondary">
                  <Wand2 size={16} /> Open Builder
                </Button>
              </Link>
              <Link href={`/export?templateId=${template.id}`}>
                <Button variant="secondary">
                  <Download size={16} /> Export
                </Button>
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/10 p-3 shadow-2xl">
            <div className="mb-3 flex items-center justify-between px-1 text-xs font-bold uppercase tracking-[0.18em] text-white/50">
              <span>{template.framework}</span>
              <span>{template.exportType}</span>
            </div>
            <div className="max-h-[68vh] overflow-hidden rounded-md bg-white text-ink">
              <TemplateRenderer page={template.pages[0]} settings={template.editableSettings} compact />
            </div>
          </div>
        </div>
      </section>
      <nav className="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 py-5 sm:px-6" aria-label="Presentation slides">
        {slides.map((entry, index) => (
          <button
            key={entry.label}
            onClick={() => setSlide(index)}
            className={cn("rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/50", slide === index && "bg-white text-black")}
          >
            {entry.label}
          </button>
        ))}
      </nav>
    </main>
  );
}

"use client";

import Link from "next/link";
import { Eye, Heart, Presentation, Scale, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TemplateMetadata } from "@/lib/types";
import { makeProjectFromTemplate, upsertProject } from "@/lib/projects";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getTemplateInsight } from "@/lib/templateInsights";

export function TemplateCard({
  template,
  isFavorite,
  isCompared,
  onToggleFavorite,
  onToggleCompare
}: {
  template: TemplateMetadata;
  isFavorite?: boolean;
  isCompared?: boolean;
  onToggleFavorite?: (id: string) => void;
  onToggleCompare?: (id: string) => void;
}) {
  const router = useRouter();
  const insight = getTemplateInsight(template);

  function useTemplate() {
    const project = upsertProject(makeProjectFromTemplate(template));
    router.push(`/builder?projectId=${project.id}`);
  }

  return (
    <article data-template-card className="group flex min-h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-ink hover:shadow-canvas dark:border-slate-800 dark:bg-slate-950 dark:hover:border-white">
      <Link href={`/templates/${template.id}`} className="block" aria-label={`Preview ${template.name}`}>
        <div className="tf-scanline relative aspect-[1.38] overflow-hidden bg-slate-100 dark:bg-slate-900">
          <TemplateMiniature template={template} />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <Badge className="bg-white/90">{template.exportType}</Badge>
            {template.animationLibrary && <Badge className="bg-white/90">{template.animationLibrary}</Badge>}
          </div>
          <div className="absolute right-3 top-3 rounded-full border border-white/30 bg-black/45 px-3 py-1 text-xs font-black text-white backdrop-blur">
            {insight.score}
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 text-white">
            <span className="font-display text-xs">{template.colorStyle.split(",")[0]}</span>
            <span className="rounded-full border border-white/30 bg-white/15 px-2 py-1 text-[10px] font-bold backdrop-blur">{template.layoutStyle.split(" ").slice(0, 2).join(" ")}</span>
          </div>
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Badge>{template.framework}</Badge>
            <Badge>{template.websiteType}</Badge>
          </div>
          <h3 className="font-display text-base font-black leading-tight">{template.name}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{template.description}</p>
          <div className="mt-3 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center justify-between gap-3">
              <span className="font-black text-slate-500 dark:text-slate-400">Design DNA</span>
              <span className="text-right font-bold">{insight.designDna}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="h-full rounded-full bg-forge-blue" style={{ width: `${insight.score}%` }} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" size="sm" onClick={() => onToggleFavorite?.(template.id)} className={isFavorite ? "border-forge-pink text-forge-pink" : ""}>
            <Heart size={15} fill={isFavorite ? "currentColor" : "none"} /> Save
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onToggleCompare?.(template.id)} className={isCompared ? "border-forge-blue text-forge-blue" : ""}>
            <Scale size={15} /> Compare
          </Button>
          <Link href={`/presentation/${template.id}`}>
            <Button variant="secondary" size="sm" className="w-full">
              <Presentation size={15} />
            </Button>
          </Link>
        </div>
        <div className="mt-auto flex items-center gap-2">
          <Link href={`/templates/${template.id}`} className="flex-1">
            <Button variant="secondary" className="w-full">
              <Eye size={16} /> Preview
            </Button>
          </Link>
          <Button className="flex-1" onClick={useTemplate}>
            <Wand2 size={16} /> Use
          </Button>
        </div>
      </div>
    </article>
  );
}

function TemplateMiniature({ template }: { template: TemplateMetadata }) {
  const colors = template.editableSettings.colors;
  const dark = colors.background.toLowerCase().includes("09") || colors.background.toLowerCase().includes("0b") || colors.text === "#f8fbff";
  const profile = template.designProfile;

  return (
    <div
      className="absolute inset-0 p-6 transition duration-500 group-hover:scale-[1.03]"
      style={{
        background: `linear-gradient(135deg, ${colors.background}, ${colors.surface})`,
        color: colors.text,
        fontFamily: template.editableSettings.typography.fontFamily
      }}
    >
      <div className="absolute inset-0 opacity-25 tf-ambient-grid" />
      <div
        className={cn(
          "relative flex h-full flex-col justify-between overflow-hidden border border-black/10 bg-white/20 p-5 backdrop-blur-sm",
          profile === "brutalist-poster" ? "rounded-none border-[3px] border-current" : "rounded-md",
          profile === "cyber-interface" && "border-cyan-300/70 bg-black/70 text-white",
          profile === "luxury-editorial" && "bg-[#fff8ec]/80",
          profile === "glass-lab" && "bg-white/35 backdrop-blur-xl"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="h-3 w-28 rounded-full" style={{ background: dark ? "rgba(255,255,255,.72)" : colors.text }} />
          <div className="flex gap-2">
            <span className="h-3 w-10 rounded-full" style={{ background: colors.accent }} />
            <span className="h-3 w-10 rounded-full" style={{ background: colors.accent2 }} />
          </div>
        </div>
        <div className={cn(profile === "luxury-editorial" && "text-center")}>
          <div className="mb-3 h-1 w-12" style={{ background: colors.accent }} />
          <h4
            className={cn(
              "text-3xl font-black uppercase leading-none tracking-[0.05em]",
              profile === "luxury-editorial" ? "font-luxury mx-auto max-w-[84%] text-4xl tracking-[0.03em]" : "max-w-[68%]",
              profile === "brutalist-poster" && "text-4xl",
              profile === "cyber-interface" && "text-cyan-100"
            )}
          >
            {template.name.split(" ").slice(0, 2).join(" ")}
          </h4>
          <p className="mt-3 max-w-[62%] text-xs font-semibold leading-5 opacity-75">{template.heroStyle}</p>
        </div>
        <div
          className={cn(
            "absolute grid w-32 gap-3",
            profile === "pastel-collage" ? "bottom-10 right-12 rotate-6" : "bottom-8 right-8",
            profile === "brutalist-poster" && "right-6 top-24",
            profile === "luxury-editorial" && "bottom-6 left-1/2 right-auto -translate-x-1/2"
          )}
        >
          <div className="aspect-square rounded-md border border-black/15" style={{ background: colors.accent }} />
          <div className="h-3 rounded-full" style={{ background: dark ? "rgba(255,255,255,.75)" : colors.text }} />
          <div className="h-3 w-2/3 rounded-full opacity-60" style={{ background: dark ? "rgba(255,255,255,.55)" : colors.muted }} />
        </div>
        {profile === "cyber-interface" && <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_8px,rgba(32,215,255,.16)_9px)]" />}
        {profile === "pastel-collage" && <div className="absolute left-8 top-16 h-20 w-24 -rotate-12 rounded-2xl bg-white/70 shadow-xl" />}
        {profile === "glass-lab" && <div className="absolute right-12 top-14 h-28 w-28 rounded-full border border-white/50 bg-white/20" />}
      </div>
    </div>
  );
}

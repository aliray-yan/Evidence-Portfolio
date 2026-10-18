"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Boxes, Heart, RotateCcw, Search, SlidersHorizontal, Sparkles, Store, Trophy, X, Zap } from "lucide-react";
import gsap from "gsap";
import { templates, categoryOptions, websiteTypeOptions } from "@/data/templates";
import { TemplateCard } from "@/components/library/TemplateCard";
import { Field, Input, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useTemplateCollections } from "@/hooks/useTemplateCollections";
import { getTemplateInsight } from "@/lib/templateInsights";

const all = "all";

const presets = [
  {
    id: "all",
    label: "All",
    icon: RotateCcw,
    description: "Clear every filter."
  },
  {
    id: "internship",
    label: "Internship Picks",
    icon: Trophy,
    description: "High-contrast templates that show AI/frontend range."
  },
  {
    id: "motion",
    label: "Motion Systems",
    icon: Zap,
    description: "Animated templates with professional motion libraries."
  },
  {
    id: "storefront",
    label: "Storefront UX",
    icon: Store,
    description: "Commerce flows with products, filters, carts, and reviews."
  },
  {
    id: "react",
    label: "React Components",
    icon: Boxes,
    description: "Component-heavy templates with rich app-style UI."
  },
  {
    id: "visual",
    label: "High Visual Drama",
    icon: Sparkles,
    description: "Luxury, cyber, glass, and brutalist design directions."
  }
];

export function TemplateBrowser() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(all);
  const [websiteType, setWebsiteType] = useState(all);
  const [framework, setFramework] = useState(all);
  const [animation, setAnimation] = useState(all);
  const [colorStyle, setColorStyle] = useState(all);
  const [layoutStyle, setLayoutStyle] = useState(all);
  const [activePreset, setActivePreset] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { favoriteIds, compareIds, favoriteSet, compareSet, toggleFavorite, toggleCompare, clearCompare, maxCompare } = useTemplateCollections();

  const frameworkOptions = useMemo(() => Array.from(new Set(templates.map((template) => template.framework))).sort(), []);
  const animationOptions = useMemo(() => Array.from(new Set(templates.map((template) => template.animationLibrary).filter(Boolean) as string[])).sort(), []);
  const colorOptions = useMemo(() => Array.from(new Set(templates.map((template) => template.colorStyle))).sort(), []);
  const layoutOptions = useMemo(() => Array.from(new Set(templates.map((template) => template.layoutStyle))).sort(), []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const queryTerms = query.split(/\s+/).filter(Boolean);

    return templates.filter((template) => {
      const haystack = [template.name, template.description, template.framework, template.animationLibrary, template.colorStyle, template.layoutStyle, ...template.tags]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (queryTerms.length === 0 || queryTerms.some((term) => haystack.includes(term))) &&
        (category === all || template.category === category) &&
        (websiteType === all || template.websiteType === websiteType) &&
        (framework === all || template.framework === framework) &&
        (animation === all || template.animationLibrary === animation) &&
        (colorStyle === all || template.colorStyle === colorStyle) &&
        (layoutStyle === all || template.layoutStyle === layoutStyle) &&
        (!favoritesOnly || favoriteSet.has(template.id))
      );
    });
  }, [animation, category, colorStyle, favoriteSet, favoritesOnly, framework, layoutStyle, search, websiteType]);
  const filterSignature = useMemo(() => filtered.map((template) => template.id).join("|"), [filtered]);
  const compareTemplates = useMemo(() => compareIds.map((id) => templates.find((template) => template.id === id)).filter(Boolean), [compareIds]) as typeof templates;
  const filteredCategories = useMemo(() => {
    return categoryOptions.map((entry) => ({
      ...entry,
      count: filtered.filter((template) => template.category === entry.id).length
    }));
  }, [filtered]);

  function applyPreset(presetId: string) {
    setActivePreset(presetId);
    setSearch("");
    setCategory(all);
    setWebsiteType(all);
    setFramework(all);
    setAnimation(all);
    setColorStyle(all);
    setLayoutStyle(all);

    if (presetId === "internship") {
      setSearch("cyber glass brutalist react");
    }

    if (presetId === "motion") {
      setCategory("animated");
      setAnimation("GSAP");
    }

    if (presetId === "storefront") {
      setWebsiteType("ecommerce");
    }

    if (presetId === "react") {
      setCategory("react");
    }

    if (presetId === "visual") {
      setSearch("luxury cyber glass brutalist");
    }
  }

  useEffect(() => {
    const cards = gsap.utils.toArray<HTMLElement>("[data-template-card]");
    gsap.killTweensOf(cards);
    gsap.set(cards, { opacity: 1, scale: 1, y: 0, clearProps: "transform" });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || cards.length === 0) {
      return;
    }

    gsap.fromTo(
      cards,
      { y: 18, scale: 0.985 },
      {
        y: 0,
        scale: 1,
        duration: 0.36,
        ease: "power2.out",
        stagger: 0.025,
        clearProps: "transform"
      }
    );

    return () => {
      gsap.killTweensOf(cards);
      gsap.set(cards, { opacity: 1, clearProps: "transform" });
    };
  }, [filterSignature]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge>{templates.length} templates</Badge>
          <h1 data-gsap="fade-up" className="font-display mt-3 text-3xl font-black tracking-normal sm:text-5xl">Template Library</h1>
          <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
            Browse static, framework-based, animated, and React component templates with export-ready architecture.
          </p>
        </div>
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
          <Input aria-label="Search templates" className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search style, framework, category..." />
          <button
            type="button"
            onClick={() => setFavoritesOnly((value) => !value)}
            className={cn("mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold", favoritesOnly ? "border-forge-pink text-forge-pink" : "border-slate-200 text-slate-500 dark:border-slate-800")}
          >
            <Heart size={14} fill={favoritesOnly ? "currentColor" : "none"} /> Favorites only ({favoriteIds.length})
          </button>
        </div>
      </div>

      <div data-gsap="fade-up" className="mb-5 grid gap-3 lg:grid-cols-[1fr_280px]">
        <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-2 xl:grid-cols-6">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className={cn(
                "group rounded-md border border-slate-200 p-3 text-left transition hover:-translate-y-0.5 hover:border-ink hover:shadow-sm dark:border-slate-800 dark:hover:border-white",
                activePreset === preset.id && "border-ink bg-slate-100 dark:border-white dark:bg-slate-900"
              )}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <preset.icon size={17} className="text-forge-blue" />
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-800">
                  {preset.id === "all" ? templates.length : filtered.length}
                </span>
              </div>
              <div className="text-sm font-black">{preset.label}</div>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{preset.description}</p>
            </button>
          ))}
        </div>
        <div className="rounded-lg border border-slate-200 bg-ink p-4 text-white shadow-sm dark:border-slate-800">
          <div className="text-xs font-black uppercase tracking-[0.2em] text-white/55">Current curation</div>
          <div className="mt-3 text-3xl font-black">{filtered.length}</div>
          <p className="mt-1 text-sm leading-6 text-white/70">templates match. Static, motion, storefront, and React systems stay export-ready from the same data model.</p>
        </div>
      </div>

      <div data-gsap="fade-up" className="mb-8 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold">
          <SlidersHorizontal size={17} />
          Filters
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <Field label="Category">
            <Select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value={all}>All categories</option>
              {categoryOptions.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Website type">
            <Select value={websiteType} onChange={(event) => setWebsiteType(event.target.value)}>
              <option value={all}>All types</option>
              {websiteTypeOptions.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Framework">
            <Select value={framework} onChange={(event) => setFramework(event.target.value)}>
              <option value={all}>All frameworks</option>
              {frameworkOptions.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Animation">
            <Select value={animation} onChange={(event) => setAnimation(event.target.value)}>
              <option value={all}>Any animation</option>
              {animationOptions.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Color style">
            <Select value={colorStyle} onChange={(event) => setColorStyle(event.target.value)}>
              <option value={all}>All palettes</option>
              {colorOptions.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Layout style">
            <Select value={layoutStyle} onChange={(event) => setLayoutStyle(event.target.value)}>
              <option value={all}>All layouts</option>
              {layoutOptions.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <h2 className="text-xl font-black">No templates found</h2>
          <p className="mt-2 text-sm text-slate-500">Try clearing a filter or searching for a broader visual direction.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 text-sm font-medium text-slate-500 lg:flex-row lg:items-center lg:justify-between">
            <div>{filtered.length} templates match your filters</div>
            <div className="flex flex-wrap gap-2">
              {filteredCategories.map((entry) => (
                <span key={entry.id} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold dark:border-slate-800 dark:bg-slate-950">
                  {entry.label}: {entry.count}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isFavorite={favoriteSet.has(template.id)}
                isCompared={compareSet.has(template.id)}
                onToggleFavorite={toggleFavorite}
                onToggleCompare={toggleCompare}
              />
            ))}
          </div>
        </>
      )}

      {compareTemplates.length > 0 && (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-6xl rounded-lg border border-slate-200 bg-white p-4 shadow-canvas dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Compare mode</div>
              <div className="text-sm font-bold">{compareTemplates.length}/{maxCompare} templates selected</div>
            </div>
            <Button variant="secondary" size="sm" onClick={clearCompare}>
              <X size={14} /> Clear
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {compareTemplates.map((template) => {
              const insight = getTemplateInsight(template);
              return (
                <article key={template.id} className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black">{template.name}</h3>
                      <p className="mt-1 text-xs text-slate-500">{template.framework}</p>
                    </div>
                    <span className="rounded-full bg-ink px-2 py-1 text-xs font-black text-white dark:bg-white dark:text-ink">{insight.score}</span>
                  </div>
                  <div className="mt-3 grid gap-1 text-xs text-slate-600 dark:text-slate-400">
                    <span>{insight.designDna}</span>
                    <span>{template.pages.length} pages / {template.sections.length} sections</span>
                    <span>{template.exportType.toUpperCase()} export</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link href={`/templates/${template.id}`} className="flex-1">
                      <Button variant="secondary" size="sm" className="w-full">Preview</Button>
                    </Link>
                    <Link href={`/presentation/${template.id}`} className="flex-1">
                      <Button size="sm" className="w-full">Present</Button>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

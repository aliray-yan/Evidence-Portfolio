"use client";

import Link from "next/link";
import { ArrowRight, Code2, Download, Gauge, GitBranch, Layers3, MonitorSmartphone, Palette, Rocket, Search } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TemplateCard } from "@/components/library/TemplateCard";
import { getFeaturedTemplates, templates } from "@/data/templates";

export function LandingPage() {
  const featured = getFeaturedTemplates();
  const counts = {
    static: templates.filter((template) => template.category === "static").length,
    framework: templates.filter((template) => template.category === "framework").length,
    animated: templates.filter((template) => template.category === "animated").length,
    react: templates.filter((template) => template.category === "react").length
  };

  return (
    <main className="min-h-screen bg-mist text-ink dark:bg-ink dark:text-white">
      <AppHeader />
      <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden border-b border-slate-900 bg-black text-white">
        <div className="tf-ambient-grid absolute inset-0 opacity-60" />
        <div className="tf-dark-geometry" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black to-transparent" />
        <div className="absolute inset-y-16 right-[-10vw] hidden w-[66vw] rotate-[-6deg] overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] shadow-2xl lg:block" data-gsap="float">
          <div className="grid h-full grid-cols-[220px_1fr_260px] gap-3 p-5 opacity-90">
            <div className="rounded-md border border-white/10 bg-white/[0.06] p-4">
              <div className="mb-5 h-3 w-28 rounded-full bg-white/40" />
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="mb-3 h-12 rounded border border-white/10 bg-black/40" />
              ))}
            </div>
            <div className="overflow-hidden rounded-md border border-white/10 bg-black">
              <img src="/assets/template-5.svg" alt="" className="h-full w-full object-cover opacity-85" />
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.06] p-4">
              <div className="mb-5 h-3 w-32 rounded-full bg-white/40" />
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="mb-4 h-16 rounded border border-white/10 bg-black/40" />
              ))}
            </div>
          </div>
        </div>
        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl content-center px-4 py-20 sm:px-6">
          <div className="max-w-4xl" data-gsap="fade-up">
            <Badge className="mb-5 border-white/20 bg-white/10 text-white">{templates.length} export-ready templates</Badge>
            <p className="font-display mb-4 text-xs text-forge-pink">Visual builder / responsive previews / clean exports</p>
            <h1 className="font-display max-w-5xl text-5xl font-black leading-none tracking-normal sm:text-7xl lg:text-8xl">
              TemplateForge
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Browse polished website templates, customize them visually, preview responsive layouts, and export clean source code for static sites, frameworks, animated builds, Shopify themes, and Shopline-ready storefronts.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/library">
                <Button className="!border-white !bg-white !text-black hover:!bg-slate-100">
                  Start Building <ArrowRight size={17} />
                </Button>
              </Link>
              <Link href="/projects">
                <Button variant="secondary" className="border-white/25 bg-white/10 text-white hover:bg-white/15">Open My Projects</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-slate-950" data-gsap="fade-up">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {[
            { icon: Gauge, label: "Template intelligence", value: "Quality scores, design DNA, stack briefs" },
            { icon: Rocket, label: "Curated presets", value: "Internship picks, motion, storefront, React" },
            { icon: Code2, label: "Export coverage", value: "Static, framework, animated, Shopify, Shopline" },
            { icon: GitBranch, label: "Repo ready", value: "GitHub-friendly source with launcher project" }
          ].map((item) => (
            <article key={item.label} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <item.icon size={20} className="mb-3 text-forge-blue" />
              <h2 className="text-sm font-black">{item.label}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" data-gsap="fade-up">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { icon: Search, title: "Browse and filter", body: "Search by category, type, framework, animation, color, and layout." },
            { icon: Palette, title: "Customize visually", body: "Edit text, colors, typography, spacing, images, and sections." },
            { icon: MonitorSmartphone, title: "Preview responsively", body: "Switch between desktop, tablet, and mobile canvas widths." },
            { icon: Download, title: "Export code", body: "Download ZIPs with source files, README files, and platform structure." }
          ].map((feature) => (
            <article key={feature.title} className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <feature.icon className="mb-4 text-forge-blue" size={24} />
              <h2 className="font-black">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-950" data-gsap="fade-up">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <Badge>
                <Layers3 size={13} /> Categories
              </Badge>
              <h2 className="font-display mt-3 text-3xl font-black">Three complete template systems</h2>
            </div>
            <Link href="/library">
              <Button variant="secondary">View all templates</Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { title: "Static Websites", count: counts.static, body: "Plain HTML, CSS, and JavaScript. No animation in this category." },
              { title: "Framework-Based Websites", count: counts.framework, body: "Tailwind-first templates plus Bootstrap, Bulma, Foundation, and Vanilla CSS options." },
              { title: "Animated Websites", count: counts.animated, body: "GSAP, Framer Motion, CSS animation, smooth scroll, micro-interaction, and reduce-motion support." },
              { title: "React Component Websites", count: counts.react, body: "Component-driven templates with bento dashboards, command surfaces, configurators, and rich UI systems." }
            ].map((category) => (
              <article key={category.title} className="rounded-lg border border-slate-200 p-6 dark:border-slate-800">
                <div className="text-4xl font-black">{category.count}</div>
                <h3 className="mt-3 text-xl font-black">{category.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{category.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" data-gsap="fade-up">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <Badge>Featured templates</Badge>
            <h2 className="font-display mt-3 text-3xl font-black">Start with a strong direction</h2>
          </div>
          <Link href="/library">
            <Button variant="secondary">Browse library</Button>
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {featured.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      </section>
    </main>
  );
}

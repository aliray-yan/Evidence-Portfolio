"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Download,
  Eye,
  EyeOff,
  GripVertical,
  Laptop,
  Moon,
  PanelLeft,
  PanelRight,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Smartphone,
  Tablet,
  Trash2,
  Undo2,
  Wand2
} from "lucide-react";
import { templates, getTemplateById, categoryOptions } from "@/data/templates";
import { sectionLibrary } from "@/data/sectionLibrary";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Logo } from "@/components/layout/Logo";
import { TemplateRenderer } from "@/components/preview/TemplateRenderer";
import { DeviceMode, Project, TemplateSection } from "@/lib/types";
import { findProjectOrTemplate, upsertProject } from "@/lib/projects";
import { copyToClipboard, downloadZip, sectionToHtml } from "@/lib/exporter";
import { cn } from "@/lib/utils";
import { getEditorPage, getEditorSection, useEditorStore } from "@/store/editorStore";

const deviceWidth: Record<DeviceMode, number> = {
  desktop: 1120,
  tablet: 768,
  mobile: 390
};

const stylePresets: Array<{
  label: string;
  description: string;
  patch: {
    colors: Partial<Project["settings"]["colors"]>;
    typography: Partial<Project["settings"]["typography"]>;
    layout: Partial<Project["settings"]["layout"]>;
  };
}> = [
  {
    label: "Cyber Demo",
    description: "Dark, neon, interface-heavy.",
    patch: {
      colors: { background: "#090b13", text: "#f8fbff", muted: "#9ca3af", accent: "#20d7ff", accent2: "#ff36b9", surface: "#121725" },
      typography: { fontFamily: "Aquire, Orbitron, Inter, ui-sans-serif, system-ui", headingSize: 72, bodySize: 16, fontWeight: 900, lineHeight: 1.02 },
      layout: { radius: 18, spacing: 86, shadow: "bold" }
    }
  },
  {
    label: "Luxury Pitch",
    description: "Editorial, refined, premium.",
    patch: {
      colors: { background: "#f5efe4", text: "#221915", muted: "#806f64", accent: "#a36b3d", accent2: "#d4af72", surface: "#fffaf2" },
      typography: { fontFamily: "Vorage, 'Bodoni 72', Didot, Georgia, serif", headingSize: 78, bodySize: 17, fontWeight: 700, lineHeight: 1.08 },
      layout: { radius: 6, spacing: 96, shadow: "soft" }
    }
  },
  {
    label: "Swiss Sharp",
    description: "Clean, editorial, readable.",
    patch: {
      colors: { background: "#f7f5ef", text: "#151515", muted: "#6f6a60", accent: "#e23d28", accent2: "#111111", surface: "#ffffff" },
      typography: { fontFamily: "Aquire, Orbitron, Rajdhani, Arial, sans-serif", headingSize: 66, bodySize: 16, fontWeight: 900, lineHeight: 1.04 },
      layout: { radius: 2, spacing: 78, shadow: "none" }
    }
  },
  {
    label: "Pastel Lab",
    description: "Friendly, playful, agency-ready.",
    patch: {
      colors: { background: "#fff7fb", text: "#24302f", muted: "#687675", accent: "#ff8fb3", accent2: "#8edfc4", surface: "#ffffff" },
      typography: { fontFamily: "Vorage, Inter, ui-sans-serif, system-ui", headingSize: 64, bodySize: 16, fontWeight: 800, lineHeight: 1.12 },
      layout: { radius: 24, spacing: 84, shadow: "soft" }
    }
  }
];

const sectionTreatments: Array<{
  label: string;
  styles: Partial<TemplateSection["styles"]>;
}> = [
  {
    label: "Glass",
    styles: { layoutVariant: "glass", texture: "grid", contrast: "soft", background: "linear-gradient(135deg, rgba(255,255,255,.84), rgba(237,247,247,.92))" }
  },
  {
    label: "Poster",
    styles: { layoutVariant: "poster", texture: "paper", contrast: "high", background: "var(--tf-bg)" }
  },
  {
    label: "Console",
    styles: { layoutVariant: "console", texture: "scanline", contrast: "dark", background: "#090b13", text: "#f8fbff" }
  },
  {
    label: "Gallery",
    styles: { layoutVariant: "gallery", texture: "paper", contrast: "soft", background: "var(--tf-bg)" }
  }
];

function useThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("templateforge-theme");
    const next = stored === "dark";
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  }, []);

  return {
    dark,
    toggle: () => {
      const next = !dark;
      setDark(next);
      window.localStorage.setItem("templateforge-theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
    }
  };
}

export function BuilderApp() {
  const router = useRouter();
  const params = useSearchParams();
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const { dark, toggle } = useThemeToggle();

  const {
    project,
    selectedPageId,
    selectedSectionId,
    historyIndex,
    history,
    loadProject,
    selectPage,
    selectSection,
    updateSettings,
    updateSection,
    reorderSection,
    duplicateSection,
    deleteSection,
    toggleSection,
    addSectionFromLibrary,
    renameProject,
    resetFromTemplate,
    undo,
    redo
  } = useEditorStore();

  useEffect(() => {
    const projectId = params.get("projectId");
    const templateId = params.get("templateId");
    loadProject(findProjectOrTemplate(projectId, templateId));
  }, [loadProject, params]);

  const page = getEditorPage(project, selectedPageId);
  const selectedSection = getEditorSection(project, selectedPageId, selectedSectionId);
  const template = project ? getTemplateById(project.templateId) : null;

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 1800);
  }

  function saveProject() {
    if (!project) return;
    const saved = upsertProject(project);
    loadProject(saved);
    router.replace(`/builder?projectId=${saved.id}`);
    flash("Draft saved locally");
  }

  async function exportProject() {
    if (!project) return;
    await downloadZip(project, "project", selectedPageId);
    flash("Project ZIP generated");
  }

  async function exportPage() {
    if (!project) return;
    await downloadZip(project, "page", selectedPageId);
    flash("Current page ZIP generated");
  }

  async function copySection() {
    if (!selectedSection) return;
    await copyToClipboard(sectionToHtml(selectedSection));
    flash("Section code copied");
  }

  if (!project || !page || !template) {
    return (
      <main className="grid min-h-screen place-items-center bg-mist text-ink dark:bg-ink dark:text-white">
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-panel dark:border-slate-800 dark:bg-slate-950">
          <Logo />
          <p className="mt-4 text-sm text-slate-500">Loading editor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-100 text-ink dark:bg-[#0b0f16] dark:text-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/library">
            <Button variant="icon" aria-label="Back to library">
              <ArrowLeft size={17} />
            </Button>
          </Link>
          <Logo dense />
          <div className="hidden min-w-0 border-l border-slate-200 pl-3 dark:border-slate-800 sm:block">
            <Input value={project.name} onChange={(event) => renameProject(event.target.value)} aria-label="Project name" className="font-display h-9 max-w-72 border-transparent bg-slate-100 font-bold dark:bg-slate-900" />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <DeviceButtons device={device} setDevice={setDevice} />
          <Button variant="icon" aria-label="Undo" disabled={historyIndex <= 0} onClick={undo}>
            <Undo2 size={17} />
          </Button>
          <Button variant="icon" aria-label="Redo" disabled={historyIndex >= history.length - 1} onClick={redo}>
            <Redo2 size={17} />
          </Button>
          <Button variant="icon" aria-label="Save draft" onClick={saveProject}>
            <Save size={17} />
          </Button>
          <Button variant="icon" aria-label={dark ? "Light UI mode" : "Dark UI mode"} onClick={toggle}>
            <Moon size={17} />
          </Button>
          <Button variant="secondary" size="sm" onClick={exportPage} className="hidden sm:inline-flex">
            <Download size={16} /> Page
          </Button>
          <Button size="sm" onClick={exportProject}>
            <Download size={16} /> Export
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)_330px] max-lg:grid-cols-[240px_minmax(0,1fr)] max-md:grid-cols-1">
        <aside className="panel-scrollbar overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 max-md:hidden">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-3 flex items-center gap-2 text-sm font-black">
              <PanelLeft size={17} /> Workspace
            </div>
            <div className="grid gap-2">
              {categoryOptions.map((category) => (
                <div key={category.id} className={cn("rounded-md border border-slate-200 p-3 text-xs dark:border-slate-800", template.category === category.id && "border-ink bg-slate-100 dark:border-white dark:bg-slate-900")}>
                  <div className="font-black">{category.label}</div>
                  <div className="mt-1 text-slate-500">{templates.filter((entry) => entry.category === category.id).length} templates</div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-3 text-sm font-black">Pages</div>
            <div className="grid gap-2">
              {project.pages.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => selectPage(entry.id)}
                  className={cn("rounded-md border border-slate-200 px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900", selectedPageId === entry.id && "border-ink bg-slate-100 dark:border-white dark:bg-slate-900")}
                >
                  {entry.name}
                  <span className="ml-2 text-xs text-slate-500">{entry.slug}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            <div className="mb-3 text-sm font-black">Sections and Layers</div>
            <div className="grid gap-2">
              {page.sections.map((section) => (
                <div
                  key={section.id}
                  draggable
                  onDragStart={() => setDraggedId(section.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggedId) reorderSection(draggedId, section.id);
                    setDraggedId(null);
                  }}
                  className={cn(
                    "group flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-800 dark:bg-slate-950",
                    selectedSectionId === section.id && "border-forge-blue ring-2 ring-forge-blue/25"
                  )}
                >
                  <GripVertical className="shrink-0 text-slate-400" size={16} />
                  <button className="min-w-0 flex-1 truncate text-left font-semibold" onClick={() => selectSection(section.id)}>
                    {section.title}
                  </button>
                  <button aria-label={section.visible ? `Hide ${section.title}` : `Show ${section.title}`} onClick={() => toggleSection(section.id)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                    {section.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="canvas-scrollbar min-w-0 overflow-auto bg-slate-200 p-5 dark:bg-[#101722]">
          {notice && <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white shadow-panel dark:bg-white dark:text-ink">{notice}</div>}
          <div className="mx-auto transition-all" style={{ width: Math.min(deviceWidth[device], device === "desktop" ? 1280 : deviceWidth[device]) }}>
            <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-500">
              <span>{page.name}</span>
              <span>{device} - {deviceWidth[device]}px</span>
            </div>
            <div className="overflow-hidden rounded-lg bg-white shadow-canvas">
              <TemplateRenderer
                page={page}
                settings={project.settings}
                editable
                selectedSectionId={selectedSectionId ?? undefined}
                onSelectSection={selectSection}
                onUpdateSection={updateSection}
              />
            </div>
          </div>
        </section>

        <aside className="panel-scrollbar overflow-y-auto border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 max-lg:hidden">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-black">
                <PanelRight size={17} /> Inspector
              </div>
              <Badge>{template.framework}</Badge>
            </div>
            <p className="text-xs leading-5 text-slate-500">{template.description}</p>
          </div>

          <Inspector
            project={project}
            section={selectedSection}
            updateSection={updateSection}
            updateSettings={updateSettings}
            duplicateSection={duplicateSection}
            deleteSection={(id) => {
              if (window.confirm("Delete this section from the current page?")) deleteSection(id);
            }}
            copySection={copySection}
          />

          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-3 flex items-center gap-2 text-sm font-black">
              <Plus size={17} /> Section Library
            </div>
            <div className="grid gap-2">
              {sectionLibrary.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    addSectionFromLibrary(section.id);
                    flash(`${section.title} added`);
                  }}
                  className="rounded-md border border-slate-200 px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                >
                  {section.title}
                  <span className="ml-2 text-xs font-normal text-slate-500">{section.type}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <div className="grid gap-2">
              <Button variant="secondary" onClick={copySection} disabled={!selectedSection}>
                <Copy size={16} /> Copy Code
              </Button>
              <Link href={`/export?projectId=${project.id}`} onClick={saveProject}>
                <Button variant="secondary" className="w-full">
                  <Download size={16} /> Export Screen
                </Button>
              </Link>
              <Button
                variant="secondary"
                onClick={() => {
                  if (window.confirm("Reset this project to the template defaults?")) {
                    resetFromTemplate(template);
                    flash("Template reset");
                  }
                }}
              >
                <RotateCcw size={16} /> Reset Template
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function DeviceButtons({ device, setDevice }: { device: DeviceMode; setDevice: (device: DeviceMode) => void }) {
  const options: Array<{ id: DeviceMode; label: string; icon: typeof Laptop }> = [
    { id: "desktop", label: "Desktop preview", icon: Laptop },
    { id: "tablet", label: "Tablet preview", icon: Tablet },
    { id: "mobile", label: "Mobile preview", icon: Smartphone }
  ];

  return (
    <div className="mr-1 hidden rounded-md border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-800 dark:bg-slate-900 sm:flex">
      {options.map((option) => (
        <button
          key={option.id}
          aria-label={option.label}
          onClick={() => setDevice(option.id)}
          className={cn("grid h-8 w-8 place-items-center rounded text-slate-500", device === option.id && "bg-white text-ink shadow-sm dark:bg-slate-700 dark:text-white")}
        >
          <option.icon size={16} />
        </button>
      ))}
    </div>
  );
}

function Inspector({
  project,
  section,
  updateSection,
  updateSettings,
  duplicateSection,
  deleteSection,
  copySection
}: {
  project: Project;
  section: TemplateSection | null;
  updateSection: (sectionId: string, patch: Partial<TemplateSection>) => void;
  updateSettings: ReturnType<typeof useEditorStore.getState>["updateSettings"];
  duplicateSection: (sectionId: string) => void;
  deleteSection: (sectionId: string) => void;
  copySection: () => void;
}) {
  const contentEntries = useMemo(() => Object.entries(section?.content ?? {}), [section]);

  function updateImageFromFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !section) return;

    const reader = new FileReader();
    reader.onload = () => updateSection(section.id, { image: String(reader.result) });
    reader.readAsDataURL(file);
  }

  return (
    <div className="grid gap-5 p-4">
      {section ? (
        <div className="grid gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Selected section</div>
            <h2 className="mt-1 font-black">{section.title}</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="secondary" size="sm" onClick={() => duplicateSection(section.id)}>
              Duplicate
            </Button>
            <Button variant="secondary" size="sm" onClick={copySection}>
              Copy
            </Button>
            <Button variant="danger" size="sm" onClick={() => deleteSection(section.id)}>
              <Trash2 size={14} />
            </Button>
          </div>
          <div className="grid gap-2">
            <div className="text-xs font-bold text-slate-500">Section treatment</div>
            <div className="grid grid-cols-2 gap-2">
              {sectionTreatments.map((treatment) => (
                <Button key={treatment.label} variant="secondary" size="sm" onClick={() => updateSection(section.id, { styles: treatment.styles })}>
                  {treatment.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-slate-700">
          Select a section on the canvas or in the layer list.
        </div>
      )}

      {section && (
        <div className="grid gap-3">
          <h3 className="text-sm font-black">Content</h3>
          {contentEntries.map(([key, value]) => (
            <Field key={key} label={key}>
              {value.length > 60 ? (
                <Textarea value={value} onChange={(event) => updateSection(section.id, { content: { [key]: event.target.value } })} />
              ) : (
                <Input value={value} onChange={(event) => updateSection(section.id, { content: { [key]: event.target.value } })} />
              )}
            </Field>
          ))}
          {section.items && (
            <div className="grid gap-2">
              <div className="text-xs font-bold text-slate-500">Product/project items</div>
              {section.items.slice(0, 4).map((item, index) => (
                <div key={index} className="grid gap-2 rounded-md border border-slate-200 p-2 dark:border-slate-800">
                  <Input
                    aria-label={`Item ${index + 1} title`}
                    value={item.title ?? item.name ?? item.question ?? ""}
                    onChange={(event) => {
                      const items = [...(section.items ?? [])];
                      items[index] = { ...items[index], title: event.target.value };
                      updateSection(section.id, { items });
                    }}
                  />
                  <Input
                    aria-label={`Item ${index + 1} detail`}
                    value={item.price ?? item.body ?? item.answer ?? ""}
                    onChange={(event) => {
                      const items = [...(section.items ?? [])];
                      const key = item.price ? "price" : item.answer ? "answer" : "body";
                      items[index] = { ...items[index], [key]: event.target.value };
                      updateSection(section.id, { items });
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {section && (
        <div className="grid gap-3">
          <h3 className="text-sm font-black">Media</h3>
          <Field label="Image URL">
            <Input value={section.image ?? ""} onChange={(event) => updateSection(section.id, { image: event.target.value })} placeholder="https://..." />
          </Field>
          <Field label="Upload image">
            <Input type="file" accept="image/*" onChange={updateImageFromFile} />
          </Field>
        </div>
      )}

      <div className="grid gap-3">
        <h3 className="text-sm font-black">Design System</h3>
        <div className="grid gap-2">
          <div className="text-xs font-bold text-slate-500">One-click visual systems</div>
          <div className="grid gap-2">
            {stylePresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => updateSettings(preset.patch)}
                className="rounded-md border border-slate-200 p-3 text-left transition hover:border-ink hover:bg-slate-50 dark:border-slate-800 dark:hover:border-white dark:hover:bg-slate-900"
              >
                <div className="font-display text-xs font-black">{preset.label}</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">{preset.description}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {([
            ["background", project.settings.colors.background],
            ["text", project.settings.colors.text],
            ["muted", project.settings.colors.muted],
            ["accent", project.settings.colors.accent],
            ["accent2", project.settings.colors.accent2],
            ["surface", project.settings.colors.surface]
          ] as Array<[keyof Project["settings"]["colors"], string]>).map(([key, value]) => (
            <Field key={key} label={key}>
              <Input type="color" value={value.startsWith("#") ? value : "#ffffff"} onChange={(event) => updateSettings({ colors: { [key]: event.target.value } })} />
            </Field>
          ))}
        </div>
        <Field label="Font family">
          <Select value={project.settings.typography.fontFamily} onChange={(event) => updateSettings({ typography: { fontFamily: event.target.value } })}>
            <option>Aquire, Orbitron, Rajdhani, Arial, sans-serif</option>
            <option>Aquire, Inter, ui-sans-serif, system-ui</option>
            <option>Aquire, Orbitron, Inter, ui-sans-serif, system-ui</option>
            <option>Aquire, 'Arial Black', Arial, sans-serif</option>
            <option>Aquire, Verdana, Inter, sans-serif</option>
            <option>Vorage, 'Bodoni 72', Didot, Georgia, serif</option>
            <option>Vorage, Inter, ui-sans-serif, system-ui</option>
            <option>Vorage, 'Trebuchet MS', Inter, sans-serif</option>
            <option>Inter, ui-sans-serif, system-ui</option>
            <option>Georgia, 'Times New Roman', serif</option>
            <option>Arial Black, Arial, sans-serif</option>
            <option>Verdana, Inter, sans-serif</option>
            <option>'Trebuchet MS', Inter, sans-serif</option>
          </Select>
        </Field>
        <Range label="Heading size" value={project.settings.typography.headingSize} min={34} max={84} onChange={(value) => updateSettings({ typography: { headingSize: value } })} />
        <Range label="Body size" value={project.settings.typography.bodySize} min={13} max={22} onChange={(value) => updateSettings({ typography: { bodySize: value } })} />
        <Range label="Font weight" value={project.settings.typography.fontWeight} min={400} max={900} step={100} onChange={(value) => updateSettings({ typography: { fontWeight: value } })} />
        <Range label="Line height" value={project.settings.typography.lineHeight} min={1} max={1.8} step={0.05} onChange={(value) => updateSettings({ typography: { lineHeight: value } })} />
        <Range label="Spacing" value={project.settings.layout.spacing} min={32} max={128} onChange={(value) => updateSettings({ layout: { spacing: value } })} />
        <Range label="Border radius" value={project.settings.layout.radius} min={0} max={40} onChange={(value) => updateSettings({ layout: { radius: value } })} />
        <Field label="Shadow">
          <Select value={project.settings.layout.shadow} onChange={(event) => updateSettings({ layout: { shadow: event.target.value as Project["settings"]["layout"]["shadow"] } })}>
            <option value="none">None</option>
            <option value="soft">Soft</option>
            <option value="bold">Bold</option>
          </Select>
        </Field>
        <label className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm font-semibold dark:border-slate-800">
          Reduce Motion
          <input type="checkbox" checked={project.settings.reduceMotion} onChange={(event) => updateSettings({ reduceMotion: event.target.checked })} />
        </label>
      </div>
    </div>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step = 1,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={`${label}: ${value}`}>
      <input
        className="w-full accent-forge-blue"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </Field>
  );
}

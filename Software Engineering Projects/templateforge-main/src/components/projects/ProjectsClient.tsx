"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Copy, Download, Edit3, FolderOpen, MoreHorizontal, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { deleteProject, duplicateProject, loadProjects, saveProjects } from "@/lib/projects";
import { downloadZip } from "@/lib/exporter";
import { Project } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function ProjectsClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [renaming, setRenaming] = useState<string | null>(null);

  function refresh() {
    setProjects(loadProjects());
  }

  useEffect(() => {
    refresh();
    window.addEventListener("templateforge-projects-changed", refresh);
    return () => window.removeEventListener("templateforge-projects-changed", refresh);
  }, []);

  function renameProject(projectId: string, name: string) {
    const next = projects.map((project) => (project.id === projectId ? { ...project, name, updatedAt: new Date().toISOString() } : project));
    setProjects(next);
    saveProjects(next);
  }

  return (
    <main className="min-h-screen bg-mist text-ink dark:bg-ink dark:text-white">
      <AppHeader />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge>Local drafts</Badge>
            <h1 data-gsap="fade-up" className="font-display mt-3 text-4xl font-black">My Projects</h1>
            <p className="mt-3 text-slate-600 dark:text-slate-400">Saved in browser storage on this machine.</p>
          </div>
          <Link href="/library">
            <Button>New Project</Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
            <FolderOpen className="mx-auto text-slate-400" size={42} />
            <h2 className="mt-4 text-2xl font-black">No saved projects yet</h2>
            <p className="mt-2 text-slate-500">Choose a template and save a draft to see it here.</p>
            <Link href="/library">
              <Button className="mt-6">Browse Templates</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <article data-gsap="scale-in" key={project.id} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  {renaming === project.id ? (
                    <Input value={project.name} onChange={(event) => renameProject(project.id, event.target.value)} onBlur={() => setRenaming(null)} autoFocus />
                  ) : (
                    <button className="text-left text-xl font-black hover:underline" onClick={() => setRenaming(project.id)}>
                      {project.name}
                    </button>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-500">
                    <Badge>{project.pages.length} pages</Badge>
                    <span>Updated {formatDate(project.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/builder?projectId=${project.id}`}>
                    <Button variant="secondary">
                      <Edit3 size={16} /> Open
                    </Button>
                  </Link>
                  <Button variant="secondary" onClick={() => { duplicateProject(project.id); refresh(); }}>
                    <Copy size={16} /> Duplicate
                  </Button>
                  <Button variant="secondary" onClick={() => downloadZip(project)}>
                    <Download size={16} /> Export
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (window.confirm("Delete this project?")) {
                        deleteProject(project.id);
                        refresh();
                      }
                    }}
                    aria-label={`Delete ${project.name}`}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

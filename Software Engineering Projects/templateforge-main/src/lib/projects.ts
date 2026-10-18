import { createId } from "@/lib/id";
import { getTemplateById, templates } from "@/data/templates";
import { Project, TemplateMetadata, TemplatePage, TemplateSection } from "@/lib/types";

export const PROJECTS_KEY = "templateforge-projects";

function cloneSection(section: TemplateSection): TemplateSection {
  return {
    ...section,
    content: { ...section.content },
    items: section.items?.map((item) => ({ ...item })),
    styles: { ...section.styles }
  };
}

export function clonePages(pages: TemplatePage[]) {
  return pages.map((page) => ({
    ...page,
    sections: page.sections.map(cloneSection)
  }));
}

export function makeProjectFromTemplate(template: TemplateMetadata, name = `${template.name} Draft`): Project {
  const now = new Date().toISOString();

  return {
    id: createId("project"),
    name,
    templateId: template.id,
    createdAt: now,
    updatedAt: now,
    pages: clonePages(template.pages),
    settings: {
      colors: { ...template.editableSettings.colors },
      typography: { ...template.editableSettings.typography },
      layout: { ...template.editableSettings.layout },
      reduceMotion: template.editableSettings.reduceMotion
    }
  };
}

export function loadProjects(): Project[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Project[];
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function upsertProject(project: Project) {
  const projects = loadProjects();
  const index = projects.findIndex((entry) => entry.id === project.id);
  const next = { ...project, updatedAt: new Date().toISOString() };

  if (index >= 0) {
    projects[index] = next;
  } else {
    projects.unshift(next);
  }

  saveProjects(projects);
  window.dispatchEvent(new Event("templateforge-projects-changed"));
  return next;
}

export function deleteProject(projectId: string) {
  saveProjects(loadProjects().filter((project) => project.id !== projectId));
  window.dispatchEvent(new Event("templateforge-projects-changed"));
}

export function duplicateProject(projectId: string) {
  const projects = loadProjects();
  const project = projects.find((entry) => entry.id === projectId);
  if (!project) return null;

  const now = new Date().toISOString();
  const duplicate: Project = {
    ...project,
    id: createId("project"),
    name: `${project.name} Copy`,
    createdAt: now,
    updatedAt: now,
    pages: clonePages(project.pages)
  };

  saveProjects([duplicate, ...projects]);
  window.dispatchEvent(new Event("templateforge-projects-changed"));
  return duplicate;
}

export function findProjectOrTemplate(projectId?: string | null, templateId?: string | null) {
  if (projectId) {
    const project = loadProjects().find((entry) => entry.id === projectId);
    if (project) return project;
  }

  const template = getTemplateById(templateId ?? "") ?? templates[0];
  return makeProjectFromTemplate(template);
}

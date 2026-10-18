"use client";

import { create } from "zustand";
import { sectionLibrary } from "@/data/sectionLibrary";
import { createId } from "@/lib/id";
import { clonePages, makeProjectFromTemplate } from "@/lib/projects";
import { EditableSettings, Project, TemplateMetadata, TemplatePage, TemplateSection } from "@/lib/types";

type EditorState = {
  project: Project | null;
  selectedPageId: string;
  selectedSectionId: string | null;
  history: Project[];
  historyIndex: number;
  loadProject: (project: Project) => void;
  selectPage: (pageId: string) => void;
  selectSection: (sectionId: string | null) => void;
  updateSettings: (patch: SettingsPatch) => void;
  updateSection: (sectionId: string, patch: Partial<TemplateSection>) => void;
  reorderSection: (fromId: string, toId: string) => void;
  duplicateSection: (sectionId: string) => void;
  deleteSection: (sectionId: string) => void;
  toggleSection: (sectionId: string) => void;
  addSectionFromLibrary: (librarySectionId: string) => void;
  renameProject: (name: string) => void;
  resetFromTemplate: (template: TemplateMetadata) => void;
  undo: () => void;
  redo: () => void;
};

type SettingsPatch = {
  colors?: Partial<EditableSettings["colors"]>;
  typography?: Partial<EditableSettings["typography"]>;
  layout?: Partial<EditableSettings["layout"]>;
  reduceMotion?: boolean;
};

function pushHistory(state: EditorState, project: Project): Partial<EditorState> {
  const nextProject = { ...project, updatedAt: new Date().toISOString() };
  const history = state.history.slice(0, state.historyIndex + 1).concat(nextProject);
  return {
    project: nextProject,
    history,
    historyIndex: history.length - 1
  };
}

function mutateProject(state: EditorState, mutate: (project: Project) => Project): Partial<EditorState> {
  if (!state.project) return {};
  return pushHistory(state, mutate(state.project));
}

function currentPage(project: Project | null, pageId: string) {
  return project?.pages.find((page) => page.id === pageId) ?? project?.pages[0];
}

function cloneSection(section: TemplateSection): TemplateSection {
  return {
    ...section,
    id: createId(section.type),
    content: { ...section.content },
    styles: { ...section.styles },
    items: section.items?.map((item) => ({ ...item }))
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: null,
  selectedPageId: "home",
  selectedSectionId: null,
  history: [],
  historyIndex: -1,
  loadProject: (project) =>
    set({
      project,
      selectedPageId: project.pages[0]?.id ?? "home",
      selectedSectionId: project.pages[0]?.sections[0]?.id ?? null,
      history: [project],
      historyIndex: 0
    }),
  selectPage: (pageId) =>
    set((state) => {
      const page = currentPage(state.project, pageId);
      return {
        selectedPageId: pageId,
        selectedSectionId: page?.sections[0]?.id ?? null
      };
    }),
  selectSection: (sectionId) => set({ selectedSectionId: sectionId }),
  updateSettings: (patch) =>
    set((state) =>
      mutateProject(state, (project) => ({
        ...project,
        settings: {
          ...project.settings,
          reduceMotion: patch.reduceMotion ?? project.settings.reduceMotion,
          colors: { ...project.settings.colors, ...patch.colors },
          typography: { ...project.settings.typography, ...patch.typography },
          layout: { ...project.settings.layout, ...patch.layout }
        }
      }))
    ),
  updateSection: (sectionId, patch) =>
    set((state) =>
      mutateProject(state, (project) => ({
        ...project,
        pages: project.pages.map((page) => ({
          ...page,
          sections: page.sections.map((section) =>
            section.id === sectionId
              ? {
                  ...section,
                  ...patch,
                  content: { ...section.content, ...patch.content },
                  styles: { ...section.styles, ...patch.styles },
                  items: patch.items ?? section.items
                }
              : section
          )
        }))
      }))
    ),
  reorderSection: (fromId, toId) =>
    set((state) =>
      mutateProject(state, (project) => ({
        ...project,
        pages: project.pages.map((page) => {
          if (page.id !== state.selectedPageId) return page;
          const fromIndex = page.sections.findIndex((section) => section.id === fromId);
          const toIndex = page.sections.findIndex((section) => section.id === toId);
          if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return page;
          const sections = [...page.sections];
          const [moved] = sections.splice(fromIndex, 1);
          sections.splice(toIndex, 0, moved);
          return { ...page, sections };
        })
      }))
    ),
  duplicateSection: (sectionId) =>
    set((state) =>
      mutateProject(state, (project) => ({
        ...project,
        pages: project.pages.map((page) => {
          if (page.id !== state.selectedPageId) return page;
          const index = page.sections.findIndex((section) => section.id === sectionId);
          if (index < 0) return page;
          const sections = [...page.sections];
          sections.splice(index + 1, 0, cloneSection(page.sections[index]));
          return { ...page, sections };
        })
      }))
    ),
  deleteSection: (sectionId) =>
    set((state) =>
      mutateProject(state, (project) => ({
        ...project,
        pages: project.pages.map((page) =>
          page.id === state.selectedPageId
            ? { ...page, sections: page.sections.filter((section) => section.id !== sectionId || section.locked) }
            : page
        )
      }))
    ),
  toggleSection: (sectionId) =>
    set((state) =>
      mutateProject(state, (project) => ({
        ...project,
        pages: project.pages.map((page) => ({
          ...page,
          sections: page.sections.map((section) => (section.id === sectionId ? { ...section, visible: !section.visible } : section))
        }))
      }))
    ),
  addSectionFromLibrary: (librarySectionId) =>
    set((state) => {
      const template = sectionLibrary.find((section) => section.id === librarySectionId);
      if (!template) return {};

      return mutateProject(state, (project) => ({
        ...project,
        pages: project.pages.map((page) =>
          page.id === state.selectedPageId
            ? {
                ...page,
                sections: [...page.sections, cloneSection(template)]
              }
            : page
        )
      }));
    }),
  renameProject: (name) =>
    set((state) =>
      mutateProject(state, (project) => ({
        ...project,
        name
      }))
    ),
  resetFromTemplate: (template) =>
    set((state) => {
      const project = makeProjectFromTemplate(template, state.project?.name ?? `${template.name} Draft`);
      const next = { ...project, id: state.project?.id ?? project.id, createdAt: state.project?.createdAt ?? project.createdAt };
      return {
        project: next,
        selectedPageId: next.pages[0]?.id ?? "home",
        selectedSectionId: next.pages[0]?.sections[0]?.id ?? null,
        history: [next],
        historyIndex: 0
      };
    }),
  undo: () =>
    set((state) => {
      const nextIndex = Math.max(0, state.historyIndex - 1);
      const project = state.history[nextIndex];
      return project ? { project, historyIndex: nextIndex } : {};
    }),
  redo: () =>
    set((state) => {
      const nextIndex = Math.min(state.history.length - 1, state.historyIndex + 1);
      const project = state.history[nextIndex];
      return project ? { project, historyIndex: nextIndex } : {};
    })
}));

export function getEditorPage(project: Project | null, selectedPageId: string): TemplatePage | null {
  return currentPage(project, selectedPageId) ?? null;
}

export function getEditorSection(project: Project | null, selectedPageId: string, sectionId: string | null): TemplateSection | null {
  const page = currentPage(project, selectedPageId);
  if (!page || !sectionId) return null;
  return page.sections.find((section) => section.id === sectionId) ?? null;
}

/**
 * lib/ai/tools.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Server-side tool definitions for the AI Portfolio Assistant (FE3 — Week 5
 * generative UI assignment). Each tool is defined with a Zod input schema
 * and queries the same lib/data/* modules the public pages render from, so
 * a tool result can never drift from what's actually on the site.
 *
 * Three tools, three different lifecycles — on purpose:
 *
 *   1. searchProjects   — server-executed, always succeeds (even zero
 *      matches is a valid result, not an error). Renders as a findings
 *      table. This is the "happy path" tool.
 *
 *   2. getSkillsRadar    — server-executed, but genuinely CAN fail: if the
 *      model (or a visitor's odd phrasing) asks for a skill category that
 *      doesn't exist in lib/data/skills.ts, execute() throws a real,
 *      descriptive error instead of silently returning nothing. That's the
 *      designed error-state demo — not a simulated/fake failure. Renders
 *      as a small bar chart on success.
 *
 *   3. draftIntroEmail  — CLIENT tool (no execute function). Per the AI
 *      SDK's tool contract, a tool with no execute is never run
 *      automatically — the stream ends with the call sitting in
 *      'input-available' state, and the UI is responsible for resolving it
 *      (via useChat's addToolResult) once a human decides what happens.
 *      That's what makes this the "confirmation before an action runs"
 *      tool: nothing is sent until the visitor clicks Send in the chat
 *      widget.
 *
 * Contract (name / schema / return shape) is documented again, in plain
 * language, in README.md — this file is the source of truth for the
 * shapes, the README explains them for a human reader.
 */

import { tool } from "ai";
import { z } from "zod";
// Relative, not "@/lib/data/..." — this file is imported two ways: through
// Next's bundler (which resolves the "@/" alias fine) and directly by Node
// for tools.test.ts (which only understands real relative paths). A
// relative import here works for both without any extra loader config.
import { PROJECTS } from "../data/projects.ts";
import { SKILL_CATEGORIES } from "../data/skills.ts";

const PROJECT_CATEGORIES = ["Security", "Development", "Research"] as const;

const LEVEL_SCORE: Record<string, number> = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
};

/**
 * Tool 1 — searchProjects
 * Always resolves. Zero matches is a legitimate, renderable empty state,
 * not a thrown error — an empty findings table is a normal outcome of a
 * search, the same way it would be in a real SIEM/search UI.
 */
export const searchProjects = tool({
  description:
    "Search Ali's real project portfolio by keyword and/or category. Use " +
    "this whenever a visitor asks to see, browse, filter, or compare " +
    "specific projects (e.g. 'show me his security work', 'anything with " +
    "Python?', 'what has he built with n8n'). The result is rendered as a " +
    "findings table in the chat UI — after calling this, just add a brief " +
    "one-line intro; don't re-describe every project back to the visitor.",
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe(
        "Free-text keyword to match against project titles, descriptions, " +
          "and tags (e.g. 'Python', 'SIEM', 'mobile'). Omit to browse by " +
          "category alone, or to list everything.",
      ),
    category: z
      .enum(PROJECT_CATEGORIES)
      .optional()
      .describe(
        "Restrict results to one category: Security, Development, or " +
          "Research. Omit to search across all categories.",
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(8)
      .optional()
      .describe("Max number of projects to return. Defaults to 6."),
  }),
  execute: async ({ query, category, limit }) => {
    const max = limit ?? 6;
    const needle = query?.trim().toLowerCase();

    const allMatches = PROJECTS.filter((project) => {
      if (category && project.category !== category) return false;
      if (!needle) return true;
      const haystack = `${project.title} ${project.description} ${project.tags.join(" ")}`.toLowerCase();
      return haystack.includes(needle);
    });

    const matches = allMatches.slice(0, max);

    return {
      query: query ?? null,
      category: category ?? null,
      totalMatches: allMatches.length,
      returned: matches.length,
      projects: matches.map((project) => ({
        slug: project.slug,
        title: project.title,
        description: project.description,
        category: project.category,
        tags: project.tags,
        githubUrl: project.githubUrl ?? null,
        featured: project.featured ?? false,
      })),
    };
  },
});

/**
 * Tool 2 — getSkillsRadar
 * `category` is deliberately a free-text string, not a strict enum — the
 * model (or a visitor) can ask about a category that doesn't exist (e.g.
 * "cloud" or "AWS"), and execute() throws a friendly, specific error
 * instead of guessing or hallucinating a match. That's the real,
 * reproducible failure path behind the output-error state.
 */
export const getSkillsRadar = tool({
  description:
    "Get Ali's technical skill proficiency, grouped by category, shaped " +
    "for a chart. Use this when a visitor asks about skill level, " +
    "proficiency, or wants a visual comparison across categories (e.g. " +
    "'how good is he with SIEM tools?', 'show me a skills chart', " +
    "'compare his recon vs automation skills'). Ali's real categories are " +
    "exactly: 'SOC & SIEM', 'Recon & Assessment', and 'Automation & " +
    "Development' — omit the category to return all three.",
  inputSchema: z.object({
    category: z
      .string()
      .optional()
      .describe(
        "One of Ali's real skill categories: 'SOC & SIEM', 'Recon & " +
          "Assessment', or 'Automation & Development'. Omit to return all " +
          "categories. Don't invent a category that isn't one of these " +
          "three — if a visitor asks about something outside them (e.g. " +
          "cloud, mobile), say so rather than guessing a close match.",
      ),
  }),
  execute: async ({ category }) => {
    let selected = SKILL_CATEGORIES;

    if (category) {
      const needle = category.trim().toLowerCase();
      const matched = SKILL_CATEGORIES.filter((entry) =>
        entry.title.toLowerCase().includes(needle),
      );

      if (matched.length === 0) {
        const available = SKILL_CATEGORIES.map((entry) => entry.title).join(
          ", ",
        );
        throw new Error(
          `No skill category matches "${category}". Ali's real categories ` +
            `are: ${available}.`,
        );
      }

      selected = matched;
    }

    return {
      categories: selected.map((entry) => ({
        title: entry.title,
        skills: entry.skills.map((skill) => ({
          name: skill.name,
          level: skill.level,
          score: LEVEL_SCORE[skill.level] ?? 1,
          maxScore: 3,
        })),
      })),
    };
  },
});

/**
 * Tool 3 — draftIntroEmail
 * No `execute` on purpose. Per the AI SDK tool contract, that means the
 * server never runs this itself — the tool call streams to the client and
 * sits in 'input-available' state until the chat widget calls
 * addToolResult (see components/chat/ChatWidget.tsx and
 * components/chat/tool-parts/IntroEmailPart.tsx). Confirming opens the
 * visitor's own email client via a mailto: link; nothing is sent from the
 * server, and no output exists until the visitor acts.
 */
export const draftIntroEmail = tool({
  description:
    "Prepare a short introductory email to Ali on the visitor's behalf. " +
    "Use this ONLY when a visitor explicitly says they want to reach out, " +
    "get in touch, or contact Ali about something specific (a role, a " +
    "project, a question) — not for general questions about his " +
    "background. This always requires the visitor's explicit confirmation " +
    "in the chat UI before anything happens. Never tell the visitor the " +
    "email has been sent — only that you've drafted it for them to review.",
  inputSchema: z.object({
    subject: z
      .string()
      .max(80)
      .describe(
        "A short, specific email subject line, e.g. 'SOC Analyst role at " +
          "Acme — quick chat?'",
      ),
    note: z
      .string()
      .max(400)
      .describe(
        "A short 1-3 sentence note for the email body, written in the " +
          "visitor's voice (first person), explaining why they want to " +
          "connect. Base it on what the visitor has actually said in the " +
          "conversation, not on generic filler.",
      ),
  }),
  // No execute — this is a client-side tool. The AI SDK never runs it
  // automatically; the call streams to the browser and sits in
  // 'input-available' until the visitor clicks Send or Cancel in
  // IntroEmailPart, which resolves it via useChat's addToolResult. An
  // outputSchema is still declared (with no execute to infer OUTPUT from,
  // the tool() helper types it as `never` otherwise) so that client-side
  // resolution stays fully typed.
  outputSchema: z.object({
    confirmed: z.boolean(),
    method: z.enum(["mailto"]).nullable(),
  }),
});

export const portfolioTools = {
  searchProjects,
  getSkillsRadar,
  draftIntroEmail,
};

export type PortfolioTools = typeof portfolioTools;

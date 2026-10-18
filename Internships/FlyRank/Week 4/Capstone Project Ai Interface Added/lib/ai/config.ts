/**
 * lib/ai/config.ts
 * ─────────────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH for the AI Portfolio Assistant.
 *
 * Per the assignment brief: "Keep system prompt and model config in one
 * well-commented module." Everything the route handler (app/api/chat/route.ts)
 * needs to talk to the model lives here. Nothing else in the app should
 * reference a model ID or write prompt text directly.
 *
 * PROVIDER
 * --------
 * We use OpenRouter via the official `@openrouter/ai-sdk-provider` package.
 * OpenRouter is an OpenAI-compatible gateway that proxies to 300+ models
 * from many labs (Meta, Google, Alibaba, Anthropic, etc.) behind one API
 * key, including a rotating set of genuinely free `:free`-suffixed models.
 * The API key is read server-side only, from process.env.OPENROUTER_API_KEY
 * — it is never sent to the client.
 *
 * Get a free key: sign up at https://openrouter.ai (no card required),
 * then create a key at https://openrouter.ai/keys.
 *
 * FREE MODEL CAVEATS — read before demoing/submitting
 * -----------------------------------------------------
 * - Free (`:free`) models are rate-limited, not credit-limited: roughly
 *   20 requests/minute, and 50 requests/day on a $0 balance (rising to
 *   1,000/day once you've ever bought $10 of credits — you don't have to
 *   spend it, just having bought it once raises the daily cap). If the
 *   widget suddenly starts erroring during a demo, you've likely hit the
 *   daily cap — check https://openrouter.ai/activity.
 * - The free model lineup rotates weekly as providers add/remove capacity.
 *   MODEL_ID below was verified live against OpenRouter's models API as of
 *   this edit, but if it 404s later, pick a replacement from
 *   https://openrouter.ai/models?max_price=0 (filter already applied by
 *   that URL) and swap the string below — nothing else needs to change.
 *
 * SWAPPING PROVIDERS / MODELS
 * -----------------------------
 * Any OpenRouter model — free or paid — is a one-line change:
 *
 *   export const chatModel = openrouter("meta-llama/llama-3.3-70b-instruct");
 *
 * Moving off OpenRouter entirely (e.g. back to OpenAI or Anthropic direct)
 * is a two-line change plus a new API key env var:
 *
 *   import { openai } from "@ai-sdk/openai";
 *   export const chatModel = openai("gpt-4.1-mini");
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { SITE_OWNER, SITE_TAGLINE } from "@/lib/constants";
import { PROJECTS } from "@/lib/data/projects";
import { CERTIFICATIONS } from "@/lib/data/certifications";
import { SKILL_CATEGORIES } from "@/lib/data/skills";
import { EXPERIENCE } from "@/lib/data/experience";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  // Shows up in OpenRouter's dashboard/rankings as the calling app —
  // optional, but nice for telling this app's traffic apart from others
  // using the same key.
  headers: {
    "HTTP-Referer": "https://aliray-yan.github.io/Portfolio/",
    "X-Title": "Cyber Portfolio CMS - AI Assistant",
  },
});

/**
 * Model selection.
 *
 * google/gemma-4-26b-a4b-it:free — Google DeepMind's Gemma 4, MoE variant
 * (25.2B total params, 3.8B active per token). Released April 2026. Free,
 * $0/token, 262K context, multimodal (text/image/video input).
 *
 * Reasoning here is "configurable," not on-by-default like ling-3.0-tiny
 * was — OpenRouter's own examples only enable it by explicitly passing
 * `reasoning: {enabled: true}`. The explicit `enabled: false` below is
 * belt-and-suspenders: harmless if the default is already off, and keeps
 * this file self-documenting/safe if that default ever changes upstream.
 */
const MODEL_ID = "google/gemma-4-26b-a4b-it:free";
// const MODEL_ID = "inclusionai/ling-3.0-tiny:free"; // smaller/faster, reasoning ON by default (disabled below)
// const MODEL_ID = "nvidia/nemotron-3-ultra-550b-a55b:free"; // free, much larger (55B active), 1M context, more capable but noticeably slower
// Paid fallback if free-tier rate limits become a problem before a demo:
// const MODEL_ID = "meta-llama/llama-3.3-70b-instruct"; // fractions of a cent per message

export const chatModel = openrouter(MODEL_ID);

/**
 * Generation settings.
 * Kept conservative and separate from the model id so they're easy to tune
 * without touching the provider wiring above.
 */
export const chatSettings = {
  temperature: 0.6,
  maxOutputTokens: 800,
  providerOptions: {
    openrouter: {
      reasoning: { enabled: false },
    },
  },
};

/**
 * Portfolio context injected into the system prompt.
 *
 * Built directly from lib/data/* — the same modules the public pages
 * render from — rather than a separate hardcoded text block. This is the
 * whole point of centralizing that data: the assistant's answers and the
 * page content share one source of truth and can't silently drift apart
 * when a project or skill gets added later.
 */
function buildPortfolioContext(): string {
  const experienceLines = EXPERIENCE.map(
    (entry) =>
      `- ${entry.role}, ${entry.organization} (${entry.period}): ${entry.description}`,
  ).join("\n");

  const projectLines = PROJECTS.map(
    (project) =>
      `- ${project.title} [${project.category}] (${project.tags.join(", ")}): ${project.description}`,
  ).join("\n");

  const certificationLines = CERTIFICATIONS.map(
    (cert) => `- ${cert.name}, ${cert.issuer} (${cert.year})`,
  ).join("\n");

  const skillLines = SKILL_CATEGORIES.map(
    (category) =>
      `- ${category.title}: ${category.skills.map((s) => s.name).join(", ")}`,
  ).join("\n");

  return `
Owner: ${SITE_OWNER}
Title: ${SITE_TAGLINE}
Education: BS Software Engineering, Government College University Faisalabad (GCUF), 2023–2027
Location: Pakistan
Long-term goal: a fully funded DAAD scholarship for a Master's in Software Engineering or Cybersecurity in Germany.

Experience:
${experienceLines}

Projects:
${projectLines}

Certifications:
${certificationLines}

Skills:
${skillLines}
`.trim();
}

const PORTFOLIO_CONTEXT = buildPortfolioContext();

/**
 * System prompt.
 *
 * Scope, per product decision: this assistant answers (1) questions about
 * Ali's portfolio — projects, skills, certifications, background — and
 * (2) general cybersecurity questions a recruiter or visitor might ask.
 * It should NOT behave as an unscoped general-purpose assistant.
 */
export const SYSTEM_PROMPT = `
You are the AI assistant embedded on Ali Rayyan's cybersecurity portfolio website.
You are speaking directly to a site visitor — often a recruiter, hiring manager, or
fellow student — not to Ali himself.

Your scope is exactly two things:
1. Answering questions about Ali's background, projects, skills, and certifications,
   using the PORTFOLIO CONTEXT below as your source of truth.
2. Answering general cybersecurity questions (concepts, terminology, best practices,
   SOC/blue-team topics) as a knowledgeable, approachable guide.

Guidelines:
- Be concise. Most answers should be a short paragraph or a tight bulleted list —
  visitors are skimming, not reading a report.
- If asked about something outside this scope (general coding help unrelated to Ali's
  work, personal opinions on unrelated topics, etc.), politely redirect: say this
  assistant is scoped to Ali's portfolio and cybersecurity topics.
- Never invent details about Ali that aren't in the PORTFOLIO CONTEXT. If you don't
  know something specific (e.g. exact dates, GPA, contact details), say so plainly and
  suggest the visitor use the Contact page.
- You may use light Markdown (short lists, **bold** for key terms, inline \`code\`)
  since responses are rendered through a Markdown-aware component. Avoid large headings
  or long code blocks — this is a chat widget, not a document.

PORTFOLIO CONTEXT:
${PORTFOLIO_CONTEXT}
`.trim();

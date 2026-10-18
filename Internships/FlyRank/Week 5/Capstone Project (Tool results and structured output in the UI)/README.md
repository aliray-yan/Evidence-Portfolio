# Cyber Portfolio CMS

Professional cybersecurity portfolio platform, built as a Frontend AI Engineering internship capstone. Public portfolio site + an AI assistant that can query the portfolio's real data through tool calls. The CMS admin dashboard (Phases 3–5) is not built yet — see [Status](#status).

## Live Demo
https://cyber-portfolio-cms.vercel.app/

## Status

| Phase | Scope | Status |
|---|---|---|
| 1 — Deployed Skeleton | Routing, layout, placeholder pages | ✅ Done |
| 2 — UI Development | Real content, design system, light/dark theme, component library, AI assistant + tool calling | ✅ Done |
| 3 — Database & Data Layer | Prisma + Supabase/Neon, replace `lib/data/*.ts` with real queries | ⬜ Not started |
| 4 — Authentication | Auth.js, protect `/dashboard/*` | ⬜ Not started |
| 5 — CMS Functionality | Real CRUD for projects/blog/certs/skills, Cloudinary upload | ⬜ Not started |
| 6 — Polish & Launch | SEO, Lighthouse pass, final docs | ⬜ Not started |

All public-facing content currently reads from typed static data in `lib/data/*.ts`, shaped to match the eventual Prisma schema so Phase 3 is a query swap, not a rewrite. The dashboard route group exists but every action in it is a disabled placeholder until Phase 4/5.

## Tech Stack
- Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict)
- Tailwind CSS v4
- Vercel AI SDK (`ai` v7, `@ai-sdk/react`) + OpenRouter — streaming chat with server- and client-side tool calling
- Anime.js v4 — entrance/reveal animations and tool-call state transitions
- next-themes — light/dark mode
- Deployed on Vercel

## AI Portfolio Assistant

A floating chat widget (`components/chat/ChatWidget.tsx`) on every public page. It answers questions about Ali's background using a system prompt built dynamically from `lib/data/*` (`lib/ai/config.ts` → `buildPortfolioContext()`), general cybersecurity Q&A, and — as of the Week 5 generative-UI assignment — **three tools** it can call mid-conversation to pull live data or take a confirmed action, rendered as real UI components instead of text.

**Model:** `openrouter/free` (`lib/ai/config.ts`). This is OpenRouter's Free Models Router — rather than pinning one specific free model (which rotates weekly as capacity changes), it routes each request to whichever available free model fits it, explicitly filtering for the features the request needs, including tool calling. $0/token either way. A specific model can be pinned instead for reproducible demo behavior — see the commented alternatives in `config.ts`.

### Tool contracts

Defined in `lib/ai/tools.ts` with Zod input schemas. Full descriptions (used as model guidance) are in that file; shapes below are the return contract a consumer of the chat API can rely on.

---

**`searchProjects`** — server-executed, always resolves (zero matches is a valid result, not an error).

```ts
input:  { query?: string; category?: "Security" | "Development" | "Research"; limit?: number /* 1–8, default 6 */ }
output: {
  query: string | null;
  category: string | null;
  totalMatches: number;
  returned: number;
  projects: Array<{
    slug: string; title: string; description: string; category: string;
    tags: string[]; githubUrl: string | null; featured: boolean;
  }>;
}
```
Rendered by `components/chat/tool-parts/ProjectSearchPart.tsx` as a findings list (title, category badge, description, tags, GitHub link).

---

**`getSkillsRadar`** — server-executed, and can genuinely fail: `category` is free text, not a strict enum, so a category outside Ali's real three (`SOC & SIEM`, `Recon & Assessment`, `Automation & Development`) throws a descriptive `Error` instead of guessing a match. That's the reproducible failure path behind the tool's error state — ask the assistant for a "cloud skills chart" to trigger it.

```ts
input:  { category?: string } // omit for all three categories
output: {
  categories: Array<{
    title: string;
    skills: Array<{ name: string; level: "Beginner" | "Intermediate" | "Advanced"; score: number; maxScore: number }>;
  }>;
}
// throws: Error("No skill category matches "<x>". Ali's real categories are: ...")
```
Rendered by `components/chat/tool-parts/SkillsRadarPart.tsx` as a hand-rolled, Anime.js-animated horizontal bar chart (no charting library).

---

**`draftIntroEmail`** — **client-side tool, no `execute`.** Per the AI SDK's tool contract, a tool with no `execute` is never run automatically: the call streams to the browser and sits in `input-available` state until the UI resolves it. This is the "confirmation before an action runs" tool the Week 5 brief calls for — nothing is sent anywhere until a human clicks a button.

```ts
input:  { subject: string /* max 80 chars */; note: string /* max 400 chars, visitor's voice */ }
output: { confirmed: boolean; method: "mailto" | null }
```
Rendered by `components/chat/tool-parts/IntroEmailPart.tsx`: the `input-available` state shows an editable-looking preview (To / Subject / Message) with **Send via email** / **Cancel**. Confirming opens a pre-filled `mailto:` link in the visitor's own email client (via `lib/constants.ts`'s `SITE_EMAIL`) — the server never sends anything — and resolves the tool via `useChat`'s `addToolResult`. `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls` (set in `ChatWidget.tsx`) lets the model respond to the visitor's choice once resolved.

### Tool lifecycle states

Every tool part renders one of four states, each answering a different question (`components/chat/tool-parts/shared.tsx` → `ToolShell`), with an Anime.js crossfade between states instead of a hard swap (`lib/motion/useStateTransition.ts`):

| State | Question it answers | Visual |
|---|---|---|
| `input-streaming` | What is it doing, with what input? | Dashed border, muted tone, terminal-style line with a blinking cursor as arguments stream in |
| `input-available` | What's happening now? *(or, for `draftIntroEmail`: what do you want to do?)* | Amber/secondary tone, spinner — or, for the confirmation tool, the actual Confirm/Cancel UI |
| `output-available` | What came back? | Primary tone, check icon, the real component — findings list, bar chart, or send receipt |
| `output-error` | What went wrong? | Destructive tone, alert icon, the thrown error's message — not a stack trace |

Types are fully wired end to end via `lib/ai/message-types.ts` (`InferUITools`) — no `any`, no manual casting of `part.input` / `part.output` anywhere in the tool-part components.

## Design System

Warm cream/terracotta palette, defined as CSS custom properties in `app/globals.css` and mapped through Tailwind v4's `@theme inline`, with a `.dark` override — every color was checked against WCAG contrast (body text ≥4.5:1, borders ≥3:1) rather than eyeballed. Toggled via `components/theme/ThemeToggle.tsx` (next-themes).

Reusable animation primitive: `components/motion/Reveal.tsx` fades + rises a section's children in (staggered, Anime.js), either on mount (hero) or the first time it scrolls into view (below-the-fold sections). Currently used on the homepage; drop it around any other section for the same entrance treatment.

## Local Development

```bash
git clone [repo-url]
cd cyber-portfolio-cms
npm install
cp .env.example .env.local
# add OPENROUTER_API_KEY (free, no card — https://openrouter.ai/keys)
npm run dev
```

On Vercel: Project → Settings → Environment Variables → add `OPENROUTER_API_KEY` for Production, Preview, and Development, then redeploy.

## Project Structure

```
app/
  (public)/            -> Navbar + Footer + ChatWidget wrap every visitor-facing route
  (auth)/login/        -> Login route (Phase 4 — not yet functional)
  (dashboard)/         -> Admin routes; every action is a disabled placeholder until Phase 4/5
  api/chat/route.ts    -> Streaming chat endpoint — wires portfolioTools into streamText
  health/              -> Server-side health check (proves SSR works)

components/
  ui/                  -> Button, LinkButton, Card, Badge, Input, PageHeader, EmptyState, StatCard, ...
  layout/               -> Navbar, Footer, DashboardSidebar, NavLink
  theme/                -> ThemeProvider, ThemeToggle (light/dark)
  motion/               -> Reveal (Anime.js entrance/scroll-reveal primitive)
  chat/                 -> ChatWidget, ChatMessage, ToolPart (dispatcher), useAutoScroll
  chat/tool-parts/      -> One renderer per tool (ProjectSearchPart, SkillsRadarPart, IntroEmailPart) + shared chrome

lib/
  ai/config.ts          -> Model + system prompt, single source of truth
  ai/tools.ts            -> Tool definitions (Zod schemas + execute) — see Tool contracts above
  ai/message-types.ts    -> InferUITools wiring — fully typed UIMessage for the chat widget
  motion/useStateTransition.ts -> Anime.js crossfade hook for tool-part state changes
  data/                  -> projects, certifications, skills, experience, blog (typed, Prisma-shaped)
  constants.ts            -> Site-wide constants, nav links, real contact info
  utils.ts                -> cn() class-merge helper
```

## Known Limitations / Next Steps

- Phase 3 (database) is the natural next step — needs a Supabase or Neon Postgres connection string (`DATABASE_URL`) before it can start.
- Blog post bodies are still excerpts only — full article content is pending Phase 5.
- Dashboard is fully non-functional by design (Phase 1/4/5 gate).
- The chat model (`openrouter/free`) can route to different underlying free models between requests; pin a specific model (see comments in `lib/ai/config.ts`) for reproducible demo behavior.

## Author
Ali Rayyan

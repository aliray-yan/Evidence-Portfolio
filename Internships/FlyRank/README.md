# FlyRank — AI-Assisted Development Capstone

FlyRank is a capstone repository built to demonstrate professional, AI-assisted
software development workflows. Across four weeks, the project moves from
basic AI-tooling conventions to a controlled prompt-quality experiment, then on
to two separate app builds and a dedicated accessible component playground.

## Repository structure

```
FlyRank/
├── Week 1/                      Git & AI-assistant tooling setup (GitHub Copilot)
│   ├── README.md
│   ├── COPILOT.md                AI-assistant rules & project conventions
│   ├── LICENSE                   MIT License
│   ├── .gitignore
│   ├── Commits Screenshot.jpg
│   └── Task Completion By GitHub Copilot.jpg
│
├── Week 2/                      Vague vs. structured AI-prompting experiment
│   ├── README.md
│   ├── vague/                     Settings page built from a single one-line prompt
│   └── structured/                Same feature, built with a full spec + plan + tests
│       ├── WORKFLOW.md            Side-by-side comparison write-up
│       └── docs/Screenshots/      Evidence (branches, test runs, planning, prompts)
│
├── Week 3/                      Full application development and portfolio build
│   ├── README.md
│   ├── Capstone Project/          Next.js portfolio CMS project
│   │   └── README.md
│   └── React Project one/         Anime discovery app with Firebase and Vite
│       ├── README.md
│       └── src/
│
└── Week 4/                      Accessible components playground
    └── playground/               React + TypeScript ARIA component demo
        ├── README.md
        ├── NOTES.md
        └── src/
```

## Weekly breakdown

| Week | Focus | What was produced | Details |
|---|---|---|---|
| **Week 1** | Environment & AI-assistant conventions | Repo scaffold, `COPILOT.md` rules file, Conventional Commits, license/ignore setup, screenshot evidence of Copilot-assisted work | [`Week 1/README.md`](./Week%201/README.md) |
| **Week 2** | Prompt-quality experiment | Two implementations of the same Settings page — one from a vague one-line prompt, one from a fully structured spec — compared on architecture, testing, and accessibility | [`Week 2/vague/`](./Week%202/vague) and [`Week 2/structured/`](./Week%202/structured) |
| **Week 3** | Full application development | Two separate app projects: a Next.js portfolio CMS and a Vite + Firebase anime discovery app, each with its own prompt-driven build process | [`Week 3/README.md`](./Week%203/README.md) |
| **Week 4** | Accessible UI component playground | Standalone React + TypeScript app demonstrating accessible Modal, Tabs, and Disclosure/Accordion components | [`Week 4/playground/README.md`](./Week%204/playground/README.md) |

## Tools & tech used across the capstone

- **AI assistants:** GitHub Copilot (Week 1), structured AI-prompting workflow (Weeks 2–4)
- **Frontend:** React, Next.js, Vite, TypeScript, Tailwind CSS, modern ARIA component patterns
- **Backend/services:** Firebase Authentication, Firestore, Jikan REST API (Week 3)
- **Tooling:** Git (Conventional Commits, feature branches), ESLint, Vitest, React Testing Library, axe-core accessibility checks, Axios

## How to explore this repo

1. Start with **Week 1** to see the baseline tooling/AI-assistant conventions and project setup.
2. Read **Week 2** to compare vague prompting versus structured prompting on the same feature.
3. Explore **Week 3** for two production-style app builds: `Capstone Project` (Next.js portfolio CMS) and `React Project one` (anime discovery app).
4. Visit **Week 4** for a standalone accessible components playground with focused ARIA-based Modal, Tabs, and Disclosure implementations.

## License

MIT — see [`Week 1/LICENSE`](./Week%201/LICENSE).


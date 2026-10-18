# RAG AI Mastery

**RAG AI Mastery: Zero to Advanced** is a full-stack learning platform by **Ali Rayyan** for teaching AI fundamentals, LLMs, embeddings, vector databases, chunking, semantic search, RAG pipelines, evaluation, security, local LLMs, and production architecture.

It is built as a real web app with authentication, role-based admin tools, progress tracking, quizzes, exercises, guided projects, notes, bookmarks, achievements, certificates, a safe local-first RAG playground, validated coding labs, and a standalone Android APK mode.

## How to Run This Project

Prerequisites:

- Node.js 20+
- Docker Desktop running
- npm

Quick start:

```bash
cd rag-ai-mastery
copy .env.example .env
docker compose up -d postgres

cd server
npm install
npm run prisma:generate
npm run prisma:push
npm run seed
npm run dev
```

In a second terminal:

```bash
cd rag-ai-mastery/client
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

The local Docker PostgreSQL credentials are:

```text
database: rag_ai_mastery
user: rag_mastery
password: 12345
host port: 5433
container port: 5432
```

## Features

- Landing page, register, login, logout
- Student dashboard with progress, streaks, achievements, bookmarks, notes, and RAG activity
- 21-level learning path from absolute AI basics to expert RAG topics
- Level pages, module pages, lesson reader, lesson search
- Lesson format with simple explanation, ELI10, analogy, why it matters, technical notes, code examples, visual ideas, mistakes, practice, quiz, summary, tags
- Quiz system with MCQ, true/false, scenario, ordering, chunking decision, and retrieval diagnosis questions
- Practice exercises and guided projects
- Must-code Code Labs with JavaScript challenges, local test validation, solution reveal, and device/local progress
- RAG playground with TXT/Markdown upload, chunking controls, fake embeddings, vector preview, retrieval result cards, prompt template, citations, and mock answer mode
- Optional OpenAI-compatible and Ollama answer modes through environment variables
- Evaluation dashboard, tool/reference library, skill tree, certificate page
- Admin dashboard and JSON-based content management for core resources
- Standalone Android mode with bundled offline curriculum, quizzes, Code Labs, local notes/bookmarks, local RAG playground, and certificate practice
- Dark/light mode and responsive UI

## Tech Stack

- Frontend: React, Vite, React Router, Lucide icons, plain CSS
- Android wrapper: Capacitor
- Backend: Node.js, Express
- Database: PostgreSQL
- ORM: Prisma
- Vector demo: local deterministic embedding vectors stored as JSON for education
- Optional vector setup: Docker Compose uses the `pgvector/pgvector:pg16` image
- Auth/security: JWT, bcrypt password hashing, Helmet, CORS, auth rate limiting, upload validation

## RAG Playground Modes

`mock` is the default and requires no paid API. It uses deterministic fake embeddings and a mock grounded answer generator.

`openai` calls an OpenAI-compatible chat completions endpoint only when `OPENAI_API_KEY` is set in `.env`.

`ollama` calls a local Ollama server when it is installed and running.

No API keys are hardcoded or stored in the database.

## Must-Code Code Labs

RAG AI Mastery includes a dedicated **Code Labs** area for coding practice that is required for serious RAG learning.

Code Labs currently cover:

- text normalization before ingestion
- token budget estimation
- chunking with overlap
- chunk metadata and citations
- cosine similarity
- keyword overlap scoring
- top-K retrieval
- grounded RAG prompt construction
- missing-context refusal logic
- citation extraction
- simple PII redaction before logging

Each lab includes instructions, starter code, local tests, pass/fail feedback, and a solution reveal. The test runner executes in a browser Web Worker, so it works for free in the web app and in the standalone Android APK.

## Folder Structure

```text
rag-ai-mastery/
  client/
    src/
      components/
      context/
      data/
      hooks/
      layouts/
      pages/
      routes/
      services/
      styles/
      utils/
      workers/
    android/
  server/
    src/
      controllers/
      middleware/
      prisma/
      rag/
      routes/
      seed/
      services/
      utils/
      app.js
      server.js
  docker-compose.yml
  .env.example
  README.md
```

## Installation

```bash
cd rag-ai-mastery/server
npm install

cd ../client
npm install
```

Copy the environment example:

```bash
cd ..
copy .env.example .env
```

On macOS/Linux, use `cp .env.example .env`.

The real `.env` file is ignored by git. Keep secrets there, never in committed source.

## Database Setup

Start PostgreSQL with pgvector:

```bash
docker compose up -d postgres
```

Generate Prisma Client and create the schema:

```bash
cd server
npm run prisma:generate
npm run prisma:push
```

Seed demo data:

```bash
npm run seed
```

The seed creates 21 levels, 65 modules, 226 lessons, 678 quiz questions, 65 exercises, 10 projects, 20 tools, 20 achievements, and demo users.

## Vector Search Setup

The beginner demo stores vectors as JSON so the app works locally without a paid vector database. The Docker setup uses a pgvector-ready PostgreSQL image for future production-style extension.

For a production pgvector implementation, add a `vector` column through SQL migration and replace the JSON scoring service in `server/src/rag/` with database-side similarity search.

## Running Backend

```bash
cd server
npm run dev
```

Backend health check:

```text
http://localhost:4000/health
```

## Running Frontend

```bash
cd client
npm run dev
```

Open:

```text
http://localhost:5173
```

## Building the Standalone Android APK

The Android version is a Capacitor wrapper around a standalone Vite build. It does not require the Express server, PostgreSQL, Docker, paid APIs, or internet access for core learning.

Standalone APK mode includes:

- bundled offline learning path with 21 levels and 226 lessons
- lesson search
- quizzes with local scoring
- notes, bookmarks, and progress stored on device
- validated Code Labs
- local/mock RAG playground
- evaluation dashboard, tool library, projects, exercises, and certificate practice

Requirements:

- Android Studio installed
- Android SDK installed
- Java runtime from Android Studio, usually `C:\Program Files\Android\Android Studio\jbr`

Build the debug APK:

```bash
cd rag-ai-mastery/client
npm run android:apk
```

Generated APK:

```text
client/android/app/build/outputs/apk/debug/app-debug.apk
```

This is a debug APK for local testing. For Play Store or public distribution, create a release build and sign it with your own Android signing key.

## GitHub Notes

This project is prepared to commit later:

- Commit source files, `package-lock.json`, `.env.example`, and `docker-compose.yml`.
- Do not commit `.env`, `node_modules`, `dist`, local uploads, logs, editor folders, Android build folders, `local.properties`, `.apk`, or `.aab` files.
- Prisma migrations should be committed if you add migration files in the future.
- Keep API keys only in `.env` or your deployment secret manager.

## Demo Credentials

Admin:

```text
email: admin@ragmastery.local
password: Admin123!
```

Student:

```text
email: student@ragmastery.local
password: Student123!
```

## How to Use the RAG Playground

1. Log in as a student or admin.
2. Open **RAG Playground**.
3. Upload a `.txt`, `.md`, or `.markdown` file, or edit the sample text.
4. Adjust chunk size, overlap, top K, and mode.
5. Click **Store Chunks** to persist chunks in PostgreSQL.
6. Ask a question.
7. Inspect retrieved chunks, vector/keyword scores, context, mock answer, and citations.

Unsupported questions should produce:

```text
I don't know based on the provided context.
```

## How to Use Code Labs

1. Log in, then open **Code Labs** from the sidebar.
2. Pick a lab such as chunking, cosine similarity, retrieval, prompting, or PII redaction.
3. Write the requested JavaScript function in the editor.
4. Click **Run Tests**.
5. Read the per-test feedback and revise until all tests pass.
6. Use **Show Solution** only after trying the lab yourself.

Code Lab progress is stored locally in the browser or Android WebView.

## How to Add Lessons

Use the admin UI at `/admin/content` or create records directly with Prisma. A lesson should include:

- title, slug, difficulty, estimated minutes
- simple explanation, ELI10, analogy, why it matters
- technical explanation and optional code example
- visual explanation idea, common mistakes, mini practice, summary
- next lesson recommendation and tags
- `moduleId` and `sortOrder`

## How to Add Quizzes

Use `/admin/content` and select `quizzes`. Each quiz question supports:

- `MCQ`
- `TRUE_FALSE`
- `SCENARIO`
- `ORDERING`
- `CHUNKING_DECISION`
- `RETRIEVAL_DIAGNOSIS`

Every question stores options, correct answer JSON, and an explanation.

## How to Add Projects

Use `/admin/content` and select `projects`. A project includes:

- goal
- requirements
- architecture
- steps
- starter code
- final code
- explanation
- testing
- common mistakes
- extension ideas

## How to Enable Optional API Mode

Edit `.env`:

```env
RAG_MODE=openai
OPENAI_COMPATIBLE_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=your-own-key
OPENAI_MODEL=gpt-4.1-mini
```

For Ollama:

```env
RAG_MODE=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
```

Restart the backend after changing environment variables.

## Troubleshooting

- If login fails, make sure PostgreSQL is running and `npm run seed` completed.
- If Prisma cannot connect, check `DATABASE_URL` in `.env`. This project maps Docker PostgreSQL to host port `5433` to avoid conflicts with any native PostgreSQL on `5432`.
- If Docker says the daemon is unavailable, start Docker Desktop.
- If uploads fail, keep files under `MAX_UPLOAD_MB` and use TXT or Markdown.
- If optional model mode fails, the playground falls back to mock mode and shows the provider error.
- If CORS fails, confirm `CLIENT_URL=http://localhost:5173`.
- If `npm run android:apk` cannot find Java, confirm Android Studio is installed and `JAVA_HOME` points to `C:\Program Files\Android\Android Studio\jbr`.
- If Gradle cannot find the Android SDK, create `client/android/local.properties` locally with `sdk.dir=C\:\\Users\\Ali Rayyan\\AppData\\Local\\Android\\Sdk`. This file is ignored by git.

## Future Roadmap

- Database-side pgvector similarity queries
- PDF extraction and OCR worker pipeline
- Background ingestion queues
- Hybrid BM25 plus vector retrieval
- Reranking models
- RAGAS-style evaluation datasets
- Permission-aware multi-tenant retrieval
- Streaming answers
- Richer admin lesson editor
- Exportable certificate PDF
- Signed Android release build workflow

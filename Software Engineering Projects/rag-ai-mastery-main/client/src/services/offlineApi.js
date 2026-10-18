import { achievementBlueprints, guidedProjects, levelBlueprints, toolReferences } from "../../../server/src/seed/curriculum.js";

const STORAGE_KEY = "rag_mastery_offline_state";

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function readState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch (_error) {
    return {};
  }
}

function writeState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function tagsFor(topic) {
  const lower = topic.toLowerCase();
  const tags = ["rag", "learning"];
  if (lower.includes("chunk")) tags.push("chunking");
  if (lower.includes("embedding") || lower.includes("vector") || lower.includes("similarity")) tags.push("embeddings");
  if (lower.includes("prompt") || lower.includes("hallucination") || lower.includes("ground")) tags.push("prompting");
  if (lower.includes("security") || lower.includes("privacy") || lower.includes("injection")) tags.push("security");
  if (lower.includes("evaluation") || lower.includes("quality")) tags.push("evaluation");
  if (lower.includes("local") || lower.includes("ollama")) tags.push("local-first");
  return [...new Set(tags)];
}

function codeExampleFor(topic) {
  const lower = topic.toLowerCase();
  if (lower.includes("chunk")) {
    return `function chunkWords(text, size = 120, overlap = 20) {
  const words = text.split(/\\s+/).filter(Boolean);
  const step = Math.max(1, size - overlap);
  const chunks = [];

  for (let start = 0; start < words.length; start += step) {
    chunks.push(words.slice(start, start + size).join(" "));
    if (start + size >= words.length) break;
  }

  return chunks;
}`;
  }

  if (lower.includes("cosine") || lower.includes("similarity") || lower.includes("vector")) {
    return `function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  const magA = Math.sqrt(a.reduce((sum, value) => sum + value ** 2, 0));
  const magB = Math.sqrt(b.reduce((sum, value) => sum + value ** 2, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}`;
  }

  if (lower.includes("prompt") || lower.includes("citation") || lower.includes("ground")) {
    return `function buildGroundedPrompt(question, chunks) {
  const context = chunks.map((chunk) => \`[\${chunk.id}] \${chunk.text}\`).join("\\n\\n");
  return \`Answer only from context. Cite sources.\\n\\nContext:\\n\${context}\\n\\nQuestion: \${question}\`;
}`;
  }

  if (lower.includes("metadata")) {
    return `const chunk = {
  text: "Refunds are available within 30 days.",
  metadata: {
    source: "policy.md",
    page: 4,
    tenantId: "demo-company",
    permissions: ["hr", "support"]
  }
};`;
  }

  return "";
}

function makeQuizQuestions(lesson, topic) {
  return [
    {
      id: `${lesson.id}-q1`,
      lessonId: lesson.id,
      type: "MCQ",
      question: `What is the best first explanation of "${topic}" in a RAG system?`,
      options: [
        `It is a concept that affects how evidence is retrieved, prepared, grounded, or evaluated.`,
        "It is a secret API key that should be pasted into the frontend.",
        "It means the assistant can ignore source documents.",
        "It is only useful after fine-tuning a model."
      ],
      correctAnswer: { index: 0 },
      explanation: `${topic} should be understood by how it changes evidence quality, answer grounding, or production reliability.`,
      sortOrder: 1
    },
    {
      id: `${lesson.id}-q2`,
      lessonId: lesson.id,
      type: "TRUE_FALSE",
      question: `${topic} should be tested with examples instead of trusted only because the model sounds confident.`,
      options: [],
      correctAnswer: { value: true },
      explanation: "RAG work is practical engineering. You inspect examples, retrieved chunks, prompts, and answers.",
      sortOrder: 2
    },
    {
      id: `${lesson.id}-q3`,
      lessonId: lesson.id,
      type: "SCENARIO",
      question: `A RAG answer fails around "${topic}". What should you inspect first?`,
      options: [
        "The retrieved evidence, metadata, prompt, and expected answer.",
        "Only the model name.",
        "Only the CSS of the answer card.",
        "Nothing; confident answers are always reliable."
      ],
      correctAnswer: { index: 0 },
      explanation: "Most RAG debugging starts by tracing the pipeline: input, chunks, retrieval, context, prompt, answer, and citations.",
      sortOrder: 3
    }
  ];
}

function makeLesson(level, module, topic, index) {
  const slug = `${level.number}-${slugify(topic)}`;
  const lesson = {
    id: `lesson-${level.number}-${index}`,
    moduleId: module.id,
    title: topic,
    slug,
    difficulty: level.difficulty,
    estimatedMinutes: level.number < 3 ? 12 : level.number < 12 ? 18 : 25,
    summary: `${topic} explained as a practical RAG engineering concept with examples, mistakes, and a mini task.`,
    simpleExplanation: `${topic} is one piece of the larger RAG workflow. In simple terms, RAG helps an AI assistant answer with useful source material instead of relying only on memory. This lesson explains where "${topic}" fits, what problem it solves, and how to recognize it in a real app.`,
    eli10: `Imagine asking a very smart helper a question, but first giving that helper the right pages from a book. "${topic}" is one of the rules or tools that helps choose, prepare, or use those pages correctly.`,
    analogy: `Think of a school research project. You do not just write from memory; you find notes, pick the right paragraphs, quote your sources, and check your answer. RAG systems do the same kind of careful workflow for AI assistants.`,
    whyMatters: `Real companies use RAG because their knowledge changes, their documents are private, and their users need sources. ${topic} matters because a weakness here can cause irrelevant retrieval, unsupported answers, privacy risk, or poor user trust.`,
    technicalExplanation: `In a production RAG pipeline, ${topic} should be treated as an inspectable engineering step. Track the input, output, assumptions, and failure modes. A good implementation lets you test it with golden questions, compare results, and improve quality without guessing.`,
    codeExample: codeExampleFor(topic),
    visualIdea: `Draw the pipeline as boxes: document input, parsing, chunking, embedding, vector storage, query, retrieval, prompt, answer, citations. Highlight where "${topic}" changes the flow.`,
    commonMistakes: [
      "Trusting a fluent answer without checking retrieved evidence.",
      "Skipping metadata, citations, or logs that would make debugging possible.",
      "Changing many pipeline settings at once and then not knowing what helped.",
      "Using private or sensitive data without thinking about access control."
    ],
    miniPractice: `Write a two-sentence explanation of ${topic}. Then describe one failure mode it can cause in a RAG assistant and one test you would run to catch it.`,
    summary: `${topic} is part of making RAG systems grounded, testable, and useful. Learn the plain meaning first, then connect it to retrieval quality and answer safety.`,
    nextLesson: "Continue to the next lesson in this level, then reinforce the idea in Code Labs or the RAG Playground.",
    tags: tagsFor(topic),
    sortOrder: index + 1
  };

  lesson.quizQuestions = makeQuizQuestions(lesson, topic);
  lesson.module = {
    id: module.id,
    title: module.title,
    level: {
      id: level.id,
      number: level.number,
      title: level.title
    }
  };

  return lesson;
}

function buildOfflineCurriculum() {
  const lessonsBySlug = new Map();
  const lessonsById = new Map();

  const levels = levelBlueprints.map((blueprint) => {
    const level = {
      id: `level-${blueprint.number}`,
      number: blueprint.number,
      title: blueprint.title,
      difficulty: blueprint.difficulty,
      description: blueprint.description,
      sortOrder: blueprint.number,
      modules: []
    };
    const module = {
      id: `module-${blueprint.number}-core`,
      levelId: level.id,
      title: `${blueprint.title.replace(/^LEVEL \\d+:\\s*/, "")} Core`,
      description: `Offline lessons for ${blueprint.title}.`,
      sortOrder: 1,
      lessons: [],
      exercises: []
    };

    module.lessons = blueprint.topics.map((topic, index) => {
      const lesson = makeLesson(level, module, topic, index);
      lessonsBySlug.set(lesson.slug, lesson);
      lessonsById.set(lesson.id, lesson);
      return lesson;
    });

    module.exercises = makeExercisesForLevel(level, module, blueprint.topics.slice(0, 3));
    level.modules = [module];
    return level;
  });

  return { levels, lessonsBySlug, lessonsById };
}

function makeExercisesForLevel(level, module, topics) {
  return topics.map((topic, index) => ({
    id: `exercise-${level.number}-${index}`,
    moduleId: module.id,
    title: `Diagnose ${topic}`,
    difficulty: level.difficulty,
    scenario: `A learner is building a RAG assistant and sees confusing behavior related to ${topic}.`,
    prompt: "Name the likely cause, the evidence you would inspect, and one change you would test first.",
    expectedOutcome: "A clear diagnosis that references chunks, retrieval, prompt context, or evaluation evidence.",
    hints: ["trace the pipeline", "check sources", "change one variable"],
    module: {
      title: module.title,
      level: { number: level.number, title: level.title }
    }
  }));
}

const curriculum = buildOfflineCurriculum();

const allLessons = curriculum.levels.flatMap((level) => level.modules.flatMap((module) => module.lessons));
const allExercises = curriculum.levels.flatMap((level) => level.modules.flatMap((module) => module.exercises));

const offlineProjects = guidedProjects.map((title, index) => ({
  id: `project-${index}`,
  title,
  goal: `Build a local-first ${title.toLowerCase()} that retrieves evidence and cites sources.`,
  requirements: [
    "Upload or paste documents without paid APIs.",
    "Split text into chunks with visible overlap.",
    "Retrieve top chunks and show citations.",
    "Return an uncertainty response when context is missing."
  ],
  architecture: "React UI, local chunking, deterministic fake embeddings, retrieval scoring, grounded prompt template, citation viewer.",
  steps: [
    "Define the document type and user question flow.",
    "Create chunking rules and metadata fields.",
    "Score chunks with keyword or vector-style similarity.",
    "Build a grounded answer prompt and refusal rule.",
    "Test with answerable and unanswerable questions."
  ],
  starterCode: `const chunks = chunkText(documentText, 700, 100);\nconst retrieved = retrieveTopK(question, chunks, 4);`,
  finalCode: `const answer = buildGroundedAnswer({ question, retrieved });\nreturn { answer, sources: retrieved.map((chunk) => chunk.metadata) };`,
  explanation: "The project reinforces the complete RAG loop without requiring a paid model provider.",
  testing: "Use golden questions, inspect retrieved chunks, and verify that missing evidence produces an uncertainty response.",
  commonMistakes: ["Skipping citations", "Using huge chunks", "Not testing missing-context questions"],
  extensionIdeas: ["Add hybrid search", "Add reranking", "Add permission filters"],
  level: { number: 19, title: "LEVEL 19: RAG Projects" }
}));

const offlineTools = toolReferences.map(([name, category, url, description, pricing], index) => ({
  id: `tool-${index}`,
  name,
  category,
  url,
  description,
  pricing
}));

const offlineAchievements = achievementBlueprints.map(([code, title, description, criteria, points, icon], index) => ({
  id: `achievement-${index}`,
  code,
  title,
  description,
  criteria,
  points,
  icon
}));

function progressByLesson(state) {
  return Object.fromEntries(Object.entries(state.progress || {}).map(([lessonId, progress]) => [lessonId, progress.status]));
}

function answerMatches(question, answer) {
  const correct = question.correctAnswer;
  if (question.type === "ORDERING") return JSON.stringify(answer) === JSON.stringify(correct.order);
  if (question.type === "TRUE_FALSE") return Boolean(answer) === Boolean(correct.value);
  return String(answer) === String(correct.index ?? correct.value);
}

function getLessonUserState(lesson, state) {
  return {
    progress: state.progress?.[lesson.id] || null,
    bookmarked: Boolean(state.bookmarks?.[lesson.id]),
    note: state.notes?.[lesson.id] ? { id: `note-${lesson.id}`, lessonId: lesson.id, content: state.notes[lesson.id] } : null
  };
}

function dashboard() {
  const state = readState();
  const completedIds = Object.keys(state.progress || {}).filter((lessonId) => state.progress[lessonId]?.status === "COMPLETED");
  const completedSet = new Set(completedIds);
  const attempts = state.attempts || [];
  const bookmarks = Object.keys(state.bookmarks || {}).map((lessonId) => ({
    id: `bookmark-${lessonId}`,
    lesson: curriculum.lessonsById.get(lessonId)
  }));

  return {
    user: { name: "Standalone Learner", role: "STUDENT" },
    stats: {
      totalLessons: allLessons.length,
      completedLessons: completedIds.length,
      percentComplete: allLessons.length ? Math.round((completedIds.length / allLessons.length) * 100) : 0,
      averageQuiz: attempts.length ? Math.round(attempts.reduce((sum, attempt) => sum + (attempt.score / attempt.total) * 100, 0) / attempts.length) : 0,
      bookmarks: bookmarks.length,
      notes: Object.keys(state.notes || {}).length,
      achievements: 0,
      ragDocuments: localStorage.getItem("rag_mastery_standalone_document") ? 1 : 0
    },
    attempts,
    bookmarks,
    achievements: [],
    recentLessons: completedIds.slice(-8).map((lessonId) => ({ lesson: curriculum.lessonsById.get(lessonId) })),
    skillTree: curriculum.levels.map((level) => {
      const lessonIds = level.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
      const completed = lessonIds.filter((id) => completedSet.has(id)).length;
      return {
        id: level.id,
        number: level.number,
        title: level.title,
        total: lessonIds.length,
        completed,
        percent: lessonIds.length ? Math.round((completed / lessonIds.length) * 100) : 0
      };
    }),
    ragLogs: []
  };
}

function getContent(pathname, searchParams) {
  const state = readState();

  if (pathname === "/content/overview") {
    return {
      stats: {
        levels: curriculum.levels.length,
        lessons: allLessons.length,
        quizzes: allLessons.reduce((sum, lesson) => sum + lesson.quizQuestions.length, 0),
        exercises: allExercises.length,
        projects: offlineProjects.length,
        tools: offlineTools.length
      },
      firstLevels: curriculum.levels.slice(0, 5)
    };
  }

  if (pathname === "/content/levels") {
    return { levels: curriculum.levels, progressByLesson: progressByLesson(state) };
  }

  const levelMatch = pathname.match(/^\/content\/levels\/([^/]+)$/);
  if (levelMatch) {
    const key = levelMatch[1];
    const level = curriculum.levels.find((item) => String(item.number) === key || item.id === key);
    if (!level) throw new Error("Level not found");
    return { level };
  }

  const lessonMatch = pathname.match(/^\/content\/lessons\/([^/]+)$/);
  if (lessonMatch) {
    const lesson = curriculum.lessonsBySlug.get(lessonMatch[1]);
    if (!lesson) throw new Error("Lesson not found");
    return { lesson, userState: getLessonUserState(lesson, state) };
  }

  if (pathname === "/content/exercises") return { exercises: allExercises };
  if (pathname === "/content/projects") return { projects: offlineProjects };
  if (pathname === "/content/tools") return { tools: offlineTools };
  if (pathname === "/content/achievements") return { achievements: offlineAchievements };

  if (pathname === "/content/search") {
    const q = String(searchParams.get("q") || "").toLowerCase().trim();
    const lessons =
      q.length < 2
        ? []
        : allLessons
            .filter((lesson) =>
              [lesson.title, lesson.summary, lesson.simpleExplanation, lesson.technicalExplanation, lesson.tags.join(" ")]
                .join(" ")
                .toLowerCase()
                .includes(q)
            )
            .slice(0, 30);
    return { lessons };
  }

  throw new Error("Offline content route not found");
}

function postProgress(pathname, body = {}) {
  const state = readState();
  state.progress ||= {};
  state.bookmarks ||= {};
  state.notes ||= {};
  state.attempts ||= [];
  state.certificates ||= [];

  const completeMatch = pathname.match(/^\/progress\/lessons\/([^/]+)\/complete$/);
  if (completeMatch) {
    const lessonId = completeMatch[1];
    const progress = {
      id: `progress-${lessonId}`,
      lessonId,
      status: "COMPLETED",
      completedAt: new Date().toISOString()
    };
    state.progress[lessonId] = progress;
    writeState(state);
    return { progress };
  }

  const noteMatch = pathname.match(/^\/progress\/notes\/([^/]+)$/);
  if (noteMatch) {
    const lessonId = noteMatch[1];
    const content = String(body.content || "").slice(0, 8000);
    state.notes[lessonId] = content;
    writeState(state);
    return { note: { id: `note-${lessonId}`, lessonId, content } };
  }

  const bookmarkMatch = pathname.match(/^\/progress\/bookmarks\/([^/]+)$/);
  if (bookmarkMatch) {
    const lessonId = bookmarkMatch[1];
    state.bookmarks[lessonId] = true;
    writeState(state);
    return { bookmark: { id: `bookmark-${lessonId}`, lessonId } };
  }

  if (pathname === "/progress/quiz-attempts") {
    const lessonId = body.lessonId;
    const lesson = lessonId ? curriculum.lessonsById.get(lessonId) : null;
    const questions = lesson ? lesson.quizQuestions : allLessons.flatMap((item) => item.quizQuestions).filter((question) => body.answers?.[question.id] !== undefined);
    if (!questions.length) throw new Error("No quiz questions found");

    const feedback = questions.map((question) => {
      const answer = body.answers?.[question.id];
      const correct = answerMatches(question, answer);
      return {
        questionId: question.id,
        correct,
        answer,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation
      };
    });
    const score = feedback.filter((item) => item.correct).length;
    const attempt = {
      id: `attempt-${Date.now()}`,
      lessonId,
      score,
      total: questions.length,
      answers: body.answers || {},
      feedback,
      createdAt: new Date().toISOString()
    };
    state.attempts.unshift(attempt);
    if (lessonId) {
      state.progress[lessonId] = {
        ...(state.progress[lessonId] || {}),
        id: `progress-${lessonId}`,
        lessonId,
        score: Math.round((score / questions.length) * 100),
        status: state.progress[lessonId]?.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS"
      };
    }
    writeState(state);
    return { attempt, feedback };
  }

  if (pathname === "/progress/certificate") {
    const certificate = {
      id: `certificate-${Date.now()}`,
      title: body.title || "RAG AI Mastery Completion Certificate",
      verificationCode: `OFFLINE-${Math.random().toString(16).slice(2, 10).toUpperCase()}`,
      createdAt: new Date().toISOString()
    };
    state.certificates.unshift(certificate);
    writeState(state);
    return { certificate };
  }

  throw new Error("Offline progress route not found");
}

function deleteProgress(pathname) {
  const state = readState();
  const bookmarkMatch = pathname.match(/^\/progress\/bookmarks\/([^/]+)$/);
  if (bookmarkMatch) {
    delete state.bookmarks?.[bookmarkMatch[1]];
    writeState(state);
    return null;
  }

  const noteMatch = pathname.match(/^\/progress\/notes\/([^/]+)$/);
  if (noteMatch) {
    delete state.notes?.[noteMatch[1]];
    writeState(state);
    return null;
  }

  throw new Error("Offline delete route not found");
}

export async function offlineRequest(path, options = {}) {
  const method = options.method || "GET";
  const url = new URL(path, "https://rag-ai-mastery.offline");
  const body = typeof options.body === "string" ? JSON.parse(options.body || "{}") : options.body || {};

  if (method === "GET") {
    if (url.pathname === "/progress/dashboard") return dashboard();
    if (url.pathname === "/progress/bookmarks") {
      const state = readState();
      return {
        bookmarks: Object.keys(state.bookmarks || {}).map((lessonId) => ({
          id: `bookmark-${lessonId}`,
          lesson: curriculum.lessonsById.get(lessonId)
        }))
      };
    }
    return getContent(url.pathname, url.searchParams);
  }

  if (method === "POST") return postProgress(url.pathname, body);
  if (method === "DELETE") return deleteProgress(url.pathname);

  throw new Error(`Offline ${method} route not found`);
}

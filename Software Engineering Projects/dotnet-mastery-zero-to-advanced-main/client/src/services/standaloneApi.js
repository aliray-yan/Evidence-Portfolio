import { createStandaloneSeed } from "./standaloneData.js";

const DB_KEY = "dotnetMastery.standalone.db.v1";

export const standaloneApi = {
  apiUrl: "Standalone offline APK storage",
  login,
  register,
  me,
  levels,
  level,
  module: getModule,
  lessons,
  lesson,
  lessonById,
  dashboard,
  completeLesson,
  lessonProgress,
  bookmarks,
  toggleBookmark,
  notes,
  note,
  saveNote,
  quiz,
  submitQuiz,
  exercises,
  runCode,
  gradeExercise,
  projects,
  projectProgress,
  saveProjectProgress,
  achievements,
  myAchievements,
  certificate,
  generateCertificate,
  search,
  adminStats,
  adminList,
  adminCreate,
  adminUpdate,
  adminDelete
};

async function login({ email, password }) {
  const db = getDb();
  const user = db.users.find((x) => x.email.toLowerCase() === email.toLowerCase() && x.password === password);
  if (!user) throw new Error("Invalid email or password.");
  unlock(db, user.id, "login_once");
  saveDb(db);
  return { token: `standalone:${user.id}`, user: profile(user) };
}

async function register({ name, email, password }) {
  const db = getDb();
  if (db.users.some((x) => x.email.toLowerCase() === email.toLowerCase())) throw new Error("An account with this email already exists.");
  const user = { id: id("user"), name, email: email.toLowerCase(), password, role: "Student", createdAt: new Date().toISOString() };
  db.users.push(user);
  unlock(db, user.id, "login_once");
  saveDb(db);
  return { token: `standalone:${user.id}`, user: profile(user) };
}

async function me() {
  return profile(requireUser(getDb()));
}

async function levels() {
  const db = getDb();
  return db.levels
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((level) => {
      const levelModules = db.modules.filter((x) => x.levelId === level.id);
      const levelLessons = db.lessons.filter((lesson) => levelModules.some((m) => m.id === lesson.moduleId));
      return { ...level, moduleCount: levelModules.length, lessonCount: levelLessons.length };
    });
}

async function level(id) {
  const db = getDb();
  const found = db.levels.find((x) => x.id === id);
  if (!found) throw new Error("Level not found.");
  return {
    ...found,
    modules: db.modules
      .filter((x) => x.levelId === id)
      .sort((a, b) => a.order - b.order)
      .map((m) => ({ ...m, lessonCount: db.lessons.filter((lessonItem) => lessonItem.moduleId === m.id).length }))
  };
}

async function getModule(id) {
  const db = getDb();
  const found = db.modules.find((x) => x.id === id);
  if (!found) throw new Error("Module not found.");
  const parentLevel = db.levels.find((x) => x.id === found.levelId);
  return {
    ...found,
    levelTitle: parentLevel?.title,
    lessons: db.lessons.filter((x) => x.moduleId === id)
  };
}

async function lessons(moduleId) {
  const db = getDb();
  return db.lessons
    .filter((x) => !moduleId || x.moduleId === moduleId)
    .map((x) => withLessonContext(db, x));
}

async function lesson(slug) {
  const db = getDb();
  const found = db.lessons.find((x) => x.slug === slug);
  if (!found) throw new Error("Lesson not found.");
  return withLessonContext(db, found, true);
}

async function lessonById(idValue) {
  const found = getDb().lessons.find((x) => x.id === idValue);
  if (!found) throw new Error("Lesson not found.");
  return found;
}

async function dashboard() {
  const db = getDb();
  const user = requireUser(db);
  const completed = db.progress.filter((x) => x.userId === user.id && x.completed);
  const completedIds = new Set(completed.map((x) => x.lessonId));
  const levelProgress = db.levels.map((levelItem) => {
    const levelModules = db.modules.filter((x) => x.levelId === levelItem.id);
    const levelLessons = db.lessons.filter((lessonItem) => levelModules.some((m) => m.id === lessonItem.moduleId));
    return {
      id: levelItem.id,
      title: levelItem.title,
      order: levelItem.order,
      difficulty: levelItem.difficulty,
      totalLessons: levelLessons.length,
      completedLessons: levelLessons.filter((x) => completedIds.has(x.id)).length
    };
  });
  return {
    totalLessons: db.lessons.length,
    completedLessons: completed.length,
    completionPercent: db.lessons.length ? Math.round((completed.length * 1000) / db.lessons.length) / 10 : 0,
    streak: calculateStreak(completed),
    levelProgress,
    recentLessons: completed
      .slice()
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, 6)
      .map((entry) => {
        const lessonItem = db.lessons.find((x) => x.id === entry.lessonId);
        const moduleItem = db.modules.find((x) => x.id === lessonItem?.moduleId);
        return { lessonId: entry.lessonId, completedAt: entry.completedAt, lessonTitle: lessonItem?.title, lessonSlug: lessonItem?.slug, moduleTitle: moduleItem?.title };
      }),
    recentQuizAttempts: db.quizAttempts.filter((x) => x.userId === user.id).slice(-8).reverse()
  };
}

async function completeLesson({ lessonId, timeSpent }) {
  const db = getDb();
  const user = requireUser(db);
  const existing = db.progress.find((x) => x.userId === user.id && x.lessonId === lessonId);
  if (existing) {
    existing.completed = true;
    existing.completedAt ||= new Date().toISOString();
    existing.timeSpent += Number(timeSpent) || 0;
  } else {
    db.progress.push({ id: id("progress"), userId: user.id, lessonId, completed: true, completedAt: new Date().toISOString(), timeSpent: Number(timeSpent) || 0 });
  }
  evaluateProgress(db, user.id);
  saveDb(db);
  return { completed: true };
}

async function lessonProgress(lessonId) {
  const db = getDb();
  const user = requireUser(db);
  return db.progress.find((x) => x.userId === user.id && x.lessonId === lessonId) || { userId: user.id, lessonId, completed: false, timeSpent: 0 };
}

async function bookmarks() {
  const db = getDb();
  const user = requireUser(db);
  return db.bookmarks
    .filter((x) => x.userId === user.id)
    .map((x) => {
      const lessonItem = db.lessons.find((lessonEntry) => lessonEntry.id === x.lessonId);
      const moduleItem = db.modules.find((moduleEntry) => moduleEntry.id === lessonItem?.moduleId);
      return { ...x, lessonTitle: lessonItem?.title, lessonSlug: lessonItem?.slug, moduleTitle: moduleItem?.title };
    });
}

async function toggleBookmark(lessonId) {
  const db = getDb();
  const user = requireUser(db);
  const index = db.bookmarks.findIndex((x) => x.userId === user.id && x.lessonId === lessonId);
  if (index >= 0) {
    db.bookmarks.splice(index, 1);
    saveDb(db);
    return { bookmarked: false };
  }
  db.bookmarks.push({ id: id("bookmark"), userId: user.id, lessonId, createdAt: new Date().toISOString() });
  unlock(db, user.id, "create_bookmark");
  saveDb(db);
  return { bookmarked: true };
}

async function notes() {
  const db = getDb();
  const user = requireUser(db);
  return db.notes.filter((x) => x.userId === user.id).map((x) => ({ ...x, lessonTitle: db.lessons.find((l) => l.id === x.lessonId)?.title, lessonSlug: db.lessons.find((l) => l.id === x.lessonId)?.slug }));
}

async function note(lessonId) {
  const db = getDb();
  const user = requireUser(db);
  return db.notes.find((x) => x.userId === user.id && x.lessonId === lessonId) || { lessonId, content: "" };
}

async function saveNote(lessonId, content) {
  const db = getDb();
  const user = requireUser(db);
  let found = db.notes.find((x) => x.userId === user.id && x.lessonId === lessonId);
  if (!found) {
    found = { id: id("note"), userId: user.id, lessonId, content: "", updatedAt: new Date().toISOString() };
    db.notes.push(found);
  }
  found.content = content;
  found.updatedAt = new Date().toISOString();
  unlock(db, user.id, "save_note");
  saveDb(db);
  return found;
}

async function quiz(scope, idValue) {
  const db = getDb();
  const questions = scope === "lesson"
    ? db.quizQuestions.filter((x) => x.lessonId === idValue)
    : scope === "module"
      ? db.quizQuestions.filter((x) => x.moduleId === idValue || db.lessons.find((lessonItem) => lessonItem.id === x.lessonId)?.moduleId === idValue).slice(0, 20)
      : db.quizQuestions.filter((x) => x.levelId === idValue && x.type === "final-exam");
  return questions.map(({ correctAnswer, ...question }) => question);
}

async function submitQuiz(payload) {
  const db = getDb();
  const user = requireUser(db);
  const questions = db.quizQuestions.filter((x) => payload.answers.some((answer) => answer.questionId === x.id));
  const feedback = questions.map((question) => {
    const answer = payload.answers.find((entry) => entry.questionId === question.id)?.answer || "";
    const isCorrect = answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
    return { id: question.id, correctAnswer: question.correctAnswer, explanation: question.explanation, userAnswer: answer, isCorrect };
  });
  const score = feedback.filter((x) => x.isCorrect).length;
  const total = questions.length;
  const passed = total > 0 && score / total >= 0.7;
  db.quizAttempts.push({ id: id("attempt"), userId: user.id, quizId: payload.quizId, lessonId: payload.lessonId, moduleId: payload.moduleId, levelId: payload.levelId, score, total, passed, createdAt: new Date().toISOString() });
  unlock(db, user.id, "submit_quiz");
  if (passed) unlock(db, user.id, "pass_quiz");
  if (score === total) unlock(db, user.id, "perfect_quiz");
  if (payload.levelId) unlock(db, user.id, "submit_final_exam");
  saveDb(db);
  return { score, total, passed, feedback };
}

async function exercises(moduleId) {
  const db = getDb();
  return db.practiceExercises.filter((x) => !moduleId || x.moduleId === moduleId).map((x) => ({ ...x, moduleTitle: db.modules.find((m) => m.id === x.moduleId)?.title }));
}

async function runCode({ code }) {
  const diagnostics = [];
  if (!code?.trim()) diagnostics.push("Code is required.");
  if (code?.length > 12000) diagnostics.push("Keep standalone practice snippets under 12000 characters.");
  if (/(System\.IO|File\.|Directory\.|Process\.|HttpClient|Socket|while\s*\(\s*true\s*\))/i.test(code || "")) {
    diagnostics.push("The standalone grader blocks file, process, network, and infinite-loop patterns.");
  }

  if (diagnostics.length > 0) {
    return { success: false, stdout: "", stderr: diagnostics.join("\n"), exitCode: -1, timedOut: false, elapsedMs: 0, diagnostics };
  }

  const lines = extractConsoleOutput(code || "");
  if (lines.length === 0) {
    return {
      success: false,
      stdout: "",
      stderr: "Standalone APK grading supports Console.WriteLine(\"text\") output checks. Use the web app for full C# compilation.",
      exitCode: 1,
      timedOut: false,
      elapsedMs: 0,
      diagnostics: ["No supported Console.WriteLine(\"text\") statements were found."]
    };
  }

  return { success: true, stdout: `${lines.join("\n")}\n`, stderr: "", exitCode: 0, timedOut: false, elapsedMs: 1, diagnostics: [] };
}

async function gradeExercise(exerciseId, code) {
  const db = getDb();
  const exercise = db.practiceExercises.find((x) => x.id === exerciseId);
  if (!exercise) throw new Error("Exercise not found.");

  const run = await runCode({ code });
  const expectedOutput = normalizeOutput(exercise.expectedOutput);
  const actualOutput = normalizeOutput(run.stdout);
  const passed = run.success && expectedOutput === actualOutput;
  return {
    passed,
    expectedOutput,
    actualOutput,
    feedback: passed
      ? "Passed. Your output matches exactly."
      : run.success
        ? "Not yet. Compare the expected output with your actual output and adjust the printed lines."
        : run.stderr || "The standalone grader could not run this snippet.",
    run
  };
}

async function projects(moduleId) {
  const db = getDb();
  return db.guidedProjects.filter((x) => !moduleId || x.moduleId === moduleId).map((x) => ({ ...x, moduleTitle: db.modules.find((m) => m.id === x.moduleId)?.title }));
}

async function projectProgress(projectId) {
  const db = getDb();
  const user = requireUser(db);
  return db.projectProgress.find((x) => x.userId === user.id && x.projectId === projectId) || { projectId, completedSteps: [], completed: false, updatedAt: null };
}

async function saveProjectProgress(projectId, completedSteps) {
  const db = getDb();
  const user = requireUser(db);
  const project = db.guidedProjects.find((x) => x.id === projectId);
  if (!project) throw new Error("Project not found.");

  const cleanSteps = [...new Set((completedSteps || []).map(Number))].filter((x) => Number.isInteger(x) && x >= 0).sort((a, b) => a - b);
  const completed = project.steps?.length ? cleanSteps.length >= project.steps.length : false;
  let progress = db.projectProgress.find((x) => x.userId === user.id && x.projectId === projectId);
  if (!progress) {
    progress = { id: id("project-progress"), userId: user.id, projectId, completedSteps: [], completed: false, updatedAt: new Date().toISOString() };
    db.projectProgress.push(progress);
  }

  progress.completedSteps = cleanSteps;
  progress.completed = completed;
  progress.updatedAt = new Date().toISOString();
  if (completed) unlock(db, user.id, "complete_project");
  saveDb(db);
  return progress;
}

async function achievements() {
  return getDb().achievements;
}

async function myAchievements() {
  const db = getDb();
  const user = requireUser(db);
  return db.userAchievements.filter((x) => x.userId === user.id).map((x) => ({ ...x, achievement: db.achievements.find((a) => a.id === x.achievementId) }));
}

async function certificate() {
  const db = getDb();
  const user = requireUser(db);
  const found = db.certificates.find((x) => x.userId === user.id);
  if (!found) throw new Error("Certificate has not been generated yet.");
  return found;
}

async function generateCertificate() {
  const db = getDb();
  const user = requireUser(db);
  const completed = db.progress.filter((x) => x.userId === user.id && x.completed).length;
  if (completed < db.lessons.length) throw new Error(`Complete every lesson before generating the certificate. ${completed}/${db.lessons.length} completed.`);
  const cert = { id: id("certificate"), userId: user.id, completionDate: new Date().toISOString(), finalScore: 100, certificateCode: `DNM-OFFLINE-${user.id.toUpperCase()}` };
  db.certificates.push(cert);
  unlock(db, user.id, "generate_certificate");
  saveDb(db);
  return cert;
}

async function search(q, type = "all") {
  const db = getDb();
  const term = q.toLowerCase();
  const match = (value) => String(value || "").toLowerCase().includes(term);
  const all = type === "all";
  return {
    lessons: all || type === "lessons" ? db.lessons.filter((x) => match(x.title) || match(x.simpleExplanation) || x.tags.some(match)).slice(0, 20).map((x) => ({ id: x.id, title: x.title, slug: x.slug, difficulty: x.difficulty, estimatedMinutes: x.estimatedMinutes, type: "lesson" })) : [],
    modules: all || type === "modules" ? db.modules.filter((x) => match(x.title) || match(x.description)).slice(0, 20).map((x) => ({ id: x.id, title: x.title, difficulty: x.difficulty, type: "module" })) : [],
    projects: all || type === "projects" ? db.guidedProjects.filter((x) => match(x.title) || match(x.description)).slice(0, 20).map((x) => ({ id: x.id, title: x.title, difficulty: x.difficulty, type: "project" })) : [],
    exercises: all || type === "exercises" ? db.practiceExercises.filter((x) => match(x.title) || match(x.problemStatement)).slice(0, 20).map((x) => ({ id: x.id, title: x.title, difficulty: x.difficulty, type: "exercise" })) : []
  };
}

async function adminStats() {
  const db = getDb();
  return {
    users: db.users.length,
    levels: db.levels.length,
    modules: db.modules.length,
    lessons: db.lessons.length,
    quizQuestions: db.quizQuestions.length,
    practiceExercises: db.practiceExercises.length,
    guidedProjects: db.guidedProjects.length,
    quizAttempts: db.quizAttempts.length,
    certificates: db.certificates.length
  };
}

async function adminList(resource) {
  requireAdmin(getDb());
  return getDb()[collectionName(resource)] || [];
}

async function adminCreate(resource, payload) {
  const db = getDb();
  requireAdmin(db);
  const collection = db[collectionName(resource)];
  const entity = { id: id(resource), ...payload };
  collection.push(entity);
  saveDb(db);
  return entity;
}

async function adminUpdate(resource, entityId, payload) {
  const db = getDb();
  requireAdmin(db);
  const collection = db[collectionName(resource)];
  const index = collection.findIndex((x) => x.id === entityId);
  if (index < 0) throw new Error("Record not found.");
  collection[index] = { id: entityId, ...payload };
  saveDb(db);
  return collection[index];
}

async function adminDelete(resource, entityId) {
  const db = getDb();
  requireAdmin(db);
  const collection = db[collectionName(resource)];
  const index = collection.findIndex((x) => x.id === entityId);
  if (index >= 0) collection.splice(index, 1);
  saveDb(db);
  return null;
}

function getDb() {
  const raw = localStorage.getItem(DB_KEY);
  if (raw) {
    const db = JSON.parse(raw);
    let changed = false;
    for (const collection of ["progress", "bookmarks", "notes", "quizAttempts", "userAchievements", "certificates", "projectProgress"]) {
      if (!Array.isArray(db[collection])) {
        db[collection] = [];
        changed = true;
      }
    }
    if (changed) saveDb(db);
    return db;
  }
  const seed = createStandaloneSeed();
  localStorage.setItem(DB_KEY, JSON.stringify(seed));
  return seed;
}

function saveDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function requireUser(db) {
  const token = localStorage.getItem("dotnetMastery.token") || "";
  const userId = token.startsWith("standalone:") ? token.slice("standalone:".length) : "";
  const user = db.users.find((x) => x.id === userId);
  if (!user) throw new Error("Please login again.");
  return user;
}

function requireAdmin(db) {
  const user = requireUser(db);
  if (user.role !== "Admin") throw new Error("Admin access is required.");
  return user;
}

function profile(user) {
  const { password, ...rest } = user;
  return rest;
}

function withLessonContext(db, lessonItem, full = false) {
  const moduleItem = db.modules.find((x) => x.id === lessonItem.moduleId);
  const levelItem = db.levels.find((x) => x.id === moduleItem?.levelId);
  const nextLesson = db.lessons.find((x) => x.id === lessonItem.nextLessonId);
  return {
    ...lessonItem,
    moduleTitle: moduleItem?.title,
    levelId: levelItem?.id,
    levelTitle: levelItem?.title,
    nextLessonSlug: full ? nextLesson?.slug : undefined,
    nextLessonTitle: full ? nextLesson?.title : undefined
  };
}

function unlock(db, userId, condition) {
  const achievement = db.achievements.find((x) => x.condition === condition);
  if (!achievement || db.userAchievements.some((x) => x.userId === userId && x.achievementId === achievement.id)) return;
  db.userAchievements.push({ id: id("user-achievement"), userId, achievementId: achievement.id, unlockedAt: new Date().toISOString() });
}

function evaluateProgress(db, userId) {
  const completed = db.progress.filter((x) => x.userId === userId && x.completed);
  if (completed.length >= 1) unlock(db, userId, "complete_1_lesson");
  if (completed.length >= 5) unlock(db, userId, "complete_5_lessons");
  if (completed.length >= 10) unlock(db, userId, "complete_10_lessons");
  if (new Set(completed.map((x) => x.completedAt?.slice(0, 10))).size >= 3) unlock(db, userId, "streak_3");
  if (new Set(completed.map((x) => x.completedAt?.slice(0, 10))).size >= 7) unlock(db, userId, "streak_7");
}

function calculateStreak(completed) {
  const dates = new Set(completed.map((x) => x.completedAt?.slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function collectionName(resource) {
  return {
    levels: "levels",
    modules: "modules",
    lessons: "lessons",
    "quiz-questions": "quizQuestions",
    "practice-exercises": "practiceExercises",
    "guided-projects": "guidedProjects"
  }[resource] || resource;
}

function id(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function extractConsoleOutput(code) {
  const lines = [];
  const regex = /Console\.WriteLine\s*\(\s*(["'`])([\s\S]*?)\1\s*\)\s*;/g;
  let match = regex.exec(code);
  while (match) {
    lines.push(match[2].replaceAll("\\n", "\n").replaceAll("\\\"", "\""));
    match = regex.exec(code);
  }
  return lines;
}

function normalizeOutput(output) {
  return String(output || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .join("\n")
    .trim();
}

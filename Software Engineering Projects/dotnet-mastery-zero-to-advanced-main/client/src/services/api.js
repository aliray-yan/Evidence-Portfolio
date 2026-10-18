import { standaloneApi } from "./standaloneApi.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5148/api";
const STANDALONE = import.meta.env.VITE_STANDALONE === "true";

let authToken = localStorage.getItem("dotnetMastery.token") || "";

export function setAuthToken(token) {
  authToken = token || "";
  if (authToken) {
    localStorage.setItem("dotnetMastery.token", authToken);
  } else {
    localStorage.removeItem("dotnetMastery.token");
  }
}

export function getAuthToken() {
  return authToken;
}

export async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error || data?.title || `Request failed with ${response.status}`);
  }

  return data;
}

const serverApi = {
  apiUrl: API_URL,
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/auth/me"),
  levels: () => request("/levels"),
  level: (id) => request(`/levels/${id}`),
  module: (id) => request(`/modules/${id}`),
  lessons: (moduleId) => request(`/lessons${moduleId ? `?moduleId=${moduleId}` : ""}`),
  lesson: (slug) => request(`/lessons/${slug}`),
  lessonById: (id) => request(`/lessons/id/${id}`),
  dashboard: () => request("/progress/dashboard"),
  completeLesson: (payload) => request("/progress/complete", { method: "POST", body: JSON.stringify(payload) }),
  lessonProgress: (lessonId) => request(`/progress/lesson/${lessonId}`),
  bookmarks: () => request("/bookmarks"),
  toggleBookmark: (lessonId) => request(`/bookmarks/${lessonId}/toggle`, { method: "POST" }),
  notes: () => request("/notes"),
  note: (lessonId) => request(`/notes/${lessonId}`),
  saveNote: (lessonId, content) => request(`/notes/${lessonId}`, { method: "PUT", body: JSON.stringify({ content }) }),
  quiz: (scope, id) => request(`/quizzes/${scope}/${id}`),
  submitQuiz: (payload) => request("/quizzes/attempts", { method: "POST", body: JSON.stringify(payload) }),
  exercises: (moduleId) => request(`/practice-exercises${moduleId ? `?moduleId=${moduleId}` : ""}`),
  runCode: (payload) => request("/code/run", { method: "POST", body: JSON.stringify(payload) }),
  gradeExercise: (id, code) => request(`/practice-exercises/${id}/grade`, { method: "POST", body: JSON.stringify({ code }) }),
  projects: (moduleId) => request(`/guided-projects${moduleId ? `?moduleId=${moduleId}` : ""}`),
  projectProgress,
  saveProjectProgress,
  achievements: () => request("/achievements"),
  myAchievements: () => request("/achievements/mine"),
  certificate: () => request("/certificate"),
  generateCertificate: () => request("/certificate/generate", { method: "POST" }),
  search: (q, type = "all") => request(`/search?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}`),
  adminStats: () => request("/admin/stats"),
  adminList: (resource) => request(`/admin/${resource}`),
  adminCreate: (resource, payload) => request(`/admin/${resource}`, { method: "POST", body: JSON.stringify(payload) }),
  adminUpdate: (resource, id, payload) => request(`/admin/${resource}/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  adminDelete: (resource, id) => request(`/admin/${resource}/${id}`, { method: "DELETE" })
};

export const api = STANDALONE ? standaloneApi : serverApi;

async function projectProgress(projectId) {
  const stored = localStorage.getItem(projectProgressKey(projectId));
  return stored ? JSON.parse(stored) : { projectId, completedSteps: [], completed: false, updatedAt: null };
}

async function saveProjectProgress(projectId, completedSteps) {
  const cleanSteps = [...new Set((completedSteps || []).map(Number))].sort((a, b) => a - b);
  const progress = {
    projectId,
    completedSteps: cleanSteps,
    completed: false,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(projectProgressKey(projectId), JSON.stringify(progress));
  return progress;
}

function projectProgressKey(projectId) {
  const rawUser = localStorage.getItem("dotnetMastery.user");
  const userId = rawUser ? JSON.parse(rawUser)?.id : "anonymous";
  return `dotnetMastery.projectProgress.${userId || "anonymous"}.${projectId}`;
}

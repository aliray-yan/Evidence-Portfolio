const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const STANDALONE_MODE = import.meta.env.VITE_STANDALONE_MODE === "true";

function getToken() {
  return localStorage.getItem("rag_mastery_token");
}

async function request(path, options = {}) {
  if (STANDALONE_MODE) {
    const { offlineRequest } = await import("./offlineApi.js");
    return offlineRequest(path, options);
  }

  const isForm = options.body instanceof FormData;
  const headers = {
    ...(isForm ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {})
  };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: isForm || typeof options.body === "string" ? options.body : options.body ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

export const api = {
  baseUrl: API_BASE_URL,
  setToken(token) {
    if (token) localStorage.setItem("rag_mastery_token", token);
    else localStorage.removeItem("rag_mastery_token");
  },
  getToken,
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path, { method: "DELETE" }),
  form: (path, formData) => request(path, { method: "POST", body: formData })
};

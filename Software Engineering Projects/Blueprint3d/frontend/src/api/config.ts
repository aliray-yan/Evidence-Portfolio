export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
// Local mode is an explicit workspace, never a silent fallback from a failing server.
export const LOCAL_MODE = import.meta.env.VITE_STORAGE_MODE !== 'server';

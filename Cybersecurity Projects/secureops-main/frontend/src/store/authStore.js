import { create } from 'zustand';

const STORAGE_KEY = 'secureops-session';

function readStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

export const useAuthStore = create((set) => ({
  session: readStoredSession(),
  setSession: (session) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    set({ session });
  },
  clearSession: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ session: null });
  }
}));

export function getStoredSession() {
  return readStoredSession();
}

import { create } from 'zustand';

export const useUIStore = create((set) => ({
  sidebarCollapsed: false,
  darkMode: true,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode }))
}));

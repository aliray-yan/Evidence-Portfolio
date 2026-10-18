import { create } from 'zustand';

export const useAlertStore = create((set) => ({
  filters: { page: 1, page_size: 25 },
  selectedAlertIds: [],
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters, page: filters.page ?? 1 } })),
  toggleAlert: (id) =>
    set((state) => ({
      selectedAlertIds: state.selectedAlertIds.includes(id)
        ? state.selectedAlertIds.filter((item) => item !== id)
        : [...state.selectedAlertIds, id]
    })),
  clearSelection: () => set({ selectedAlertIds: [] })
}));

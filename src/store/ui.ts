import { create } from 'zustand';

interface UiState {
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedTag: null,
  setSelectedTag: (tag) => set({ selectedTag: tag }),
}));

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const PANEL_MIN = 180;
const PANEL_MAX = 480;
const clamp = (w: number) => Math.max(PANEL_MIN, Math.min(PANEL_MAX, w));

interface UiState {
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  sidebarWidth: number;
  backlinkWidth: number;
  setSidebarWidth: (w: number) => void;
  setBacklinkWidth: (w: number) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      selectedTag: null,
      setSelectedTag: (tag) => set({ selectedTag: tag }),
      sidebarWidth: 256,
      backlinkWidth: 256,
      setSidebarWidth: (w) => set({ sidebarWidth: clamp(w) }),
      setBacklinkWidth: (w) => set({ backlinkWidth: clamp(w) }),
    }),
    {
      name: 'm3m-ui',
      partialize: (s) => ({ sidebarWidth: s.sidebarWidth, backlinkWidth: s.backlinkWidth }),
    }
  )
);

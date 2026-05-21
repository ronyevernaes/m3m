import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ContextPanelTab = 'details' | 'links' | 'backlinks' | 'insights' | 'agent';

const PANEL_MIN = 180;
const PANEL_MAX = 480;
const clamp = (w: number) => Math.max(PANEL_MIN, Math.min(PANEL_MAX, w));

interface UiState {
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  sidebarWidth: number;
  contextPanelWidth: number;
  contextPanelTab: ContextPanelTab;
  setSidebarWidth: (w: number) => void;
  setContextPanelWidth: (w: number) => void;
  setContextPanelTab: (tab: ContextPanelTab) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      selectedTag: null,
      setSelectedTag: (tag) => set({ selectedTag: tag }),
      sidebarWidth: 256,
      contextPanelWidth: 256,
      contextPanelTab: 'details',
      setSidebarWidth: (w) => set({ sidebarWidth: clamp(w) }),
      setContextPanelWidth: (w) => set({ contextPanelWidth: clamp(w) }),
      setContextPanelTab: (tab) => set({ contextPanelTab: tab }),
    }),
    {
      name: 'm3m-ui',
      partialize: (s) => ({
        sidebarWidth: s.sidebarWidth,
        contextPanelWidth: s.contextPanelWidth,
        contextPanelTab: s.contextPanelTab,
      }),
    }
  )
);

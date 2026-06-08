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
  advancedSearchOpen: boolean;
  setSidebarWidth: (w: number) => void;
  setContextPanelWidth: (w: number) => void;
  setContextPanelTab: (tab: ContextPanelTab) => void;
  setAdvancedSearchOpen: (open: boolean) => void;
  collapsedSections: Record<string, string[]>;
  toggleSectionCollapsed: (noteId: string, key: string) => void;
  completedTours: string[];
  markTourCompleted: (id: string) => void;
  resetTour: (id: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      selectedTag: null,
      setSelectedTag: (tag) => set({ selectedTag: tag }),
      sidebarWidth: 256,
      contextPanelWidth: 256,
      contextPanelTab: 'details',
      advancedSearchOpen: false,
      setSidebarWidth: (w) => set({ sidebarWidth: clamp(w) }),
      setContextPanelWidth: (w) => set({ contextPanelWidth: clamp(w) }),
      setContextPanelTab: (tab) => set({ contextPanelTab: tab }),
      setAdvancedSearchOpen: (open) => set({ advancedSearchOpen: open }),
      collapsedSections: {},
      toggleSectionCollapsed: (noteId, key) =>
        set((s) => {
          const current = s.collapsedSections[noteId] ?? []
          const next = current.includes(key)
            ? current.filter((k) => k !== key)
            : [...current, key]
          return { collapsedSections: { ...s.collapsedSections, [noteId]: next } }
        }),
      completedTours: [],
      markTourCompleted: (id) =>
        set((s) => ({
          completedTours: s.completedTours.includes(id) ? s.completedTours : [...s.completedTours, id],
        })),
      resetTour: (id) =>
        set((s) => ({ completedTours: s.completedTours.filter((t) => t !== id) })),
    }),
    {
      name: 'm3m-ui',
      partialize: (s) => ({
        sidebarWidth: s.sidebarWidth,
        contextPanelWidth: s.contextPanelWidth,
        contextPanelTab: s.contextPanelTab,
        advancedSearchOpen: s.advancedSearchOpen,
        collapsedSections: s.collapsedSections,
        completedTours: s.completedTours,
      }),
    }
  )
);

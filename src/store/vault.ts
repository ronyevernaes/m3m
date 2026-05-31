import { create } from 'zustand';
import type { Note, NoteListItem, Frontmatter } from '../types/note';
import type { VaultEntry } from '../types/vault';

export interface OpenTab {
  note: Note;
  isDirty: boolean;
}

interface VaultState {
  vaultPath: string | null;
  notes: NoteListItem[];
  currentNote: Note | null;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;

  openTabs: OpenTab[];
  activeTabPath: string | null;

  vaults: VaultEntry[];
  activeVaultId: string | null;
  registryLoading: boolean;

  setVaultPath: (path: string | null) => void;
  setNotes: (notes: NoteListItem[]) => void;
  setCurrentNote: (note: Note | null) => void;
  updateCurrentNoteBody: (body: string) => void;
  updateCurrentNoteTitle: (title: string) => void;
  updateCurrentNoteFrontmatterKey: (key: string, value: unknown) => void;
  deleteCurrentNoteFrontmatterKey: (key: string) => void;
  addTagToCurrentNote: (tag: string) => void;
  removeTagFromCurrentNote: (tag: string) => void;
  markClean: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  openTab: (note: Note) => void;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  updateTabNote: (oldPath: string, newNote: Note) => void;

  setVaults: (vaults: VaultEntry[]) => void;
  setActiveVaultId: (id: string | null) => void;
  upsertVault: (entry: VaultEntry) => void;
  removeVaultById: (id: string) => void;
  removeNoteByPath: (path: string) => void;
  setRegistryLoading: (loading: boolean) => void;
}

export const useVaultStore = create<VaultState>((set) => ({
  vaultPath: null,
  notes: [],
  currentNote: null,
  isDirty: false,
  isLoading: false,
  error: null,

  openTabs: [],
  activeTabPath: null,

  vaults: [],
  activeVaultId: null,
  registryLoading: true,

  setVaultPath: (path) => set({ vaultPath: path }),
  setNotes: (notes) => set({ notes }),

  setCurrentNote: (note) =>
    set((state) => {
      if (!note) return { currentNote: null, isDirty: false };
      return {
        currentNote: note,
        isDirty: false,
        activeTabPath: note.path,
        openTabs: state.openTabs.map((t) =>
          t.note.path === state.activeTabPath ? { ...t, note, isDirty: false } : t
        ),
      };
    }),

  updateCurrentNoteBody: (body) =>
    set((state) => {
      if (!state.currentNote) return {};
      const updatedNote = { ...state.currentNote, body };
      return {
        currentNote: updatedNote,
        isDirty: true,
        openTabs: state.openTabs.map((t) =>
          t.note.path === state.activeTabPath ? { ...t, note: updatedNote, isDirty: true } : t
        ),
      };
    }),

  updateCurrentNoteTitle: (title) =>
    set((state) => {
      if (!state.currentNote) return {};
      const updatedNote = {
        ...state.currentNote,
        frontmatter: { ...state.currentNote.frontmatter, title },
      };
      return {
        currentNote: updatedNote,
        isDirty: true,
        openTabs: state.openTabs.map((t) =>
          t.note.path === state.activeTabPath ? { ...t, note: updatedNote, isDirty: true } : t
        ),
      };
    }),

  updateCurrentNoteFrontmatterKey: (key, value) =>
    set((state) => {
      if (!state.currentNote) return {};
      const updatedNote = {
        ...state.currentNote,
        frontmatter: { ...state.currentNote.frontmatter, [key]: value },
      };
      return {
        currentNote: updatedNote,
        isDirty: true,
        openTabs: state.openTabs.map((t) =>
          t.note.path === state.activeTabPath ? { ...t, note: updatedNote, isDirty: true } : t
        ),
      };
    }),

  deleteCurrentNoteFrontmatterKey: (key) =>
    set((state) => {
      if (!state.currentNote) return {};
      const { [key]: _, ...rest } = state.currentNote.frontmatter;
      const updatedNote = {
        ...state.currentNote,
        frontmatter: rest as Frontmatter,
      };
      return {
        currentNote: updatedNote,
        isDirty: true,
        openTabs: state.openTabs.map((t) =>
          t.note.path === state.activeTabPath ? { ...t, note: updatedNote, isDirty: true } : t
        ),
      };
    }),

  addTagToCurrentNote: (tag) =>
    set((state) => {
      if (!state.currentNote) return {};
      const existing = state.currentNote.frontmatter.tags;
      if (existing.includes(tag)) return {};
      const updatedNote = {
        ...state.currentNote,
        frontmatter: { ...state.currentNote.frontmatter, tags: [...existing, tag] },
      };
      return {
        currentNote: updatedNote,
        isDirty: true,
        openTabs: state.openTabs.map((t) =>
          t.note.path === state.activeTabPath ? { ...t, note: updatedNote, isDirty: true } : t
        ),
      };
    }),

  removeTagFromCurrentNote: (tag) =>
    set((state) => {
      if (!state.currentNote) return {};
      const updatedNote = {
        ...state.currentNote,
        frontmatter: {
          ...state.currentNote.frontmatter,
          tags: state.currentNote.frontmatter.tags.filter((t) => t !== tag),
        },
      };
      return {
        currentNote: updatedNote,
        isDirty: true,
        openTabs: state.openTabs.map((t) =>
          t.note.path === state.activeTabPath ? { ...t, note: updatedNote, isDirty: true } : t
        ),
      };
    }),

  markClean: () =>
    set((state) => ({
      isDirty: false,
      openTabs: state.openTabs.map((t) =>
        t.note.path === state.activeTabPath ? { ...t, isDirty: false } : t
      ),
    })),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  openTab: (note) =>
    set((state) => {
      const existing = state.openTabs.find((t) => t.note.path === note.path);
      if (existing) {
        return {
          activeTabPath: note.path,
          currentNote: existing.note,
          isDirty: existing.isDirty,
        };
      }
      return {
        openTabs: [...state.openTabs, { note, isDirty: false }],
        activeTabPath: note.path,
        currentNote: note,
        isDirty: false,
      };
    }),

  closeTab: (path) =>
    set((state) => {
      const newTabs = state.openTabs.filter((t) => t.note.path !== path);
      if (state.activeTabPath !== path) {
        return { openTabs: newTabs };
      }
      const closedIndex = state.openTabs.findIndex((t) => t.note.path === path);
      const nextTab = newTabs[closedIndex] ?? newTabs[closedIndex - 1] ?? null;
      return {
        openTabs: newTabs,
        activeTabPath: nextTab?.note.path ?? null,
        currentNote: nextTab?.note ?? null,
        isDirty: nextTab?.isDirty ?? false,
      };
    }),

  setActiveTab: (path) =>
    set((state) => {
      const tab = state.openTabs.find((t) => t.note.path === path);
      if (!tab) return {};
      return { activeTabPath: path, currentNote: tab.note, isDirty: tab.isDirty };
    }),

  updateTabNote: (oldPath, newNote) =>
    set((state) => {
      const updatedTabs = state.openTabs.map((t) =>
        t.note.path === oldPath ? { ...t, note: newNote, isDirty: false } : t
      );
      const isActive = state.activeTabPath === oldPath;
      return {
        openTabs: updatedTabs,
        ...(isActive
          ? { currentNote: newNote, isDirty: false, activeTabPath: newNote.path }
          : {}),
      };
    }),

  setVaults: (vaults) => set({ vaults }),
  setActiveVaultId: (id) => set({ activeVaultId: id }),
  upsertVault: (entry) =>
    set((state) => {
      const exists = state.vaults.some((v) => v.id === entry.id);
      return {
        vaults: exists
          ? state.vaults.map((v) => (v.id === entry.id ? entry : v))
          : [...state.vaults, entry],
      };
    }),
  removeVaultById: (id) =>
    set((state) => ({ vaults: state.vaults.filter((v) => v.id !== id) })),
  removeNoteByPath: (path) =>
    set((state) => ({ notes: state.notes.filter((n) => n.path !== path) })),
  setRegistryLoading: (loading) => set({ registryLoading: loading }),
}));

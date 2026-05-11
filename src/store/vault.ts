import { create } from 'zustand';
import type { Note, NoteListItem } from '../types/note';
import type { VaultEntry } from '../types/vault';

interface VaultState {
  vaultPath: string | null;
  notes: NoteListItem[];
  currentNote: Note | null;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;

  vaults: VaultEntry[];
  activeVaultId: string | null;
  registryLoading: boolean;

  setVaultPath: (path: string | null) => void;
  setNotes: (notes: NoteListItem[]) => void;
  setCurrentNote: (note: Note | null) => void;
  updateCurrentNoteBody: (body: string) => void;
  updateCurrentNoteTitle: (title: string) => void;
  markClean: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

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

  vaults: [],
  activeVaultId: null,
  registryLoading: true,

  setVaultPath: (path) => set({ vaultPath: path }),
  setNotes: (notes) => set({ notes }),
  setCurrentNote: (note) => set({ currentNote: note, isDirty: false }),
  updateCurrentNoteBody: (body) =>
    set((state) => ({
      currentNote: state.currentNote ? { ...state.currentNote, body } : null,
      isDirty: state.currentNote ? true : state.isDirty,
    })),
  updateCurrentNoteTitle: (title) =>
    set((state) => ({
      currentNote: state.currentNote
        ? { ...state.currentNote, frontmatter: { ...state.currentNote.frontmatter, title } }
        : null,
      isDirty: state.currentNote ? true : state.isDirty,
    })),
  markClean: () => set({ isDirty: false }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

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

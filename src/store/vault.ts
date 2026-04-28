import { create } from 'zustand';
import type { Note, NoteListItem } from '../types/note';

interface VaultState {
  vaultPath: string | null;
  notes: NoteListItem[];
  currentNote: Note | null;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;

  setVaultPath: (path: string) => void;
  setNotes: (notes: NoteListItem[]) => void;
  setCurrentNote: (note: Note | null) => void;
  updateCurrentNoteBody: (body: string) => void;
  updateCurrentNoteTitle: (title: string) => void;
  markClean: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useVaultStore = create<VaultState>((set) => ({
  vaultPath: null,
  notes: [],
  currentNote: null,
  isDirty: false,
  isLoading: false,
  error: null,

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
}));

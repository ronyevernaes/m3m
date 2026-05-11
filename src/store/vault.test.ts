import { describe, it, expect, beforeEach } from 'vitest';
import { useVaultStore } from './vault';
import type { Note } from '../types/note';

const makeNote = (path: string): Note => ({
  path,
  frontmatter: {
    id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    title: 'Test',
    created: '2026-01-01T00:00:00.000Z',
    modified: '2026-01-01T00:00:00.000Z',
    tags: [],
    links: [],
  },
  body: 'Hello',
});

beforeEach(() => {
  useVaultStore.setState({
    vaultPath: null,
    notes: [],
    currentNote: null,
    isDirty: false,
    isLoading: false,
    error: null,
  });
});

describe('vault store', () => {
  it('setCurrentNote resets isDirty', () => {
    const store = useVaultStore.getState();
    store.updateCurrentNoteBody('something');
    expect(useVaultStore.getState().isDirty).toBe(false); // no current note
    store.setCurrentNote(makeNote('/vault/note.md'));
    store.updateCurrentNoteBody('changed');
    expect(useVaultStore.getState().isDirty).toBe(true);
    store.setCurrentNote(makeNote('/vault/other.md'));
    expect(useVaultStore.getState().isDirty).toBe(false);
  });

  it('updateCurrentNoteBody sets isDirty', () => {
    const store = useVaultStore.getState();
    store.setCurrentNote(makeNote('/vault/note.md'));
    store.updateCurrentNoteBody('new body');
    const state = useVaultStore.getState();
    expect(state.isDirty).toBe(true);
    expect(state.currentNote?.body).toBe('new body');
  });

  it('markClean clears isDirty', () => {
    const store = useVaultStore.getState();
    store.setCurrentNote(makeNote('/vault/note.md'));
    store.updateCurrentNoteBody('changed');
    store.markClean();
    expect(useVaultStore.getState().isDirty).toBe(false);
  });

  it('removeNoteByPath removes the matching note', () => {
    useVaultStore.setState({
      notes: [
        { id: 'a', title: 'A', path: '/vault/a.md', modified: '', tags: [] },
        { id: 'b', title: 'B', path: '/vault/b.md', modified: '', tags: [] },
      ],
    });
    useVaultStore.getState().removeNoteByPath('/vault/a.md');
    const { notes } = useVaultStore.getState();
    expect(notes).toHaveLength(1);
    expect(notes[0].path).toBe('/vault/b.md');
  });

  it('setError stores error message', () => {
    useVaultStore.getState().setError('something went wrong');
    expect(useVaultStore.getState().error).toBe('something went wrong');
    useVaultStore.getState().setError(null);
    expect(useVaultStore.getState().error).toBeNull();
  });
});

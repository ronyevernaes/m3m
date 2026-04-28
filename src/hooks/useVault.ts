import { useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useVaultStore } from '../store/vault';
import { listNotes, readNote, writeNote, openVault } from '../lib/ipc';
import { parseNote, stringifyNote } from '../lib/frontmatter';
import { newUlid } from '../lib/ulid';

export function useVault() {
  const store = useVaultStore();

  const loadNotes = useCallback(async () => {
    if (!store.vaultPath) return;
    store.setLoading(true);
    store.setError(null);
    try {
      const items = await listNotes(store.vaultPath);
      store.setNotes(items);
    } catch (err) {
      store.setError(String(err));
    } finally {
      store.setLoading(false);
    }
  }, [store.vaultPath]); // eslint-disable-line react-hooks/exhaustive-deps

  const openNote = useCallback(async (path: string) => {
    store.setLoading(true);
    store.setError(null);
    try {
      const raw = await readNote(path);
      const note = parseNote(raw.content, raw.path);
      store.setCurrentNote(note);
    } catch (err) {
      store.setError(String(err));
    } finally {
      store.setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveCurrentNote = useCallback(async (bodyOverride?: string) => {
    const { currentNote, setLoading, setError, setCurrentNote } = useVaultStore.getState();
    if (!currentNote) return;
    setLoading(true);
    setError(null);
    try {
      const noteToSave = bodyOverride !== undefined
        ? { ...currentNote, body: bodyOverride }
        : currentNote;
      const rawContent = stringifyNote(noteToSave);
      await writeNote(currentNote.path, rawContent);
      const updatedNote = parseNote(rawContent, currentNote.path);
      setCurrentNote(updatedNote);
      await loadNotes();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [loadNotes]);

  const newNote = useCallback(
    async (title = 'Untitled') => {
      console.log('[newNote] called, title=', title);
      const { vaultPath, setLoading, setError, setCurrentNote } = useVaultStore.getState();
      console.log('[newNote] vaultPath=', vaultPath);
      if (!vaultPath) {
        setError('Cannot create note: vault path is not set');
        return;
      }
      setError(null);

      try {
        const id = newUlid();
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';
        const filename = `${slug}-${id.slice(-8).toLowerCase()}.md`;
        const notePath = `${vaultPath.replace(/\/$/, '')}/${filename}`;
        console.log('[newNote] notePath=', notePath);

        const now = new Date().toISOString();
        const blankNote = parseNote('', notePath);
        const noteWithMeta = {
          ...blankNote,
          frontmatter: { ...blankNote.frontmatter, id, title, created: now, modified: now },
          body: '',
        };
        const rawContent = stringifyNote(noteWithMeta);
        const savedNote = parseNote(rawContent, notePath);
        console.log('[newNote] setting currentNote, title=', savedNote.frontmatter.title);

        // Show editor immediately — don't wait for disk write
        setCurrentNote(savedNote);

        setLoading(true);
        await writeNote(notePath, rawContent);
        await loadNotes();
      } catch (err) {
        console.error('[newNote] failed:', err);
        setError(String(err));
      } finally {
        setLoading(false);
      }
    },
    [loadNotes],
  );

  const initVault = useCallback(async (path: string) => {
    store.setVaultPath(path);
    store.setLoading(true);
    store.setError(null);
    try {
      await openVault(path);
      const items = await listNotes(path);
      store.setNotes(items);
    } catch (err) {
      store.setError(String(err));
    } finally {
      store.setLoading(false);
    }
    const unlisten = await listen('vault:index-updated', () => {
      loadNotes();
    });
    return unlisten;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    vaultPath: store.vaultPath,
    notes: store.notes,
    currentNote: store.currentNote,
    isDirty: store.isDirty,
    isLoading: store.isLoading,
    error: store.error,
    setVaultPath: store.setVaultPath,
    updateCurrentNoteBody: store.updateCurrentNoteBody,
    updateCurrentNoteTitle: store.updateCurrentNoteTitle,
    loadNotes,
    openNote,
    saveCurrentNote,
    newNote,
    initVault,
  };
}

import { useCallback, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useVaultStore } from '../store/vault';
import type { Note } from '../types/note';
import { listNotes, readNote, writeNote, renameNote, openVault, deleteNote as deleteNoteIpc } from '../lib/ipc';
import { parseNote, stringifyNote } from '../lib/frontmatter';
import { newUlid } from '../lib/ulid';
import { extractWikilinkTitles, resolveLinksToIds } from '../lib/wikilinkSync';

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

  const saveCurrentNote = useCallback(async (bodyOverride?: string) => {
    const { currentNote, vaultPath, setLoading, setError, setCurrentNote } = useVaultStore.getState();
    if (!currentNote) return;
    setLoading(true);
    setError(null);
    try {
      const body = bodyOverride !== undefined ? bodyOverride : currentNote.body;
      const { notes } = useVaultStore.getState();
      const wikilinkTitles = extractWikilinkTitles(body);
      const resolvedIds = resolveLinksToIds(wikilinkTitles, notes);
      const noteToSave = {
        ...currentNote,
        body,
        frontmatter: { ...currentNote.frontmatter, links: resolvedIds },
      };
      const rawContent = stringifyNote(noteToSave);

      let targetPath = currentNote.path;
      const id = noteToSave.frontmatter.id;
      if (id && vaultPath) {
        const title = noteToSave.frontmatter.title;
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';
        const filename = `${slug}-${id.slice(-8).toLowerCase()}.md`;
        targetPath = `${vaultPath.replace(/\/$/, '')}/${filename}`;
      }

      if (targetPath !== currentNote.path) {
        await renameNote(currentNote.path, targetPath);
      }

      await writeNote(targetPath, rawContent);
      const updatedNote = parseNote(rawContent, targetPath);
      setCurrentNote(updatedNote);
      await loadNotes();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [loadNotes]);

  const saveNoteTab = useCallback(async (note: Note) => {
    const { vaultPath, setError, updateTabNote, setCurrentNote, activeTabPath } = useVaultStore.getState();
    setError(null);
    try {
      const { notes } = useVaultStore.getState();
      const wikilinkTitles = extractWikilinkTitles(note.body);
      const resolvedIds = resolveLinksToIds(wikilinkTitles, notes);
      const noteToSave = {
        ...note,
        frontmatter: { ...note.frontmatter, links: resolvedIds },
      };
      const rawContent = stringifyNote(noteToSave);

      let targetPath = note.path;
      const id = noteToSave.frontmatter.id;
      if (id && vaultPath) {
        const title = noteToSave.frontmatter.title;
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';
        const filename = `${slug}-${id.slice(-8).toLowerCase()}.md`;
        targetPath = `${vaultPath.replace(/\/$/, '')}/${filename}`;
      }

      if (targetPath !== note.path) {
        await renameNote(note.path, targetPath);
      }

      await writeNote(targetPath, rawContent);
      const updatedNote = parseNote(rawContent, targetPath);

      if (activeTabPath === note.path) {
        setCurrentNote(updatedNote);
      } else {
        updateTabNote(note.path, updatedNote);
      }
      await loadNotes();
    } catch (err) {
      setError(String(err));
    }
  }, [loadNotes]);

  const saveNoteTabRef = useRef(saveNoteTab);
  useEffect(() => { saveNoteTabRef.current = saveNoteTab; }, [saveNoteTab]);

  const saveCurrentNoteRef = useRef(saveCurrentNote);
  useEffect(() => { saveCurrentNoteRef.current = saveCurrentNote; }, [saveCurrentNote]);

  const openNote = useCallback(async (path: string) => {
    const { openTabs, activeTabPath, openTab, setLoading, setError } = useVaultStore.getState();
    if (activeTabPath === path) return;
    const existingTab = openTabs.find((t) => t.note.path === path);
    if (existingTab) {
      openTab(existingTab.note);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const raw = await readNote(path);
      const note = parseNote(raw.content, raw.path);
      openTab(note);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const closeTab = useCallback(async (path: string) => {
    const { openTabs } = useVaultStore.getState();
    const tab = openTabs.find((t) => t.note.path === path);
    if (tab?.isDirty) {
      await saveNoteTabRef.current(tab.note);
    }
    useVaultStore.getState().closeTab(path);
  }, []);

  const saveAllDirtyTabs = useCallback(async () => {
    const { openTabs } = useVaultStore.getState();
    const dirtyTabs = openTabs.filter((t) => t.isDirty);
    await Promise.all(dirtyTabs.map((t) => saveNoteTabRef.current(t.note)));
  }, []);

  const newNote = useCallback(
    async (title = 'Untitled') => {
      console.log('[newNote] called, title=', title);
      const { vaultPath, setLoading, setError, openTab } = useVaultStore.getState();
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
        console.log('[newNote] opening tab, title=', savedNote.frontmatter.title);

        // Show editor immediately — don't wait for disk write
        openTab(savedNote);

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

  const deleteNote = useCallback(async (path: string) => {
    const { setError, removeNoteByPath, closeTab: storeCloseTab } = useVaultStore.getState();
    setError(null);
    try {
      await deleteNoteIpc(path);
      removeNoteByPath(path);
      storeCloseTab(path);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const initVault = useCallback(async (path: string) => {
    const { setVaultPath, setLoading, setError, setNotes } = useVaultStore.getState();
    setVaultPath(path);
    setLoading(true);
    setError(null);
    try {
      await openVault(path);
      const items = await listNotes(path);
      setNotes(items);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
    const unlisten = await listen('vault:index-updated', () => {
      loadNotes();
    });
    return unlisten;
  }, [loadNotes]);

  return {
    vaultPath: store.vaultPath,
    notes: store.notes,
    currentNote: store.currentNote,
    isDirty: store.isDirty,
    isLoading: store.isLoading,
    error: store.error,
    openTabs: store.openTabs,
    activeTabPath: store.activeTabPath,
    setVaultPath: store.setVaultPath,
    updateCurrentNoteBody: store.updateCurrentNoteBody,
    updateCurrentNoteTitle: store.updateCurrentNoteTitle,
    updateCurrentNoteFrontmatterKey: store.updateCurrentNoteFrontmatterKey,
    deleteCurrentNoteFrontmatterKey: store.deleteCurrentNoteFrontmatterKey,
    loadNotes,
    openNote,
    saveCurrentNote,
    saveAllDirtyTabs,
    closeTab,
    switchTab: store.setActiveTab,
    newNote,
    deleteNote,
    initVault,
  };
}

import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getBacklinks } from '../lib/ipc';
import type { BacklinkItem } from '../types/note';

export function useBacklinks(noteId: string | null) {
  const [backlinks, setBacklinks] = useState<BacklinkItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!noteId) return;
    let cancelled = false;
    getBacklinks(noteId).then(
      (result) => { if (!cancelled) { setBacklinks(result); setError(null); } },
      (err) => { if (!cancelled) { setError(String(err)); setBacklinks([]); } },
    );
    return () => { cancelled = true; };
  }, [noteId]);

  useEffect(() => {
    if (!noteId) return;
    const unlisten = listen('vault:index-updated', () => {
      getBacklinks(noteId).then(
        (result) => { setBacklinks(result); setError(null); },
        (err) => { setError(String(err)); setBacklinks([]); },
      );
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [noteId]);

  return { backlinks: noteId ? backlinks : [], isLoading: false, error };
}

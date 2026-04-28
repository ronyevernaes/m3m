import { useState, useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getBacklinks } from '../lib/ipc';
import type { BacklinkItem } from '../types/note';

export function useBacklinks(noteId: string | null) {
  const [backlinks, setBacklinks] = useState<BacklinkItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      setBacklinks(await getBacklinks(id));
    } catch (err) {
      setError(String(err));
      setBacklinks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!noteId) { setBacklinks([]); return; }
    fetch(noteId);
  }, [noteId, fetch]);

  useEffect(() => {
    if (!noteId) return;
    const unlisten = listen('vault:index-updated', () => fetch(noteId));
    return () => { unlisten.then((fn) => fn()); };
  }, [noteId, fetch]);

  return { backlinks, isLoading, error };
}

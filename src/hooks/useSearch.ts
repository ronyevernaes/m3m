import { useState, useCallback } from 'react';
import { searchNotes } from '../lib/ipc';
import type { SearchResult } from '../types/note';

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    setError(null);
    try {
      const hits = await searchNotes(query.trim());
      setResults(hits);
    } catch (err) {
      setError(String(err));
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearSearch = useCallback(() => setResults([]), []);

  return { results, isSearching, error, search, clearSearch };
}

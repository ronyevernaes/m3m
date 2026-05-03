import type { SearchResult } from '../../types/note';
import { cn } from '../../lib/cn';

interface SearchResultsProps {
  results: SearchResult[];
  isSearching: boolean;
  onSelect: (path: string) => void;
  className?: string;
}

export function SearchResults({ results, isSearching, onSelect, className }: SearchResultsProps) {
  if (isSearching) {
    return (
      <p className={cn('px-4 py-3 text-sm text-neutral-400', className)}>
        Searching…
      </p>
    );
  }

  if (results.length === 0) {
    return (
      <p className={cn('px-4 py-3 text-sm text-neutral-400', className)}>
        No results
      </p>
    );
  }

  return (
    <ul className={cn('flex-1 min-h-0 overflow-y-auto py-1', className)}>
      {results.map((result) => (
        <li key={result.id}>
          <button
            type="button"
            onClick={() => onSelect(result.path)}
            className="w-full px-4 py-2 text-left hover:bg-muted transition-colors duration-100"
          >
            <p className="text-sm font-medium text-heading truncate">{result.title || 'Untitled'}</p>
            {result.snippet && (
              <p
                className="text-xs text-neutral-400 mt-0.5 line-clamp-2 [&_mark]:bg-accent-subtle [&_mark]:text-accent [&_mark]:rounded-sm [&_mark]:px-0.5"
                dangerouslySetInnerHTML={{ __html: result.snippet }}
              />
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

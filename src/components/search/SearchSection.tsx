import type { NoteListItem } from '../../types/note';
import { useUiStore } from '../../store/ui';
import { SearchBar } from './SearchBar';
import { TagList } from '../sidebar/TagList';
import { SlidersIcon } from '../icons/SlidersIcon';
import { cn } from '../../lib/cn';

interface SearchSectionProps {
  query: string;
  onChange: (value: string) => void;
  notes: NoteListItem[];
  className?: string;
}

export function SearchSection({ query, onChange, notes, className }: SearchSectionProps) {
  const { advancedSearchOpen, setAdvancedSearchOpen } = useUiStore();

  return (
    <div className={cn('border-b border-border', className)}>
      <div className="flex items-center gap-1 px-3 py-2">
        <SearchBar query={query} onChange={onChange} className="flex-1 p-0" />
        <button
          data-tour="advanced-search-toggle"
          type="button"
          onClick={() => setAdvancedSearchOpen(!advancedSearchOpen)}
          aria-label="Toggle advanced search"
          aria-expanded={advancedSearchOpen}
          className={cn(
            'flex-shrink-0 p-1.5 rounded-md transition-colors',
            advancedSearchOpen
              ? 'text-brand-500 bg-brand-500/10'
              : 'text-neutral-400 hover:text-heading hover:bg-muted',
          )}
        >
          <SlidersIcon />
        </button>
      </div>
      {advancedSearchOpen && (
        <div className="px-3 pb-3 flex flex-col gap-3">
          <TagList notes={notes} />
        </div>
      )}
    </div>
  );
}

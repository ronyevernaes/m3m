import type { NoteListItem } from '../../types/note';
import { useUiStore } from '../../store/ui';
import { Button } from '../ui/Button';
import { cn } from '../../lib/cn';

interface TagListProps {
  notes: NoteListItem[];
}

export function TagList({ notes }: TagListProps) {
  const { selectedTag, setSelectedTag } = useUiStore();

  const tagCounts = notes.reduce((acc, note) => {
    note.tags.forEach((tag) => {
      if (tag) acc.set(tag, (acc.get(tag) ?? 0) + 1);
    });
    return acc;
  }, new Map<string, number>());

  if (tagCounts.size === 0) return null;

  const sorted = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex-shrink-0 border-t border-border max-h-48 overflow-y-auto">
      <div className="px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground">Tags</span>
      </div>
      {sorted.map(([tag, count]) => (
        <Button
          key={tag}
          intent="ghost"
          size="sm"
          onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
          className={cn(
            'w-full justify-between rounded-none font-normal px-4',
            selectedTag === tag
              ? 'bg-accent-subtle text-accent hover:bg-accent-subtle hover:text-accent'
              : 'text-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <span className="truncate">{tag}</span>
          <span className="ml-2 text-xs tabular-nums flex-shrink-0">{count}</span>
        </Button>
      ))}
    </div>
  );
}

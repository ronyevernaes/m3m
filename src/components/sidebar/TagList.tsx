import type { NoteListItem } from '../../types/note';
import { useUiStore } from '../../store/ui';
import { TagPill } from '../ui/TagPill';

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
    <div className="flex-shrink-0 border-t border-border px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-foreground block mb-2">Tags</span>
      <div className="flex flex-wrap gap-1.5">
        {sorted.map(([tag, count]) => (
          <TagPill
            key={tag}
            variant="interactive"
            label={tag}
            count={count}
            selected={selectedTag === tag}
            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
          />
        ))}
      </div>
    </div>
  );
}

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import type { NoteListItem } from '../../types/note';
import { cn } from '../../lib/cn';

export interface WikilinkSuggestionRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface WikilinkSuggestionProps {
  items: NoteListItem[];
  command: (item: NoteListItem) => void;
}

export const WikilinkSuggestion = forwardRef<WikilinkSuggestionRef, WikilinkSuggestionProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown({ key }: KeyboardEvent) {
        if (key === 'ArrowUp') {
          setSelectedIndex((i) => (i - 1 + items.length) % items.length);
          return true;
        }
        if (key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (key === 'Enter') {
          if (items[selectedIndex]) command(items[selectedIndex]);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) return null;

    return (
      <div className="z-50 w-64 overflow-hidden rounded-md border border-border bg-background shadow-lg">
        {items.map((note, index) => (
          <button
            key={note.id || note.path}
            type="button"
            onClick={() => command(note)}
            className={cn(
              'w-full px-3 py-2 text-left text-sm truncate transition-colors',
              index === selectedIndex
                ? 'bg-accent text-heading'
                : 'text-foreground hover:bg-muted',
            )}
          >
            {note.title || 'Untitled'}
          </button>
        ))}
      </div>
    );
  },
);

WikilinkSuggestion.displayName = 'WikilinkSuggestion';

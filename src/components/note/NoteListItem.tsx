import { cn } from '../../lib/cn';
import { TrashIcon } from '../icons/TrashIcon';
import type { NoteListItem as NoteListItemType } from '../../types/note';

interface NoteListItemProps {
  note: NoteListItemType;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  className?: string;
}

export function NoteListItem({ note, isActive, onSelect, onDelete, className }: NoteListItemProps) {
  return (
    <li className={cn('group relative', className)}>
      <button
        onClick={onSelect}
        className={cn(
          'w-full text-left px-4 py-1.5 text-sm font-normal truncate pr-8',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset',
          isActive
            ? 'bg-accent-subtle text-accent'
            : 'text-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        {note.title || 'Untitled'}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        aria-label={`Delete "${note.title || 'Untitled'}"`}
        className={cn(
          'absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
          'text-neutral-400 hover:text-error-500 hover:bg-error-50',
          'dark:hover:text-error-400 dark:hover:bg-error-950',
          'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        )}
      >
        <TrashIcon />
      </button>
    </li>
  );
}

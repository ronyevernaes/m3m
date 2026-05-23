import { useState } from 'react';
import { cn } from '../../lib/cn';
import { FormInput } from '../ui/FormInput';

interface PropertyRowProps {
  propertyKey: string;
  value: string;
  onValueChange: (key: string, value: string) => void;
  onDelete: (key: string) => void;
  className?: string;
}

export function PropertyRow({ propertyKey, value, onValueChange, onDelete, className }: PropertyRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');

  function startEdit() {
    setDraft(value);
    setIsEditing(true);
  }

  function commit() {
    onValueChange(propertyKey, draft.trim());
    setIsEditing(false);
  }

  function cancel() {
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  }

  return (
    <div className={cn('group grid grid-cols-[1fr_2fr] items-center gap-1 min-h-5', className)}>
      <span className="text-xs text-foreground/50 truncate">{propertyKey}</span>
      <div className="flex items-center gap-1">
        {isEditing ? (
          <FormInput
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            className="h-6 px-1.5 py-0 text-xs flex-1"
          />
        ) : (
          <span
            onClick={startEdit}
            className="text-xs cursor-text flex-1 truncate hover:text-foreground/80"
          >
            {value || <span className="text-foreground/30 italic">empty</span>}
          </span>
        )}
        <button
          type="button"
          onClick={() => onDelete(propertyKey)}
          className="opacity-0 group-hover:opacity-100 text-foreground/40 hover:text-foreground/80 text-xs leading-none shrink-0"
          aria-label={`Delete property ${propertyKey}`}
        >
          ×
        </button>
      </div>
    </div>
  );
}

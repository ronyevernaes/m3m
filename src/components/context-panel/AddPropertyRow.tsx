import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { FormInput } from '../ui/FormInput';

const SYSTEM_KEYS = new Set(['id', 'title', 'created', 'modified', 'tags', 'links']);

interface AddPropertyRowProps {
  existingKeys: string[];
  onAdd: (key: string, value: string) => void;
  className?: string;
}

export function AddPropertyRow({ existingKeys, onAdd, className }: AddPropertyRowProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [draftKey, setDraftKey] = useState('');
  const [draftValue, setDraftValue] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);
  const valueInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding) keyInputRef.current?.focus();
  }, [isAdding]);

  function reset() {
    setIsAdding(false);
    setDraftKey('');
    setDraftValue('');
    setKeyError(null);
  }

  function handleCommit() {
    const key = draftKey.trim();
    if (!key) { setKeyError('Key cannot be empty'); keyInputRef.current?.focus(); return; }
    if (SYSTEM_KEYS.has(key) || existingKeys.includes(key)) {
      setKeyError('Key already exists');
      keyInputRef.current?.focus();
      return;
    }
    onAdd(key, draftValue.trim());
    reset();
  }

  function handleKeyKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); valueInputRef.current?.focus(); }
    if (e.key === 'Escape') { e.preventDefault(); reset(); }
  }

  function handleValueKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleCommit(); }
    if (e.key === 'Escape') { e.preventDefault(); reset(); }
  }

  if (!isAdding) {
    return (
      <button
        type="button"
        onClick={() => setIsAdding(true)}
        className={cn('text-xs text-foreground/40 hover:text-foreground/70 flex items-center gap-0.5 mt-1', className)}
      >
        + Add property
      </button>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1 mt-1', className)}>
      <div className="flex gap-1">
        <FormInput
          ref={keyInputRef}
          placeholder="key"
          value={draftKey}
          onChange={(e) => { setDraftKey(e.target.value); setKeyError(null); }}
          onKeyDown={handleKeyKeyDown}
          className="flex-1 h-6 px-1.5 py-0 text-xs"
        />
        <FormInput
          ref={valueInputRef}
          placeholder="value"
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          onKeyDown={handleValueKeyDown}
          onBlur={() => { if (draftKey.trim()) handleCommit(); else reset(); }}
          className="flex-1 h-6 px-1.5 py-0 text-xs"
        />
      </div>
      {keyError && <span className="text-xs text-red-500">{keyError}</span>}
    </div>
  );
}

import { useEffect, useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import { cn } from '../../lib/cn';

interface SearchBarProps {
  query: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SearchBar({ query, onChange, className }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onChange('');
      inputRef.current?.blur();
    }
  };

  return (
    <div className={cn('px-3 py-2', className)}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="⌘ search files & folders…"
        className={cn(
          'w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-muted text-heading',
          'placeholder:text-neutral-400',
          'focus:outline-none focus:ring-2 focus:ring-brand-500',
        )}
      />
    </div>
  );
}

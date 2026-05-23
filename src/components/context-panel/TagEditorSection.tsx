import { useState, useRef, useEffect } from 'react';
import { useVaultStore } from '../../store/vault';
import { useVault } from '../../hooks/useVault';
import { TagPill } from '../ui/TagPill';

export function TagEditorSection() {
  const currentNote = useVaultStore((s) => s.currentNote);
  const notes = useVaultStore((s) => s.notes);
  const { addTagToCurrentNote, removeTagFromCurrentNote } = useVaultStore();
  const { saveCurrentNote } = useVault();

  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentTags = currentNote?.frontmatter.tags ?? [];

  const allVaultTags = Array.from(
    new Set(notes.flatMap((n) => n.tags).filter(Boolean))
  ).sort();

  const suggestions = input.trim()
    ? allVaultTags.filter(
        (t) => t.includes(input.trim().toLowerCase()) && !currentTags.includes(t)
      )
    : allVaultTags.filter((t) => !currentTags.includes(t));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function commitTag(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (!tag || currentTags.includes(tag)) return;
    addTagToCurrentNote(tag);
    saveCurrentNote();
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitTag(input);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    } else if (e.key === 'Backspace' && input === '' && currentTags.length > 0) {
      const last = currentTags[currentTags.length - 1];
      removeTagFromCurrentNote(last);
      saveCurrentNote();
    }
  }

  function handleRemove(tag: string) {
    removeTagFromCurrentNote(tag);
    saveCurrentNote();
  }

  function handleSuggestionClick(tag: string) {
    commitTag(tag);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  if (!currentNote) return null;

  return (
    <div className="flex flex-col gap-1" ref={containerRef}>
      <span className="text-xs text-foreground/60 uppercase tracking-wide">Tags</span>
      <div
        className="flex flex-wrap gap-1 min-h-6 p-1.5 rounded-md border border-border bg-muted/40 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {currentTags.map((tag) => (
          <TagPill key={tag} variant="removable" label={tag} onRemove={() => handleRemove(tag)} />
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={currentTags.length === 0 ? 'Add tags…' : ''}
          className="flex-1 min-w-20 bg-transparent text-xs outline-none placeholder:text-foreground/30 text-foreground"
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="rounded-md border border-border bg-popover shadow-md overflow-hidden">
          {suggestions.slice(0, 8).map((tag) => (
            <button
              key={tag}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(tag); }}
              className="w-full text-left px-2.5 py-1 text-xs hover:bg-muted transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

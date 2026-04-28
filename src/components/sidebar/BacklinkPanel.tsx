import { useBacklinks } from '../../hooks/useBacklinks';
import { useVaultStore } from '../../store/vault';
import { Button } from '../ui/Button';

interface BacklinkPanelProps {
  onOpenNote: (path: string) => void;
}

export function BacklinkPanel({ onOpenNote }: BacklinkPanelProps) {
  const currentNote = useVaultStore((s) => s.currentNote);
  const noteId = currentNote?.frontmatter.id ?? null;
  const { backlinks, isLoading, error } = useBacklinks(noteId);

  if (!currentNote) return null;

  return (
    <div className="flex flex-col border-l border-border w-64 flex-shrink-0">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
          Backlinks
        </span>
        {backlinks.length > 0 && (
          <span className="text-xs text-foreground tabular-nums">{backlinks.length}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {isLoading && (
          <p className="px-4 py-2 text-xs text-foreground animate-pulse-subtle">Loading…</p>
        )}
        {error && !isLoading && (
          <p className="mx-2 px-3 py-2 text-xs text-error-700 bg-error-50 border border-error-200 rounded break-words">
            {error}
          </p>
        )}
        {!isLoading && !error && backlinks.length === 0 && (
          <p className="px-4 py-2 text-xs text-foreground">No notes link here yet.</p>
        )}
        {!isLoading && !error && backlinks.map((item) => (
          <Button
            key={item.id}
            intent="ghost"
            size="sm"
            onClick={() => onOpenNote(item.path)}
            className="w-full justify-start rounded-none font-normal truncate text-foreground hover:bg-muted"
          >
            {item.title || 'Untitled'}
          </Button>
        ))}
      </div>
    </div>
  );
}

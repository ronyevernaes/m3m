import { useBacklinks } from '../../hooks/useBacklinks';
import { useVaultStore } from '../../store/vault';
import { Accordion } from '../ui/Accordion';
import { Button } from '../ui/Button';

interface LinksAndBacklinksTabProps {
  onOpenNote: (path: string) => void;
}

export function LinksAndBacklinksTab({ onOpenNote }: LinksAndBacklinksTabProps) {
  const currentNote = useVaultStore((s) => s.currentNote);
  const notes = useVaultStore((s) => s.notes);
  const noteId = currentNote?.frontmatter.id ?? null;
  const { backlinks, isLoading, error } = useBacklinks(noteId);

  if (!currentNote) return null;

  const { links } = currentNote.frontmatter;
  const resolved = links
    .map((id) => notes.find((n) => n.id === id))
    .filter((n): n is NonNullable<typeof n> => n !== undefined);

  const hasOutgoing = resolved.length > 0;
  const hasBacklinks = isLoading || backlinks.length > 0;
  const isEmpty = !hasOutgoing && !hasBacklinks && !isLoading;

  return (
    <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-1">
      {isEmpty && (
        <p className="px-4 py-2 text-xs text-foreground">No links or backlinks.</p>
      )}
      {hasOutgoing && (
        <Accordion title="Outgoing" count={resolved.length}>
          {resolved.map((note) => (
            <Button
              key={note.id}
              intent="ghost"
              size="sm"
              onClick={() => onOpenNote(note.path)}
              className="w-full justify-start rounded-none font-normal truncate text-foreground hover:bg-muted"
            >
              {note.title || 'Untitled'}
            </Button>
          ))}
        </Accordion>
      )}
      {hasBacklinks && (
        <Accordion title="Backlinks" count={backlinks.length}>
          {isLoading && (
            <p className="px-4 py-2 text-xs text-foreground animate-pulse-subtle">Loading…</p>
          )}
          {error && !isLoading && (
            <p className="mx-2 px-3 py-2 text-xs text-error-700 bg-error-50 border border-error-200 rounded break-words">
              {error}
            </p>
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
        </Accordion>
      )}
    </div>
  );
}

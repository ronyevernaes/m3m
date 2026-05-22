import { useVaultStore } from '../../store/vault';
import { Button } from '../ui/Button';

interface LinksTabProps {
  onOpenNote: (path: string) => void;
}

export function LinksTab({ onOpenNote }: LinksTabProps) {
  const currentNote = useVaultStore((s) => s.currentNote);
  const notes = useVaultStore((s) => s.notes);

  if (!currentNote) return null;

  const { links } = currentNote.frontmatter;
  const resolved = links
    .map((id) => notes.find((n) => n.id === id))
    .filter((n): n is NonNullable<typeof n> => n !== undefined);

  return (
    <div className="flex-1 overflow-y-auto py-2">
      {resolved.length === 0 && (
        <p className="px-4 py-2 text-xs text-foreground">No outgoing links.</p>
      )}
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
    </div>
  );
}

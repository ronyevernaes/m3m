import { useVaultStore } from '../../store/vault';
import { Button } from '../ui/Button';

interface LinksTabProps {
  onOpenNote: (path: string) => void;
}

export function LinksTab({ onOpenNote }: LinksTabProps) {
  const currentNote = useVaultStore((s) => s.currentNote);
  if (!currentNote) return null;

  const { links } = currentNote.frontmatter;

  return (
    <div className="flex-1 overflow-y-auto py-2">
      {links.length === 0 && (
        <p className="px-4 py-2 text-xs text-foreground">No outgoing links.</p>
      )}
      {links.map((path) => {
        const name = path.split('/').pop()?.replace(/\.md$/, '') ?? path;
        return (
          <Button
            key={path}
            intent="ghost"
            size="sm"
            onClick={() => onOpenNote(path)}
            className="w-full justify-start rounded-none font-normal truncate text-foreground hover:bg-muted"
          >
            {name}
          </Button>
        );
      })}
    </div>
  );
}

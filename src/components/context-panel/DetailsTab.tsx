import { useVaultStore } from '../../store/vault';

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function DetailsTab() {
  const currentNote = useVaultStore((s) => s.currentNote);
  if (!currentNote) return null;

  const { frontmatter, body } = currentNote;

  return (
    <div className="flex-1 overflow-y-auto py-3 px-4 space-y-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-foreground/60 uppercase tracking-wide">Words</span>
        <span className="text-xs">{countWords(body)}</span>
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-foreground/60 uppercase tracking-wide">Created</span>
        <span className="text-xs">{formatDate(frontmatter.created)}</span>
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-foreground/60 uppercase tracking-wide">Modified</span>
        <span className="text-xs">{formatDate(frontmatter.modified)}</span>
      </div>

      {frontmatter.tags.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-foreground/60 uppercase tracking-wide">Tags</span>
          <div className="flex flex-wrap gap-1">
            {frontmatter.tags.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 text-xs rounded bg-muted text-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-foreground/60 uppercase tracking-wide">ID</span>
        <span className="text-xs font-mono break-all text-foreground/60">{frontmatter.id}</span>
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-foreground/60 uppercase tracking-wide">Properties</span>
        <span className="text-xs text-foreground/40">Coming soon</span>
      </div>
    </div>
  );
}

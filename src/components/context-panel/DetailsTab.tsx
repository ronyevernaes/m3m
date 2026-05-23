import { useVault } from '../../hooks/useVault';
import { useVaultStore } from '../../store/vault';
import { AddPropertyRow } from './AddPropertyRow';
import { PropertyRow } from './PropertyRow';
import { TagEditorSection } from './TagEditorSection';

const SYSTEM_KEYS = new Set(['id', 'title', 'created', 'modified', 'tags', 'links']);

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
  const { updateCurrentNoteFrontmatterKey, deleteCurrentNoteFrontmatterKey, saveCurrentNote } = useVault();

  if (!currentNote) return null;

  const { frontmatter, body } = currentNote;
  const customEntries = Object.entries(frontmatter).filter(([k]) => !SYSTEM_KEYS.has(k)) as [string, string][];

  function handleValueChange(key: string, value: string) {
    updateCurrentNoteFrontmatterKey(key, value);
    saveCurrentNote();
  }

  function handleDelete(key: string) {
    deleteCurrentNoteFrontmatterKey(key);
    saveCurrentNote();
  }

  function handleAdd(key: string, value: string) {
    updateCurrentNoteFrontmatterKey(key, value);
    saveCurrentNote();
  }

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

      <TagEditorSection />

      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-foreground/60 uppercase tracking-wide">ID</span>
        <span className="text-xs font-mono break-all text-foreground/60">{frontmatter.id}</span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-foreground/60 uppercase tracking-wide">Properties</span>
        {customEntries.length === 0 && (
          <span className="text-xs text-foreground/40">No custom properties</span>
        )}
        {customEntries.map(([key, value]) => (
          <PropertyRow
            key={key}
            propertyKey={key}
            value={String(value)}
            onValueChange={handleValueChange}
            onDelete={handleDelete}
          />
        ))}
        <AddPropertyRow existingKeys={customEntries.map(([k]) => k)} onAdd={handleAdd} />
      </div>
    </div>
  );
}

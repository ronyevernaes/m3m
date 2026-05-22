import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useVaultStore } from '../../store/vault';
import { cn } from '../../lib/cn';

export function WikilinkNodeView({ node, extension }: NodeViewProps) {
  const title = node.attrs.title as string;
  const notes = useVaultStore((s) => s.notes);
  const lower = title.toLowerCase();
  const exists = notes.some((n) => n.title.toLowerCase() === lower);

  const handleClick = () => {
    const note = notes.find((n) => n.title.toLowerCase() === lower);
    if (note) {
      const onNavigate = extension.options.onNavigate as ((path: string) => void) | undefined;
      onNavigate?.(note.path);
    }
  };

  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        onClick={handleClick}
        className={cn(
          'inline-flex items-center rounded px-1 py-0.5 text-sm font-medium cursor-pointer select-none',
          exists
            ? 'bg-brand-100 text-brand-700 hover:bg-brand-200 dark:bg-brand-900 dark:text-brand-300 dark:hover:bg-brand-800'
            : 'bg-muted text-foreground/50 hover:bg-muted/80',
        )}
      >
        [[{title}]]
      </span>
    </NodeViewWrapper>
  );
}

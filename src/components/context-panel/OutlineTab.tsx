import { useMemo } from 'react';
import { useVaultStore } from '../../store/vault';
import { useUiStore } from '../../store/ui';
import { cn } from '../../lib/cn';

interface OutlineHeading {
  level: number;
  text: string;
  sectionKey: string;
}

function parseHeadings(body: string): OutlineHeading[] {
  const result: OutlineHeading[] = [];
  const occurrenceCount = new Map<string, number>();

  for (const line of body.split('\n')) {
    const match = /^(#{1,6})\s+(.+)$/.exec(line);
    if (!match) continue;
    const level = match[1].length;
    const text = match[2].trim();
    const baseKey = `${level}:${text}`;
    const idx = occurrenceCount.get(baseKey) ?? 0;
    occurrenceCount.set(baseKey, idx + 1);
    result.push({ level, text, sectionKey: `${baseKey}:${idx}` });
  }

  return result;
}

const INDENT_CLASS: Record<number, string> = {
  1: 'pl-2',
  2: 'pl-4',
  3: 'pl-6',
  4: 'pl-8',
  5: 'pl-10',
  6: 'pl-12',
};

export function OutlineTab() {
  const body = useVaultStore((s) => s.currentNote?.body ?? '');
  const headings = useMemo(() => parseHeadings(body), [body]);

  function handleClick(sectionKey: string) {
    useUiStore.getState().scrollToHeading?.(sectionKey);
  }

  if (headings.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto py-4 px-4">
        <p className="text-xs text-foreground/40">No headings in this note.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-2">
      {headings.map((h) => (
        <button
          key={h.sectionKey}
          type="button"
          onClick={() => handleClick(h.sectionKey)}
          title={h.text}
          className={cn(
            'w-full text-left py-1 pr-3 text-xs text-foreground hover:text-heading hover:bg-muted transition-colors truncate',
            INDENT_CLASS[h.level] ?? 'pl-2',
          )}
        >
          {h.text}
        </button>
      ))}
    </div>
  );
}

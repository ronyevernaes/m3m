import { useEffect, useMemo } from 'react';
import changelogRaw from '../../../CHANGELOG.md?raw';
import { parseChangelog } from '../../lib/changelog';
import { XIcon } from '../icons/XIcon';
import { cn } from '../../lib/cn';

const SECTION_STYLES: Record<string, string> = {
  Added: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  Fixed: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  Changed: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  Deprecated: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  Removed: 'bg-red-500/15 text-red-600 dark:text-red-400',
  Security: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
};

const DEFAULT_SECTION_STYLE = 'bg-muted text-foreground';

interface ChangelogDialogProps {
  onClose: () => void;
}

export function ChangelogDialog({ onClose }: ChangelogDialogProps) {
  const entries = useMemo(() => parseChangelog(changelogRaw), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-neutral-950/30 flex items-start justify-center z-50 pt-[10vh]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background rounded-2xl shadow-lg w-[600px] max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-heading font-semibold text-lg text-heading">What's New</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close changelog"
            className="p-1.5 rounded-md text-foreground hover:text-heading hover:bg-muted transition-colors"
          >
            <XIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
          {entries.map((entry, i) => (
            <div key={entry.version}>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="font-heading font-semibold text-base text-heading">
                  v{entry.version}
                </span>
                {i === 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-500 text-neutral-50">
                    Latest
                  </span>
                )}
                <span className="text-xs text-foreground/50 ml-auto">{entry.date}</span>
              </div>

              <div className="space-y-4">
                {entry.sections.map((section) => (
                  <div key={section.type}>
                    <span
                      className={cn(
                        'inline-block px-2 py-0.5 rounded text-xs font-medium mb-2',
                        SECTION_STYLES[section.type] ?? DEFAULT_SECTION_STYLE,
                      )}
                    >
                      {section.type}
                    </span>
                    <ul className="list-disc pl-4 space-y-1">
                      {section.items.map((item, j) => (
                        <li key={j} className="text-sm text-foreground leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {i < entries.length - 1 && (
                <hr className="mt-8 border-border" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

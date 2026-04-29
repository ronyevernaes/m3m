import { useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../ui/Button';
import { cn } from '../../lib/cn';
import type { VaultEntry } from '../../types/vault';

interface VaultPopoverProps {
  vaults: VaultEntry[];
  activeVaultId: string | null;
  onClose: () => void;
  onSwitch: (id: string) => void;
  onRename: (id: string, name: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onReveal: (path: string) => void;
  onCreateNew: () => void;
  onOpenExisting: () => void;
}

export function VaultPopover({
  vaults,
  activeVaultId,
  onClose,
  onSwitch,
  onRename,
  onRemove,
  onReveal,
  onCreateNew,
  onOpenExisting,
}: VaultPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [onClose]);

  function startRename(entry: VaultEntry) {
    setRenamingId(entry.id);
    setRenameValue(entry.name);
    setExpandedId(null);
  }

  async function commitRename(id: string) {
    if (renameValue.trim()) await onRename(id, renameValue.trim());
    setRenamingId(null);
  }

  function formatLastOpened(iso: string) {
    try {
      return formatDistanceToNow(new Date(iso), { addSuffix: true });
    } catch {
      return iso;
    }
  }

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-0 mt-1 w-72 rounded-lg border border-border bg-background shadow-lg z-50 overflow-hidden"
    >
      <ul className="py-1">
        {vaults.map((entry) => (
          <li key={entry.id}>
            {renamingId === entry.id ? (
              <div className="flex items-center gap-2 px-3 py-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <input
                  autoFocus
                  className="flex-1 text-sm px-2 py-0.5 rounded border border-border bg-background text-heading focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(entry.id);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  onBlur={() => commitRename(entry.id)}
                />
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors',
                    entry.id === activeVaultId && 'bg-accent-subtle',
                  )}
                >
                  <button
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    onClick={() => {
                      onSwitch(entry.id);
                      onClose();
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <div className="flex flex-col min-w-0">
                      <span
                        className={cn(
                          'text-sm font-medium truncate',
                          entry.id === activeVaultId ? 'text-accent' : 'text-heading',
                        )}
                      >
                        {entry.name}
                      </span>
                      <span className="text-xs text-foreground truncate">
                        {formatLastOpened(entry.lastOpened)}
                      </span>
                    </div>
                  </button>
                  <button
                    className="flex-shrink-0 p-1 rounded text-foreground hover:text-heading hover:bg-muted"
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    title="More actions"
                  >
                    <DotsIcon />
                  </button>
                </div>

                {expandedId === entry.id && (
                  <div className="flex gap-1 px-3 pb-2">
                    <Button
                      intent="ghost"
                      size="sm"
                      onClick={() => startRename(entry)}
                    >
                      Rename
                    </Button>
                    <Button
                      intent="ghost"
                      size="sm"
                      onClick={() => onReveal(entry.path)}
                    >
                      Reveal
                    </Button>
                    <Button
                      intent="danger"
                      size="sm"
                      onClick={() => {
                        onRemove(entry.id);
                        setExpandedId(null);
                        onClose();
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="border-t border-border px-3 py-2 flex gap-2">
        <Button intent="ghost" size="sm" className="flex-1" onClick={() => { onCreateNew(); onClose(); }}>
          + Create new
        </Button>
        <Button intent="ghost" size="sm" className="flex-1" onClick={() => { onOpenExisting(); onClose(); }}>
          Open folder
        </Button>
      </div>
    </div>
  );
}

function DotsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="3" cy="8" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="13" cy="8" r="1.5" />
    </svg>
  );
}

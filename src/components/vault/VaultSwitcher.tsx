import { useEffect, useRef, useState } from 'react';
import { VaultPopover } from './VaultPopover';
import type { VaultEntry } from '../../types/vault';

interface VaultSwitcherProps {
  vaults: VaultEntry[];
  activeVaultId: string | null;
  onSwitch: (id: string) => void;
  onRename: (id: string, name: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onReveal: (path: string) => void;
  onCreateNew: () => void;
  onOpenExisting: () => void;
}

export function VaultSwitcher({
  vaults,
  activeVaultId,
  onSwitch,
  onRename,
  onRemove,
  onReveal,
  onCreateNew,
  onOpenExisting,
}: VaultSwitcherProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const activeVault = vaults.find((v) => v.id === activeVaultId);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div ref={wrapperRef} className="relative flex items-center min-w-0">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 text-sm font-semibold text-heading hover:text-accent transition-colors min-w-0"
        title="Switch vault (⌘⇧V)"
      >
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: activeVault?.color ?? '#a855f7' }}
        />
        <span className="truncate">{activeVault?.name ?? 'm3m'}</span>
        <ChevronDownIcon className={open ? 'rotate-180' : ''} />
      </button>

      {open && (
        <VaultPopover
          vaults={vaults}
          activeVaultId={activeVaultId}
          onClose={() => setOpen(false)}
          onSwitch={onSwitch}
          onRename={onRename}
          onRemove={onRemove}
          onReveal={onReveal}
          onCreateNew={onCreateNew}
          onOpenExisting={onOpenExisting}
        />
      )}
    </div>
  );
}

function ChevronDownIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="currentColor"
      className={`flex-shrink-0 transition-transform duration-150 ${className}`}
    >
      <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

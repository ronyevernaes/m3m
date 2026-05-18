import { useEffect, useState } from 'react';
import { XIcon } from '../icons/XIcon';
import { GlobalSettingsPanel } from './GlobalSettingsPanel';
import { VaultSettingsPanel } from './VaultSettingsPanel';
import { cn } from '../../lib/cn';

type Tab = 'app' | 'vault';

const TABS: { id: Tab; label: string }[] = [
  { id: 'app', label: 'App' },
  { id: 'vault', label: 'Vault' },
];

interface SettingsDialogProps {
  onClose: () => void;
}

export function SettingsDialog({ onClose }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<Tab>('app');

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-neutral-950/30 flex items-center justify-center z-50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background rounded-2xl shadow-lg w-[520px] max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-heading font-semibold text-lg text-heading">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 rounded-md text-foreground hover:text-heading hover:bg-muted transition-colors"
          >
            <XIcon />
          </button>
        </div>

        <div className="flex border-b border-border flex-shrink-0 px-6">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeTab === id
                  ? 'border-brand-500 text-heading'
                  : 'border-transparent text-foreground hover:text-heading',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeTab === 'app' ? <GlobalSettingsPanel /> : <VaultSettingsPanel />}
        </div>
      </div>
    </div>
  );
}

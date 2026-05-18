import { useEffect } from 'react';
import { XIcon } from '../icons/XIcon';
import { GlobalSettingsPanel } from './GlobalSettingsPanel';

interface SettingsDialogProps {
  onClose: () => void;
}

export function SettingsDialog({ onClose }: SettingsDialogProps) {
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
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <GlobalSettingsPanel />
        </div>
      </div>
    </div>
  );
}

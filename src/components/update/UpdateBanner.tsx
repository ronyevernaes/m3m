import type { Update } from '@tauri-apps/plugin-updater';
import { Button } from '../ui/Button';

interface UpdateBannerProps {
  update: Update;
  isInstalling: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export function UpdateBanner({ update, isInstalling, onInstall, onDismiss }: UpdateBannerProps) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-between gap-4 px-4 py-3 bg-brand-500 text-neutral-50 text-sm">
      <span>
        A new version is available: <strong>{update.version}</strong>
      </span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          intent="ghost"
          size="sm"
          onClick={onDismiss}
          disabled={isInstalling}
          className="text-neutral-50 hover:bg-brand-600 hover:text-neutral-50"
        >
          Dismiss
        </Button>
        <Button
          intent="secondary"
          size="sm"
          onClick={onInstall}
          disabled={isInstalling}
        >
          {isInstalling ? 'Installing…' : 'Install & Restart'}
        </Button>
      </div>
    </div>
  );
}

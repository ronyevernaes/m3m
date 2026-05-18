import { useState, useEffect, useCallback, useRef } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

interface UpdaterState {
  update: Update | null;
  isInstalling: boolean;
  dismissed: boolean;
  install: () => Promise<void>;
  dismiss: () => void;
}

export function useUpdater(): UpdaterState {
  const [update, setUpdate] = useState<Update | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    const timer = setTimeout(async () => {
      try {
        const available = await check();
        if (available?.available) setUpdate(available);
      } catch {
        // no network or endpoint unavailable — fail silently
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const install = useCallback(async () => {
    if (!update) return;
    setIsInstalling(true);
    try {
      await update.downloadAndInstall();
      await relaunch();
    } catch {
      setIsInstalling(false);
    }
  }, [update]);

  const dismiss = useCallback(() => setDismissed(true), []);

  return { update, isInstalling, dismissed, install, dismiss };
}

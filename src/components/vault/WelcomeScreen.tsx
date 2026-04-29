import { useState } from 'react';
import { Button } from '../ui/Button';
import { pickFolder } from '../../lib/ipc';
import type { VaultEntry } from '../../types/vault';

interface WelcomeScreenProps {
  onCreateNew: (name: string, path: string) => Promise<VaultEntry>;
  onOpenExisting: () => Promise<VaultEntry | null>;
}

type Step = 'idle' | 'naming';

export function WelcomeScreen({ onCreateNew, onOpenExisting }: WelcomeScreenProps) {
  const [step, setStep] = useState<Step>('idle');
  const [pickedPath, setPickedPath] = useState('');
  const [vaultName, setVaultName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePickForCreate() {
    setBusy(true);
    setError(null);
    try {
      const path = await pickFolder();
      if (!path) return;
      const defaultName = path.split('/').pop() ?? path.split('\\').pop() ?? 'My Vault';
      setPickedPath(path);
      setVaultName(defaultName);
      setStep('naming');
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    if (!vaultName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onCreateNew(vaultName.trim(), pickedPath);
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  }

  async function handleOpenExisting() {
    setBusy(true);
    setError(null);
    try {
      await onOpenExisting();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full px-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <span className="text-3xl font-heading font-bold text-heading">m3m</span>
          <p className="text-sm text-foreground">
            Local-first markdown knowledge base
          </p>
        </div>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2 w-full">
            {error}
          </p>
        )}

        {step === 'idle' && (
          <div className="flex flex-col gap-3 w-full">
            <Button
              intent="primary"
              size="lg"
              className="w-full"
              onClick={handlePickForCreate}
              disabled={busy}
            >
              Create new vault
            </Button>
            <Button
              intent="secondary"
              size="lg"
              className="w-full"
              onClick={handleOpenExisting}
              disabled={busy}
            >
              Open existing folder
            </Button>
          </div>
        )}

        {step === 'naming' && (
          <div className="flex flex-col gap-3 w-full">
            <div className="flex flex-col gap-1 text-left">
              <label className="text-xs font-medium text-foreground">Vault name</label>
              <input
                autoFocus
                className="w-full px-3 py-2 text-sm rounded border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={vaultName}
                onChange={(e) => setVaultName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <p className="text-xs text-foreground truncate text-left" title={pickedPath}>
              {pickedPath}
            </p>
            <div className="flex gap-2">
              <Button
                intent="secondary"
                size="md"
                className="flex-1"
                onClick={() => setStep('idle')}
                disabled={busy}
              >
                Back
              </Button>
              <Button
                intent="primary"
                size="md"
                className="flex-1"
                onClick={handleCreate}
                disabled={busy || !vaultName.trim()}
              >
                Create
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

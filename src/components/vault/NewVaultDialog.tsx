import { useState } from 'react';
import { Button } from '../ui/Button';
import { FieldLabel } from '../ui/FieldLabel';
import { FormInput } from '../ui/FormInput';
import { ColorSwatch } from './ColorSwatch';
import { pickFolder } from '../../lib/ipc';

const PRESET_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#6b7280'];

interface NewVaultDialogProps {
  onConfirm: (name: string, path: string, color: string) => Promise<void>;
  onCancel: () => void;
}

export function NewVaultDialog({ onConfirm, onCancel }: NewVaultDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [path, setPath] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBrowse() {
    setBusy(true);
    try {
      const picked = await pickFolder();
      if (!picked) return;
      setPath(picked);
      if (!name) setName(picked.split('/').pop() ?? picked.split('\\').pop() ?? '');
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    if (!name.trim() || !path) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(name.trim(), path, color);
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-neutral-950/30 flex items-center justify-center z-50">
      <div className="bg-background rounded-2xl p-8 w-120 shadow-lg flex flex-col gap-6">

        <h2 className="font-heading font-bold text-xl text-center text-heading">New vault</h2>

        {error && (
          <p className="text-xs text-error-600 bg-error-50 border border-error-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <FieldLabel>Name</FieldLabel>
          <FormInput
            autoFocus
            placeholder="My notes"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel>Color</FieldLabel>
          <div className="flex gap-3">
            {PRESET_COLORS.map((c) => (
              <ColorSwatch key={c} color={c} selected={color === c} onSelect={setColor} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel>Location</FieldLabel>
          <div className="flex gap-2">
            <FormInput className="flex-1 truncate" placeholder="~/Documents/notes" value={path} readOnly />
            <Button intent="secondary" size="md" onClick={handleBrowse} disabled={busy}>
              …
            </Button>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button intent="secondary" size="lg" className="flex-1" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            intent="primary"
            size="lg"
            className="flex-1"
            onClick={handleCreate}
            disabled={busy || !name.trim() || !path}
          >
            Create vault
          </Button>
        </div>

      </div>
    </div>
  );
}

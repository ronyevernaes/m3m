import { useState } from 'react';
import { useVaultStore } from '../../store/vault';
import { useVaultSettingsStore } from '../../store/vaultSettings';
import { useVaultRegistry } from '../../hooks/useVaultRegistry';
import { ColorSwatch } from '../vault/ColorSwatch';
import { cn } from '../../lib/cn';

const PRESET_COLORS = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

const AUTOSAVE_OPTIONS: { value: number; label: string }[] = [
  { value: 500, label: '0.5s' },
  { value: 1000, label: '1s' },
  { value: 2000, label: '2s' },
  { value: 5000, label: '5s' },
];

export function VaultSettingsPanel() {
  const { vaults, activeVaultId, vaultPath } = useVaultStore();
  const { vaultSettings, updateVaultSettings } = useVaultSettingsStore();
  const { renameVaultEntry, updateVaultColorEntry } = useVaultRegistry();

  const activeVault = vaults.find((v) => v.id === activeVaultId) ?? null;

  const [nameInput, setNameInput] = useState('');
  const [editingName, setEditingName] = useState(false);

  if (!activeVault || !vaultPath) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-foreground">
        Open a vault to configure vault settings.
      </div>
    );
  }

  function handleNameFocus() {
    setNameInput(activeVault!.name);
    setEditingName(true);
  }

  async function commitName() {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== activeVault!.name) {
      await renameVaultEntry(activeVault!.id, trimmed);
    }
    setEditingName(false);
  }

  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') e.currentTarget.blur();
    if (e.key === 'Escape') {
      setEditingName(false);
      setNameInput(activeVault!.name);
    }
  }

  async function handleColorSelect(color: string) {
    await updateVaultColorEntry(activeVault!.id, color);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">Identity</h3>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-heading">Vault name</label>
          <input
            type="text"
            value={editingName ? nameInput : activeVault.name}
            onFocus={handleNameFocus}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={commitName}
            onKeyDown={handleNameKeyDown}
            className="px-3 py-1.5 text-sm rounded-md border border-border bg-background text-heading placeholder:text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-heading">Color</label>
          <div className="flex gap-2">
            {PRESET_COLORS.map((color) => (
              <ColorSwatch
                key={color}
                color={color}
                selected={activeVault.color === color}
                onSelect={handleColorSelect}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">Editor</h3>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-heading">Autosave delay</label>
          <div className="flex rounded-md border border-border overflow-hidden">
            {AUTOSAVE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => updateVaultSettings(vaultPath, { autosaveDelayMs: value })}
                className={cn(
                  'flex-1 px-3 py-1.5 text-sm transition-colors',
                  vaultSettings.autosaveDelayMs === value
                    ? 'bg-brand-500 text-neutral-50'
                    : 'bg-background text-foreground hover:bg-muted',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-heading">Line width</label>
            <span className="text-xs text-foreground">{vaultSettings.lineWidth} chars</span>
          </div>
          <input
            type="range"
            min={40}
            max={200}
            step={10}
            value={vaultSettings.lineWidth}
            onChange={(e) => updateVaultSettings(vaultPath, { lineWidth: Number(e.target.value) })}
            className="w-full accent-brand-500"
          />
          <div className="flex justify-between text-xs text-foreground">
            <span>Narrow (40)</span>
            <span>Wide (200)</span>
          </div>
        </div>
      </section>
    </div>
  );
}

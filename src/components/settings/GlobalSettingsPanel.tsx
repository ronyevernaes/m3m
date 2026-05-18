import { useSettingsStore } from '../../store/settings';
import { pickFolder } from '../../lib/ipc';
import { cn } from '../../lib/cn';
import type { Theme, EditorFontSize } from '../../types/settings';

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const FONT_SIZES: { value: EditorFontSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'x-large', label: 'Extra-Large' },
];

export function GlobalSettingsPanel() {
  const { settings, updateSettings } = useSettingsStore();

  async function handleBrowseDefaultLocation() {
    const path = await pickFolder();
    if (path) await updateSettings({ defaultVaultLocation: path });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">Appearance</h3>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-heading">Theme</label>
          <div className="flex rounded-md border border-border overflow-hidden">
            {THEMES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => updateSettings({ theme: value })}
                className={cn(
                  'flex-1 px-3 py-1.5 text-sm transition-colors',
                  settings.theme === value
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
          <label className="text-sm font-medium text-heading">Editor font size</label>
          <div className="flex rounded-md border border-border overflow-hidden">
            {FONT_SIZES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => updateSettings({ editorFontSize: value })}
                className={cn(
                  'flex-1 px-2 py-1.5 text-sm transition-colors',
                  settings.editorFontSize === value
                    ? 'bg-brand-500 text-neutral-50'
                    : 'bg-background text-foreground hover:bg-muted',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">Behaviour</h3>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-heading">Restore last vault on launch</span>
            <span className="text-xs text-foreground">Automatically reopens the previously active vault</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.restoreLastVault}
            onClick={() => updateSettings({ restoreLastVault: !settings.restoreLastVault })}
            className={cn(
              'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
              settings.restoreLastVault ? 'bg-brand-500' : 'bg-border',
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
                settings.restoreLastVault ? 'translate-x-4' : 'translate-x-0',
              )}
            />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-heading">Default vault location</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={settings.defaultVaultLocation ?? ''}
              placeholder="Choose a default folder..."
              className="flex-1 px-3 py-1.5 text-sm rounded-md border border-border bg-muted text-heading placeholder:text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-default"
            />
            <button
              type="button"
              onClick={handleBrowseDefaultLocation}
              className="px-3 py-1.5 text-sm rounded-md border border-border bg-background text-heading hover:bg-muted transition-colors"
            >
              Browse
            </button>
            {settings.defaultVaultLocation && (
              <button
                type="button"
                onClick={() => updateSettings({ defaultVaultLocation: null })}
                className="px-3 py-1.5 text-sm rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

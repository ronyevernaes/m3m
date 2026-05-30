export type Theme = 'light' | 'dark' | 'system';
export type EditorFontSize = 'small' | 'medium' | 'large' | 'x-large';
export type EditorFontFamily = 'inter' | 'lora' | 'mono' | 'system';

export interface AppSettings {
  theme: Theme;
  editorFontSize: EditorFontSize;
  editorFontFamily: EditorFontFamily;
  restoreLastVault: boolean;
  defaultVaultLocation: string | null;
}

export const FONT_SIZE_PX: Record<EditorFontSize, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
  'x-large': '20px',
};

export const FONT_FAMILY_CSS: Record<EditorFontFamily, string> = {
  inter: "'Inter', ui-sans-serif, system-ui, sans-serif",
  lora: "'Lora', ui-serif, Georgia, serif",
  mono: "'JetBrains Mono', ui-monospace, Menlo, monospace",
  system: 'system-ui, ui-sans-serif, sans-serif',
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  editorFontSize: 'medium',
  editorFontFamily: 'inter',
  restoreLastVault: true,
  defaultVaultLocation: null,
};

export interface VaultSettings {
  autosaveDelayMs: number;
  lineWidth: number;
}

export const DEFAULT_VAULT_SETTINGS: VaultSettings = {
  autosaveDelayMs: 2000,
  lineWidth: 80,
};

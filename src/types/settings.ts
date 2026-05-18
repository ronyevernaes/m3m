export type Theme = 'light' | 'dark' | 'system';
export type EditorFontSize = 'small' | 'medium' | 'large' | 'x-large';

export interface AppSettings {
  theme: Theme;
  editorFontSize: EditorFontSize;
  restoreLastVault: boolean;
  defaultVaultLocation: string | null;
}

export const FONT_SIZE_PX: Record<EditorFontSize, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
  'x-large': '20px',
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  editorFontSize: 'medium',
  restoreLastVault: true,
  defaultVaultLocation: null,
};

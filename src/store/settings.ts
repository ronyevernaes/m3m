import { create } from 'zustand';
import { getSettings, saveSettings } from '../lib/ipc';
import type { AppSettings } from '../types/settings';
import { DEFAULT_SETTINGS } from '../types/settings';

interface SettingsStore {
  settings: AppSettings;
  loaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  loadSettings: async () => {
    const settings = await getSettings();
    set({ settings, loaded: true });
  },

  updateSettings: async (patch) => {
    const next = { ...get().settings, ...patch };
    set({ settings: next });
    await saveSettings(next);
  },
}));

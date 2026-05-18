import { create } from 'zustand';
import { getVaultSettings, saveVaultSettings } from '../lib/ipc';
import type { VaultSettings } from '../types/settings';
import { DEFAULT_VAULT_SETTINGS } from '../types/settings';

interface VaultSettingsStore {
  vaultSettings: VaultSettings;
  loaded: boolean;
  loadVaultSettings: (vaultPath: string) => Promise<void>;
  updateVaultSettings: (vaultPath: string, patch: Partial<VaultSettings>) => Promise<void>;
  reset: () => void;
}

export const useVaultSettingsStore = create<VaultSettingsStore>((set, get) => ({
  vaultSettings: DEFAULT_VAULT_SETTINGS,
  loaded: false,

  loadVaultSettings: async (vaultPath) => {
    const vaultSettings = await getVaultSettings(vaultPath);
    set({ vaultSettings, loaded: true });
  },

  updateVaultSettings: async (vaultPath, patch) => {
    const next = { ...get().vaultSettings, ...patch };
    set({ vaultSettings: next });
    await saveVaultSettings(vaultPath, next);
  },

  reset: () => set({ vaultSettings: DEFAULT_VAULT_SETTINGS, loaded: false }),
}));

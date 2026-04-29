import { useCallback } from 'react';
import {
  listVaults,
  createVault,
  registerVault,
  renameVault,
  removeVault,
  revealVault,
  pickFolder,
  openVault,
} from '../lib/ipc';
import { useVaultStore } from '../store/vault';
import type { VaultEntry } from '../types/vault';

const PRESET_COLORS = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export function useVaultRegistry() {
  const store = useVaultStore();

  const loadVaults = useCallback(async () => {
    store.setRegistryLoading(true);
    try {
      const { vaults, lastActiveVault } = await listVaults();
      store.setVaults(vaults);
      if (lastActiveVault) {
        const entry = vaults.find((v) => v.id === lastActiveVault);
        if (entry) {
          store.setVaultPath(entry.path);
          store.setActiveVaultId(entry.id);
        }
      }
    } finally {
      store.setRegistryLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const createNewVault = useCallback(async (name: string, path: string): Promise<VaultEntry> => {
    const color = PRESET_COLORS[store.vaults.length % PRESET_COLORS.length];
    const entry = await createVault(name, path, color);
    store.upsertVault(entry);
    store.setActiveVaultId(entry.id);
    store.setVaultPath(entry.path);
    return entry;
  }, [store.vaults.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const openExistingVault = useCallback(async (): Promise<VaultEntry | null> => {
    const path = await pickFolder();
    if (!path) return null;
    const entry = await registerVault(path);
    store.upsertVault(entry);
    store.setActiveVaultId(entry.id);
    store.setVaultPath(entry.path);
    return entry;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const switchVault = useCallback(async (id: string) => {
    const entry = useVaultStore.getState().vaults.find((v) => v.id === id);
    if (!entry) return;
    store.setCurrentNote(null);
    store.setActiveVaultId(id);
    store.setVaultPath(entry.path);
    await openVault(entry.path);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const renameVaultEntry = useCallback(async (id: string, name: string) => {
    await renameVault(id, name);
    const entry = useVaultStore.getState().vaults.find((v) => v.id === id);
    if (entry) store.upsertVault({ ...entry, name });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const removeVaultEntry = useCallback(async (id: string) => {
    await removeVault(id);
    store.removeVaultById(id);
    if (useVaultStore.getState().activeVaultId === id) {
      store.setActiveVaultId(null);
      store.setVaultPath(null);
      store.setCurrentNote(null);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const revealVaultEntry = useCallback((path: string) => revealVault(path), []);

  return {
    vaults: store.vaults,
    activeVaultId: store.activeVaultId,
    registryLoading: store.registryLoading,
    loadVaults,
    createNewVault,
    openExistingVault,
    switchVault,
    renameVaultEntry,
    removeVaultEntry,
    revealVaultEntry,
  };
}

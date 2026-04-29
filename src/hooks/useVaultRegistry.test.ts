import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVaultRegistry } from './useVaultRegistry';
import { useVaultStore } from '../store/vault';
import type { VaultEntry, VaultList } from '../types/vault';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
const mockInvoke = vi.mocked(invoke);

const ENTRY_A: VaultEntry = {
  id: 'AAA',
  name: 'Work',
  path: '/work',
  lastOpened: '2025-01-01T00:00:00Z',
  color: '#a855f7',
};

const ENTRY_B: VaultEntry = {
  id: 'BBB',
  name: 'Personal',
  path: '/personal',
  lastOpened: '2025-01-02T00:00:00Z',
  color: '#3b82f6',
};

beforeEach(() => {
  vi.clearAllMocks();
  useVaultStore.setState({
    vaultPath: null,
    notes: [],
    currentNote: null,
    isDirty: false,
    isLoading: false,
    error: null,
    vaults: [],
    activeVaultId: null,
    registryLoading: true,
  });
});

describe('useVaultRegistry', () => {
  it('loadVaults populates store from list_vaults response', async () => {
    const mockList: VaultList = { vaults: [ENTRY_A, ENTRY_B], lastActiveVault: null };
    mockInvoke.mockResolvedValueOnce(mockList);

    const { result } = renderHook(() => useVaultRegistry());
    await act(async () => {
      await result.current.loadVaults();
    });

    expect(result.current.vaults).toHaveLength(2);
    expect(result.current.registryLoading).toBe(false);
  });

  it('loadVaults auto-switches to lastActiveVault', async () => {
    const mockList: VaultList = { vaults: [ENTRY_A, ENTRY_B], lastActiveVault: 'BBB' };
    mockInvoke.mockResolvedValueOnce(mockList);

    const { result } = renderHook(() => useVaultRegistry());
    await act(async () => {
      await result.current.loadVaults();
    });

    expect(result.current.activeVaultId).toBe('BBB');
    expect(useVaultStore.getState().vaultPath).toBe('/personal');
  });

  it('openExistingVault calls pick_folder then register_vault and updates store', async () => {
    mockInvoke
      .mockResolvedValueOnce('/picked/folder') // pick_folder
      .mockResolvedValueOnce(ENTRY_A);          // register_vault

    const { result } = renderHook(() => useVaultRegistry());
    let entry: VaultEntry | null = null;
    await act(async () => {
      entry = await result.current.openExistingVault();
    });

    expect(mockInvoke).toHaveBeenCalledWith('pick_folder');
    expect(mockInvoke).toHaveBeenCalledWith('register_vault', { path: '/picked/folder' });
    expect(entry?.id).toBe('AAA');
    expect(result.current.activeVaultId).toBe('AAA');
  });

  it('openExistingVault returns null when picker is cancelled', async () => {
    mockInvoke.mockResolvedValueOnce(null); // pick_folder → cancelled

    const { result } = renderHook(() => useVaultRegistry());
    let entry: VaultEntry | null | undefined;
    await act(async () => {
      entry = await result.current.openExistingVault();
    });

    expect(entry).toBeNull();
    expect(mockInvoke).not.toHaveBeenCalledWith('register_vault', expect.anything());
  });

  it('switchVault sets vaultPath and activeVaultId', async () => {
    useVaultStore.setState({ vaults: [ENTRY_A, ENTRY_B] });
    mockInvoke.mockResolvedValueOnce(2); // open_vault

    const { result } = renderHook(() => useVaultRegistry());
    await act(async () => {
      await result.current.switchVault('BBB');
    });

    expect(mockInvoke).toHaveBeenCalledWith('open_vault', { vaultPath: '/personal' });
    expect(result.current.activeVaultId).toBe('BBB');
    expect(useVaultStore.getState().vaultPath).toBe('/personal');
  });

  it('renameVaultEntry updates name in store without changing path', async () => {
    useVaultStore.setState({ vaults: [ENTRY_A] });
    mockInvoke.mockResolvedValueOnce(undefined); // rename_vault

    const { result } = renderHook(() => useVaultRegistry());
    await act(async () => {
      await result.current.renameVaultEntry('AAA', 'Renamed');
    });

    expect(result.current.vaults[0].name).toBe('Renamed');
    expect(result.current.vaults[0].path).toBe('/work');
  });

  it('removeVaultEntry removes entry and clears active if it was active', async () => {
    useVaultStore.setState({ vaults: [ENTRY_A, ENTRY_B], activeVaultId: 'AAA' });
    mockInvoke.mockResolvedValueOnce(undefined); // remove_vault

    const { result } = renderHook(() => useVaultRegistry());
    await act(async () => {
      await result.current.removeVaultEntry('AAA');
    });

    expect(result.current.vaults).toHaveLength(1);
    expect(result.current.vaults[0].id).toBe('BBB');
    expect(result.current.activeVaultId).toBeNull();
    expect(useVaultStore.getState().vaultPath).toBeNull();
  });
});

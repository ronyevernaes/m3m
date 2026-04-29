import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVault } from './useVault';
import { useVaultStore } from '../store/vault';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
const mockInvoke = vi.mocked(invoke);

const NOTE_CONTENT = `---
id: 01ARZ3NDEKTSV4RRFFQ69G5FAV
title: Test Note
created: '2026-01-01T00:00:00.000Z'
modified: '2026-01-01T00:00:00.000Z'
tags: []
links: []
---

Hello world
`;

beforeEach(() => {
  vi.clearAllMocks();
  useVaultStore.setState({
    vaultPath: '/vault',
    notes: [],
    currentNote: null,
    isDirty: false,
    isLoading: false,
    error: null,
  });
});

describe('useVault', () => {
  it('openNote calls invoke read_note and sets currentNote', async () => {
    mockInvoke.mockResolvedValueOnce({ path: '/vault/test.md', content: NOTE_CONTENT });

    const { result } = renderHook(() => useVault());
    await act(async () => {
      await result.current.openNote('/vault/test.md');
    });

    expect(mockInvoke).toHaveBeenCalledWith('read_note', { path: '/vault/test.md' });
    expect(result.current.currentNote?.frontmatter.title).toBe('Test Note');
  });

  it('loadNotes calls invoke list_notes', async () => {
    mockInvoke.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useVault());
    await act(async () => {
      await result.current.loadNotes();
    });

    expect(mockInvoke).toHaveBeenCalledWith('list_notes', { vaultPath: '/vault' });
  });

  it('saveCurrentNote calls invoke write_note with serialized content', async () => {
    useVaultStore.setState({
      currentNote: {
        path: '/vault/test.md',
        frontmatter: {
          id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
          title: 'Test',
          created: '2026-01-01T00:00:00.000Z',
          modified: '2026-01-01T00:00:00.000Z',
          tags: [],
          links: [],
        },
        body: 'Hello',
      },
      isDirty: true,
      vaultPath: '/vault',
    });

    mockInvoke
      .mockResolvedValueOnce(undefined)          // rename_note (title slug differs from current filename)
      .mockResolvedValueOnce('/vault/test-q69g5fav.md') // write_note
      .mockResolvedValueOnce([]);                // list_notes

    const { result } = renderHook(() => useVault());
    await act(async () => {
      await result.current.saveCurrentNote();
    });

    expect(mockInvoke).toHaveBeenCalledWith('write_note', expect.objectContaining({ content: expect.stringContaining('title: Test') }));
    expect(result.current.isDirty).toBe(false);
  });
});

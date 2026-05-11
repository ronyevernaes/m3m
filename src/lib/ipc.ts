import { invoke } from '@tauri-apps/api/core';
import type { NoteListItem, SearchResult, BacklinkItem } from '../types/note';
import type { VaultEntry, VaultList } from '../types/vault';

export const listNotes = (vaultPath: string) =>
  invoke<NoteListItem[]>('list_notes', { vaultPath });

export const readNote = (path: string) =>
  invoke<{ path: string; content: string }>('read_note', { path });

export const writeNote = (path: string, content: string) =>
  invoke<string>('write_note', { path, content });

export const createNote = (vaultPath: string, title: string) =>
  invoke<{ path: string; content: string }>('create_note', { vaultPath, title });

export const renameNote = (oldPath: string, newPath: string) =>
  invoke<void>('rename_note', { oldPath, newPath });

export const deleteNote = (path: string) =>
  invoke<void>('delete_note', { path });

export const openVault = (vaultPath: string) =>
  invoke<number>('open_vault', { vaultPath });

export const searchNotes = (query: string, limit = 20) =>
  invoke<SearchResult[]>('search_notes', { query, limit });

export const getBacklinks = (noteId: string) =>
  invoke<BacklinkItem[]>('get_backlinks', { noteId });

export const listVaults = () =>
  invoke<VaultList>('list_vaults');

export const createVault = (name: string, path: string, color: string) =>
  invoke<VaultEntry>('create_vault', { name, path, color });

export const registerVault = (path: string) =>
  invoke<VaultEntry>('register_vault', { path });

export const renameVault = (id: string, name: string) =>
  invoke<void>('rename_vault', { id, name });

export const removeVault = (id: string) =>
  invoke<void>('remove_vault', { id });

export const closeVault = () =>
  invoke<void>('close_vault');

export const revealVault = (path: string) =>
  invoke<void>('reveal_vault', { path });

export const pickFolder = () =>
  invoke<string | null>('pick_folder');

import { invoke } from '@tauri-apps/api/core';
import type { NoteListItem } from '../types/note';

export const listNotes = (vaultPath: string) =>
  invoke<NoteListItem[]>('list_notes', { vaultPath });

export const readNote = (path: string) =>
  invoke<{ path: string; content: string }>('read_note', { path });

export const writeNote = (path: string, content: string) =>
  invoke<string>('write_note', { path, content });

export const createNote = (vaultPath: string, title: string) =>
  invoke<{ path: string; content: string }>('create_note', { vaultPath, title });

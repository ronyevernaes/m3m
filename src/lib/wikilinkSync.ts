import type { NoteListItem } from '../types/note';

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

export function extractWikilinkTitles(body: string): string[] {
  const titles: string[] = [];
  for (const match of body.matchAll(WIKILINK_RE)) {
    const title = match[1].trim();
    if (title) titles.push(title);
  }
  return titles;
}

export function resolveLinksToIds(titles: string[], notes: NoteListItem[]): string[] {
  const ids: string[] = [];
  for (const title of titles) {
    const lower = title.toLowerCase();
    const note = notes.find((n) => n.title.toLowerCase() === lower);
    if (note?.id) ids.push(note.id);
  }
  return [...new Set(ids)];
}

import { describe, it, expect } from 'vitest';
import { extractWikilinkTitles, resolveLinksToIds } from './wikilinkSync';
import type { NoteListItem } from '../types/note';

function makeNote(id: string, title: string): NoteListItem {
  return { id, title, path: `${title.toLowerCase()}.md`, modified: '', tags: [] };
}

describe('extractWikilinkTitles', () => {
  it('returns empty array when no wikilinks', () => {
    expect(extractWikilinkTitles('plain text')).toEqual([]);
  });

  it('extracts a single wikilink', () => {
    expect(extractWikilinkTitles('see [[My Note]] for details')).toEqual(['My Note']);
  });

  it('extracts multiple wikilinks', () => {
    expect(extractWikilinkTitles('[[A]] and [[B]] and [[C]]')).toEqual(['A', 'B', 'C']);
  });

  it('trims whitespace inside brackets', () => {
    expect(extractWikilinkTitles('[[ Spaced Title ]]')).toEqual(['Spaced Title']);
  });

  it('ignores empty brackets', () => {
    expect(extractWikilinkTitles('[[]]')).toEqual([]);
  });

  it('handles wikilinks across multiple lines', () => {
    expect(extractWikilinkTitles('First line [[A]]\nSecond line [[B]]')).toEqual(['A', 'B']);
  });
});

describe('resolveLinksToIds', () => {
  const notes = [
    makeNote('id-alpha', 'Alpha Note'),
    makeNote('id-beta', 'Beta Note'),
    makeNote('id-gamma', 'Gamma Note'),
  ];

  it('resolves exact title match', () => {
    expect(resolveLinksToIds(['Alpha Note'], notes)).toEqual(['id-alpha']);
  });

  it('resolves case-insensitively', () => {
    expect(resolveLinksToIds(['alpha note'], notes)).toEqual(['id-alpha']);
  });

  it('drops unresolved titles', () => {
    expect(resolveLinksToIds(['Nonexistent'], notes)).toEqual([]);
  });

  it('resolves multiple titles', () => {
    expect(resolveLinksToIds(['Alpha Note', 'Gamma Note'], notes)).toEqual(['id-alpha', 'id-gamma']);
  });

  it('deduplicates when same note linked twice', () => {
    expect(resolveLinksToIds(['Alpha Note', 'Alpha Note'], notes)).toEqual(['id-alpha']);
  });

  it('skips notes with empty id', () => {
    const notesWithBlankId = [makeNote('', 'No ID Note')];
    expect(resolveLinksToIds(['No ID Note'], notesWithBlankId)).toEqual([]);
  });
});

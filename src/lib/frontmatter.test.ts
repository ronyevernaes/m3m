import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseNote, stringifyNote } from './frontmatter';
import * as ulidLib from './ulid';

const FIXED_ULID = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
const FIXED_NOW = '2026-04-26T00:00:00.000Z';

beforeEach(() => {
  vi.setSystemTime(new Date(FIXED_NOW));
});

describe('parseNote', () => {
  it('parses frontmatter and body', () => {
    const content = `---\nid: ${FIXED_ULID}\ntitle: Test\ncreated: ${FIXED_NOW}\nmodified: ${FIXED_NOW}\ntags: [a, b]\nlinks: []\n---\n\nHello world\n`;
    const note = parseNote(content, '/vault/test.md');
    expect(note.frontmatter.id).toBe(FIXED_ULID);
    expect(note.frontmatter.title).toBe('Test');
    expect(note.frontmatter.tags).toEqual(['a', 'b']);
    expect(note.body.trim()).toBe('Hello world');
    expect(note.path).toBe('/vault/test.md');
  });

  it('preserves unknown frontmatter keys', () => {
    const content = `---\nid: ${FIXED_ULID}\ntitle: Test\ncreated: ${FIXED_NOW}\nmodified: ${FIXED_NOW}\ntags: []\nlinks: []\ncustom_key: hello\n---\n\nBody\n`;
    const note = parseNote(content, '/vault/test.md');
    expect(note.frontmatter.custom_key).toBe('hello');
  });

  it('defaults missing fields to empty values', () => {
    const note = parseNote('', '/vault/empty.md');
    expect(note.frontmatter.id).toBe('');
    expect(note.frontmatter.tags).toEqual([]);
    expect(note.frontmatter.links).toEqual([]);
  });
});

describe('stringifyNote', () => {
  it('assigns an id on first stringify', () => {
    vi.spyOn(ulidLib, 'newUlid').mockReturnValue(FIXED_ULID);
    const note = parseNote('', '/vault/new.md');
    const result = stringifyNote(note);
    expect(result).toContain(`id: ${FIXED_ULID}`);
  });

  it('never overwrites an existing id', () => {
    const content = `---\nid: ${FIXED_ULID}\ntitle: Stable\ncreated: ${FIXED_NOW}\nmodified: ${FIXED_NOW}\ntags: []\nlinks: []\n---\n\nBody\n`;
    const note = parseNote(content, '/vault/stable.md');
    const result = stringifyNote(note);
    expect(result).toContain(`id: ${FIXED_ULID}`);
  });

  it('updates modified on every call', () => {
    const content = `---\nid: ${FIXED_ULID}\ntitle: T\ncreated: 2020-01-01T00:00:00.000Z\nmodified: 2020-01-01T00:00:00.000Z\ntags: []\nlinks: []\n---\n\n`;
    const note = parseNote(content, '/vault/t.md');
    const result = stringifyNote(note);
    expect(result).toContain(`modified: '${FIXED_NOW}'`);
  });

  it('never overwrites created', () => {
    const originalCreated = '2020-01-01T00:00:00.000Z';
    const content = `---\nid: ${FIXED_ULID}\ntitle: T\ncreated: ${originalCreated}\nmodified: ${originalCreated}\ntags: []\nlinks: []\n---\n\n`;
    const note = parseNote(content, '/vault/t.md');
    const result = stringifyNote(note);
    // gray-matter parses ISO timestamps as Date objects; js-yaml serializes them back
    // without quotes. Either format is correct — assert the date value is unchanged.
    expect(result).toContain('2020-01-01');
    expect(result).not.toContain(`modified: ${originalCreated}`);
  });

  it('preserves unknown keys through roundtrip', () => {
    const content = `---\nid: ${FIXED_ULID}\ntitle: T\ncreated: ${FIXED_NOW}\nmodified: ${FIXED_NOW}\ntags: []\nlinks: []\ncustom: value\n---\n\nBody\n`;
    const note = parseNote(content, '/vault/t.md');
    const result = stringifyNote(note);
    expect(result).toContain('custom: value');
  });
});

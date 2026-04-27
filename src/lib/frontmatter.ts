import matter from 'gray-matter';
import { newUlid } from './ulid';
import type { Note, Frontmatter } from '../types/note';

export function parseNote(content: string, path: string): Note {
  const { data, content: body } = matter(content);
  const fm = data as Partial<Frontmatter>;
  return {
    path,
    frontmatter: {
      ...data,
      id: fm.id ?? '',
      title: fm.title ?? '',
      created: fm.created ?? '',
      modified: fm.modified ?? '',
      tags: fm.tags ?? [],
      links: fm.links ?? [],
    },
    body: body.trimStart(),
  };
}

export function stringifyNote(note: Note): string {
  const now = new Date().toISOString();
  const fm: Frontmatter = {
    ...note.frontmatter,
    id: note.frontmatter.id || newUlid(),
    created: note.frontmatter.created || now,
    modified: now,
  };
  return matter.stringify('\n' + note.body, fm);
}

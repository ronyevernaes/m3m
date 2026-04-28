export interface Frontmatter {
  id: string;
  title: string;
  created: string;
  modified: string;
  tags: string[];
  links: string[];
  [key: string]: unknown;
}

export interface Note {
  path: string;
  frontmatter: Frontmatter;
  body: string;
}

export interface NoteListItem {
  id: string;
  title: string;
  path: string;
  modified: string;
  tags: string[];
}

export interface SearchResult {
  id: string;
  path: string;
  title: string;
  snippet: string;
  tags: string[];
}

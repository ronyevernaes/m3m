export interface ChangelogSection {
  type: string;
  items: string[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  sections: ChangelogSection[];
}

export function parseChangelog(raw: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const blocks = raw.split(/^## \[/m).slice(1);

  for (const block of blocks) {
    const lines = block.split('\n');
    const heading = lines[0];
    const match = heading.match(/^([^\]]+)\]\s*[—-]\s*(\S+)/);
    if (!match) continue;

    const version = match[1].trim();
    const date = match[2].trim();
    const body = lines.slice(1).join('\n');

    const sectionBlocks = body.split(/^### /m).slice(1);
    const sections: ChangelogSection[] = [];

    for (const sb of sectionBlocks) {
      const sbLines = sb.split('\n');
      const type = sbLines[0].trim();
      const items = sbLines
        .slice(1)
        .filter((l) => l.startsWith('- '))
        .map((l) => l.slice(2).trim());
      if (items.length > 0) sections.push({ type, items });
    }

    entries.push({ version, date, sections });
  }

  return entries;
}

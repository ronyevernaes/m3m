import { describe, it, expect } from 'vitest';
import { markdownToTipTap, tipTapToMarkdown } from './markdown';

function roundtrip(md: string): string {
  return tipTapToMarkdown(markdownToTipTap(md));
}

describe('markdown ↔ TipTap roundtrip', () => {
  it('heading', () => {
    expect(roundtrip('# Hello\n')).toBe('# Hello\n');
  });

  it('paragraph', () => {
    expect(roundtrip('Hello world\n')).toBe('Hello world\n');
  });

  it('bold', () => {
    expect(roundtrip('**bold**\n')).toBe('**bold**\n');
  });

  it('italic', () => {
    expect(roundtrip('*italic*\n')).toBe('*italic*\n');
  });

  it('inline code', () => {
    expect(roundtrip('`code`\n')).toBe('`code`\n');
  });

  it('bullet list', () => {
    const md = '* item one\n* item two\n';
    expect(roundtrip(md)).toBe(md);
  });

  it('ordered list', () => {
    const md = '1. first\n2. second\n';
    expect(roundtrip(md)).toBe(md);
  });

  it('code block', () => {
    const md = '```js\nconsole.log(1)\n```\n';
    expect(roundtrip(md)).toBe(md);
  });

  it('blockquote', () => {
    const md = '> quoted text\n';
    expect(roundtrip(md)).toBe(md);
  });

  it('link', () => {
    const md = '[example](https://example.com)\n';
    expect(roundtrip(md)).toBe(md);
  });
});

describe('markdownToTipTap', () => {
  it('returns a doc node', () => {
    const json = markdownToTipTap('Hello\n');
    expect(json.type).toBe('doc');
    expect(json.content).toBeDefined();
  });

  it('returns a doc with a paragraph for empty string', () => {
    const json = markdownToTipTap('');
    expect(json.type).toBe('doc');
    expect(json.content?.[0]?.type).toBe('paragraph');
  });
});

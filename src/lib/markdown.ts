import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import type { JSONContent } from '@tiptap/core';
import type {
  Root,
  Content,
  Paragraph,
  Heading,
  Code,
  Blockquote,
  List,
  ListItem,
  ThematicBreak,
  PhrasingContent,
  Text,
  Strong,
  Emphasis,
  InlineCode,
  Link,
  Delete,
} from 'mdast';

// ---- mdast → TipTap (ProseMirror JSON) ----

type Mark = { type: string; attrs?: Record<string, unknown> };
type TextNode = { type: 'text'; text: string; marks?: Mark[] };

function flattenInline(nodes: PhrasingContent[], inherited: Mark[] = []): TextNode[] {
  const result: TextNode[] = [];
  for (const node of nodes) {
    if (node.type === 'text') {
      const n = node as Text;
      if (n.value) result.push({ type: 'text', text: n.value, marks: inherited.length ? [...inherited] : undefined });
    } else if (node.type === 'strong') {
      const n = node as Strong;
      result.push(...flattenInline(n.children, [...inherited, { type: 'bold' }]));
    } else if (node.type === 'emphasis') {
      const n = node as Emphasis;
      result.push(...flattenInline(n.children, [...inherited, { type: 'italic' }]));
    } else if (node.type === 'delete') {
      const n = node as Delete;
      result.push(...flattenInline(n.children, [...inherited, { type: 'strike' }]));
    } else if (node.type === 'inlineCode') {
      const n = node as InlineCode;
      result.push({ type: 'text', text: n.value, marks: [...inherited, { type: 'code' }] });
    } else if (node.type === 'link') {
      const n = node as Link;
      result.push(...flattenInline(n.children, [...inherited, { type: 'link', attrs: { href: n.url, target: null } }]));
    } else if (node.type === 'break') {
      result.push({ type: 'text', text: '\n', marks: inherited.length ? [...inherited] : undefined });
    }
  }
  return result;
}

function mdastNodeToTipTap(node: Content): JSONContent | JSONContent[] | null {
  switch (node.type) {
    case 'paragraph': {
      const p = node as Paragraph;
      const content = flattenInline(p.children);
      return { type: 'paragraph', content: content.length ? content : undefined };
    }
    case 'heading': {
      const h = node as Heading;
      const content = flattenInline(h.children);
      return { type: 'heading', attrs: { level: h.depth }, content: content.length ? content : undefined };
    }
    case 'code': {
      const c = node as Code;
      return {
        type: 'codeBlock',
        attrs: { language: c.lang ?? null },
        content: c.value ? [{ type: 'text', text: c.value }] : undefined,
      };
    }
    case 'blockquote': {
      const bq = node as Blockquote;
      return {
        type: 'blockquote',
        content: bq.children.flatMap((child) => {
          const converted = mdastNodeToTipTap(child as Content);
          if (!converted) return [];
          return Array.isArray(converted) ? converted : [converted];
        }),
      };
    }
    case 'list': {
      const l = node as List;
      const listType = l.ordered ? 'orderedList' : 'bulletList';
      return {
        type: listType,
        content: l.children.map((item) => {
          const li = item as ListItem;
          return {
            type: 'listItem',
            content: li.children.flatMap((child) => {
              const converted = mdastNodeToTipTap(child as Content);
              if (!converted) return [];
              return Array.isArray(converted) ? converted : [converted];
            }),
          };
        }),
      };
    }
    case 'thematicBreak': {
      return { type: 'horizontalRule' };
    }
    default:
      return null;
  }
}

export function markdownToTipTap(md: string): JSONContent {
  const tree = unified().use(remarkParse).parse(md) as Root;
  const content: JSONContent[] = [];
  for (const node of tree.children) {
    const converted = mdastNodeToTipTap(node as Content);
    if (!converted) continue;
    if (Array.isArray(converted)) content.push(...converted);
    else content.push(converted);
  }
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] };
}

// ---- TipTap (ProseMirror JSON) → mdast ----

function tiptapMarksToMdast(text: string, marks: Mark[]): PhrasingContent {
  let node: PhrasingContent = { type: 'text', value: text } as Text;
  for (const mark of [...marks].reverse()) {
    switch (mark.type) {
      case 'bold':
        node = { type: 'strong', children: [node] } as Strong;
        break;
      case 'italic':
        node = { type: 'emphasis', children: [node] } as Emphasis;
        break;
      case 'strike':
        node = { type: 'delete', children: [node] } as Delete;
        break;
      case 'code':
        node = { type: 'inlineCode', value: text } as InlineCode;
        break;
      case 'link':
        node = { type: 'link', url: String(mark.attrs?.href ?? ''), children: [node] } as Link;
        break;
    }
  }
  return node;
}

function inlineToMdast(nodes: JSONContent[]): PhrasingContent[] {
  return nodes.flatMap((n) => {
    if (n.type === 'text') {
      const marks = (n.marks as Mark[] | undefined) ?? [];
      if (marks.length === 0) return [{ type: 'text', value: n.text ?? '' } as Text];
      return [tiptapMarksToMdast(n.text ?? '', marks)];
    }
    if (n.type === 'hardBreak') return [{ type: 'break' }];
    return [];
  });
}

function tiptapNodeToMdast(node: JSONContent): Content | null {
  const children = node.content ?? [];
  switch (node.type) {
    case 'paragraph':
      return { type: 'paragraph', children: inlineToMdast(children) } as Paragraph;
    case 'heading':
      return {
        type: 'heading',
        depth: (node.attrs?.level as 1 | 2 | 3 | 4 | 5 | 6) ?? 1,
        children: inlineToMdast(children),
      } as Heading;
    case 'codeBlock': {
      const text = children.find((c) => c.type === 'text');
      return {
        type: 'code',
        lang: (node.attrs?.language as string | null) ?? null,
        value: text?.text ?? '',
      } as Code;
    }
    case 'blockquote':
      return {
        type: 'blockquote',
        children: children.flatMap((c) => {
          const converted = tiptapNodeToMdast(c);
          return converted ? [converted] : [];
        }),
      } as Blockquote;
    case 'bulletList':
      return {
        type: 'list',
        ordered: false,
        spread: false,
        children: children.map((item) => ({
          type: 'listItem',
          spread: false,
          children: (item.content ?? []).flatMap((c) => {
            const converted = tiptapNodeToMdast(c);
            return converted ? [converted] : [];
          }),
        })) as ListItem[],
      } as List;
    case 'orderedList':
      return {
        type: 'list',
        ordered: true,
        spread: false,
        children: children.map((item) => ({
          type: 'listItem',
          spread: false,
          children: (item.content ?? []).flatMap((c) => {
            const converted = tiptapNodeToMdast(c);
            return converted ? [converted] : [];
          }),
        })) as ListItem[],
      } as List;
    case 'horizontalRule':
      return { type: 'thematicBreak' } as ThematicBreak;
    default:
      return null;
  }
}

export function tipTapToMarkdown(json: JSONContent): string {
  const nodes = (json.content ?? []).flatMap((n) => {
    const converted = tiptapNodeToMdast(n);
    return converted ? [converted] : [];
  });
  const root: Root = { type: 'root', children: nodes };
  return unified().use(remarkStringify).stringify(root);
}

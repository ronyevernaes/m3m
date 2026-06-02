import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PmNode } from '@tiptap/pm/model';

const pluginKey = new PluginKey('collapsibleHeading');

export type CollapsibleStorage = { collapsedSections: Set<string>; noteId: string };

export function makeSectionKey(level: number, text: string, occurrenceIndex: number): string {
  return `${level}:${text}:${occurrenceIndex}`;
}

type Section = { key: string; contentFrom: number; contentTo: number };

export function findSections(doc: PmNode): Section[] {
  const headings: Array<{ level: number; text: string; from: number; to: number }> = [];

  doc.forEach((node, offset) => {
    if (node.type.name === 'heading') {
      headings.push({
        level: node.attrs.level as number,
        text: node.textContent,
        from: offset,
        to: offset + node.nodeSize,
      });
    }
  });

  const occurrenceCount = new Map<string, number>();
  const sections: Section[] = [];

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    const baseKey = `${h.level}:${h.text}`;
    const idx = occurrenceCount.get(baseKey) ?? 0;
    occurrenceCount.set(baseKey, idx + 1);

    let contentTo = doc.content.size;
    for (let j = i + 1; j < headings.length; j++) {
      if (headings[j].level <= h.level) {
        contentTo = headings[j].from;
        break;
      }
    }

    sections.push({ key: makeSectionKey(h.level, h.text, idx), contentFrom: h.to, contentTo });
  }

  return sections;
}

function buildDecorations(doc: PmNode, collapsed: Set<string>): DecorationSet {
  if (collapsed.size === 0) return DecorationSet.empty;

  const sections = findSections(doc);
  const decos: Decoration[] = [];

  for (const section of sections) {
    if (!collapsed.has(section.key)) continue;
    doc.forEach((node, offset) => {
      if (offset >= section.contentFrom && offset + node.nodeSize <= section.contentTo) {
        decos.push(Decoration.node(offset, offset + node.nodeSize, { class: 'pm-section-hidden' }));
      }
    });
  }

  return DecorationSet.create(doc, decos);
}

export const CollapsibleHeadingExtension = Node.create({
  name: 'heading',
  group: 'block',
  content: 'inline*',
  defining: true,

  addOptions() {
    return { levels: [1, 2, 3, 4, 5, 6] };
  },

  addAttributes() {
    return {
      level: {
        default: 1,
        rendered: false,
      },
    };
  },

  parseHTML() {
    return (this.options.levels as number[]).map((level) => ({
      tag: `h${level}`,
      attrs: { level },
    }));
  },

  renderHTML({ node, HTMLAttributes }) {
    const level = node.attrs.level as number;
    return [`h${level}`, mergeAttributes(HTMLAttributes), 0];
  },

  addStorage() {
    return {
      collapsedSections: new Set<string>(),
      noteId: '',
    };
  },

  addProseMirrorPlugins() {
    const storage = this.storage as CollapsibleStorage;
    return [
      new Plugin({
        key: pluginKey,
        state: {
          init(_, state) {
            return buildDecorations(state.doc, storage.collapsedSections);
          },
          apply(tr, old, _oldState, newState) {
            if (tr.docChanged || tr.getMeta('rebuildDecorations')) {
              return buildDecorations(newState.doc, storage.collapsedSections);
            }
            return old.map(tr.mapping, newState.doc);
          },
        },
        props: {
          decorations(state) {
            return pluginKey.getState(state) as DecorationSet;
          },
        },
      }),
    ];
  },
});

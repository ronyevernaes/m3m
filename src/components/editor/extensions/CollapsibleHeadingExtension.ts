import { Node, mergeAttributes, textblockTypeInputRule } from '@tiptap/core';
import type { Editor, NodeViewRendererProps } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PmNode } from '@tiptap/pm/model';
import { useUiStore } from '../../../store/ui';

export const pluginKey = new PluginKey('collapsibleHeading');

export type CollapsibleStorage = { collapsedSections: Set<string>; noteId: string };

export function makeSectionKey(level: number, text: string, occurrenceIndex: number): string {
  return `${level}:${text}:${occurrenceIndex}`;
}

export type Section = { key: string; headingPos: number; contentFrom: number; contentTo: number };

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

    sections.push({
      key: makeSectionKey(h.level, h.text, idx),
      headingPos: h.from,
      contentFrom: h.to,
      contentTo,
    });
  }

  return sections;
}

function buildDecorations(doc: PmNode, collapsed: Set<string>): DecorationSet {
  if (collapsed.size === 0) return DecorationSet.empty;

  const sections = findSections(doc);
  const decos: Decoration[] = [];

  for (const section of sections) {
    if (!collapsed.has(section.key)) continue;
    const headingSize = section.contentFrom - section.headingPos;
    decos.push(Decoration.node(section.headingPos, section.headingPos + headingSize, { class: 'heading-is-collapsed' }));
    doc.forEach((node, offset) => {
      if (offset >= section.contentFrom && offset + node.nodeSize <= section.contentTo) {
        decos.push(Decoration.node(offset, offset + node.nodeSize, { class: 'pm-section-hidden' }));
      }
    });
  }

  return DecorationSet.create(doc, decos);
}

function createNodeView(
  props: NodeViewRendererProps,
  storage: CollapsibleStorage,
  getEditor: () => Editor,
) {
  const { node: initialNode } = props;
  const level = initialNode.attrs.level as number;

  const dom = document.createElement(`h${level}`);
  dom.className = 'relative';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Toggle section');
  btn.className =
    'heading-chevron absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded text-foreground/40 hover:text-foreground hover:bg-muted';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '12');
  svg.setAttribute('height', '12');
  svg.setAttribute('viewBox', '0 0 10 10');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M1 3l4 4 4-4');
  svg.appendChild(path);
  btn.appendChild(svg);

  btn.addEventListener('mousedown', (e) => e.preventDefault());
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const editor = getEditor();
    const pos = props.getPos();
    if (pos === undefined) return;
    const section = findSections(editor.state.doc).find((s) => s.headingPos === pos);
    if (!section) return;
    if (storage.collapsedSections.has(section.key)) {
      storage.collapsedSections.delete(section.key);
    } else {
      storage.collapsedSections.add(section.key);
    }
    useUiStore.getState().toggleSectionCollapsed(storage.noteId, section.key);
    editor.view.dispatch(editor.view.state.tr.setMeta(pluginKey, 'rebuildDecorations'));
  });

  const contentDOM = document.createElement('span');
  dom.appendChild(btn);
  dom.appendChild(contentDOM);

  return {
    dom,
    contentDOM,
    update(updatedNode: PmNode) {
      return updatedNode.type.name === 'heading' && (updatedNode.attrs.level as number) === level;
    },
  };
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

  addNodeView() {
    const storage = this.storage as CollapsibleStorage;
    const getEditor = () => this.editor;
    return (props: NodeViewRendererProps) => createNodeView(props, storage, getEditor);
  },

  addStorage() {
    return {
      collapsedSections: new Set<string>(),
      noteId: '',
    };
  },

  addCommands() {
    return {
      setHeading:
        (attributes: { level: number }) =>
        ({ commands }: { commands: Record<string, (...args: unknown[]) => boolean> }) => {
          if (!(this.options.levels as number[]).includes(attributes.level)) return false;
          return commands.setNode(this.name, attributes);
        },
      toggleHeading:
        (attributes: { level: number }) =>
        ({ commands }: { commands: Record<string, (...args: unknown[]) => boolean> }) => {
          if (!(this.options.levels as number[]).includes(attributes.level)) return false;
          return commands.toggleNode(this.name, 'paragraph', attributes);
        },
    };
  },

  addKeyboardShortcuts() {
    return (this.options.levels as number[]).reduce(
      (acc: Record<string, () => boolean>, level: number) => {
        acc[`Mod-Alt-${level}`] = () => this.editor.commands.toggleHeading({ level });
        return acc;
      },
      {},
    );
  },

  addInputRules() {
    return (this.options.levels as number[]).map((level: number) =>
      textblockTypeInputRule({
        find: new RegExp(`^(#{1,${level}})\\s$`),
        type: this.type,
        getAttributes: { level },
      }),
    );
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
            if (tr.docChanged || tr.getMeta(pluginKey)) {
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

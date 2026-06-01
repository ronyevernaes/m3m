import { Node, mergeAttributes } from '@tiptap/core';
import type { NodeViewRendererProps } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PmNode } from '@tiptap/pm/model';
import { useUiStore } from '../../../store/ui';

const pluginKey = new PluginKey('collapsibleHeading');

type CollapsibleStorage = { collapsedSections: Set<string>; noteId: string };

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

// Chevron SVG — down when expanded, rotated -90° when collapsed
const CHEVRON_SVG = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 3l4 4 4-4"/></svg>`;

function createNodeView(props: NodeViewRendererProps, storage: CollapsibleStorage) {
  const { node: initialNode, getPos, editor: tiptapEditor } = props;
  const level = initialNode.attrs.level as number;
  let currentNode = initialNode;

  // --- DOM structure ---
  const dom = document.createElement(`h${level}`);
  dom.className = 'flex items-center gap-1.5 group/heading';

  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('contenteditable', 'false');
  button.className =
    'flex-shrink-0 opacity-0 group-hover/heading:opacity-100 transition-opacity duration-150 p-0.5 rounded text-foreground/40 hover:text-foreground hover:bg-muted';
  button.innerHTML = CHEVRON_SVG;
  const chevron = button.querySelector('svg') as SVGElement;
  chevron.style.transition = 'transform 150ms';

  const contentDOM = document.createElement('span');

  dom.appendChild(button);
  dom.appendChild(contentDOM);

  // --- Section key ---
  const computeKey = (): string => {
    if (typeof getPos !== 'function') return '';
    const pos = getPos();
    if (pos === undefined) return '';
    const doc = tiptapEditor.state.doc;
    const text = currentNode.textContent;
    let idx = 0;
    doc.forEach((n, offset) => {
      if (
        offset < pos &&
        n.type.name === 'heading' &&
        n.attrs.level === level &&
        n.textContent === text
      ) {
        idx++;
      }
    });
    return makeSectionKey(level, text, idx);
  };

  let currentKey = computeKey();

  // --- Visual sync ---
  const syncVisual = () => {
    const isCollapsed = Boolean(currentKey) && storage.collapsedSections.has(currentKey);
    chevron.style.transform = isCollapsed ? 'rotate(-90deg)' : '';
    button.setAttribute('aria-label', isCollapsed ? 'Expand section' : 'Collapse section');
  };
  syncVisual();

  // --- Toggle on click ---
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentKey) return;
    if (storage.collapsedSections.has(currentKey)) {
      storage.collapsedSections.delete(currentKey);
    } else {
      storage.collapsedSections.add(currentKey);
    }
    syncVisual();
    tiptapEditor.view.dispatch(tiptapEditor.view.state.tr.setMeta('rebuildDecorations', true));
    useUiStore.getState().toggleSectionCollapsed(storage.noteId, currentKey);
  });

  // Subscribe to store so chevron updates when another note's state is loaded
  const unsubscribe = useUiStore.subscribe(() => syncVisual());

  return {
    dom,
    contentDOM,
    update(updatedNode: PmNode) {
      if (updatedNode.type.name !== 'heading' || (updatedNode.attrs.level as number) !== level) {
        return false;
      }
      currentNode = updatedNode;
      currentKey = computeKey();
      syncVisual();
      return true;
    },
    ignoreMutation(mutation: MutationRecord) {
      return button.contains(mutation.target as Node) || mutation.target === button;
    },
    destroy() {
      unsubscribe();
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
    return (props: NodeViewRendererProps) => createNodeView(props, storage);
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

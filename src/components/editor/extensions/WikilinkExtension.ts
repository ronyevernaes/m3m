import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { Suggestion } from '@tiptap/suggestion';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { useVaultStore } from '../../../store/vault';
import { WikilinkNodeView } from '../WikilinkNodeView';
import { WikilinkSuggestion } from '../WikilinkSuggestion';
import type { WikilinkSuggestionRef } from '../WikilinkSuggestion';
import type { NoteListItem } from '../../../types/note';

export interface WikilinkExtensionOptions {
  onNavigate?: (path: string) => void;
}

export const WikilinkExtension = Node.create<WikilinkExtensionOptions>({
  name: 'wikilink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return { onNavigate: undefined };
  },

  addAttributes() {
    return {
      title: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-wikilink]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-wikilink': '',
        'data-title': node.attrs.title,
      }),
      `[[${node.attrs.title}]]`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WikilinkNodeView);
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<NoteListItem, NoteListItem>({
        editor: this.editor,
        char: '[[',
        allowSpaces: true,

        items({ query }) {
          const { notes } = useVaultStore.getState();
          const q = query.toLowerCase();
          return notes.filter((n) => n.title.toLowerCase().includes(q));
        },

        command({ editor, range, props }) {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({ type: 'wikilink', attrs: { title: props.title } })
            .insertContent(' ')
            .run();
        },

        render() {
          let container: HTMLDivElement | null = null;
          let root: ReturnType<typeof createRoot> | null = null;
          const suggestionRef = createRef<WikilinkSuggestionRef>();

          function mount(props: SuggestionProps<NoteListItem, NoteListItem>) {
            container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
            root = createRoot(container);
            rerender(props);
          }

          function rerender(props: SuggestionProps<NoteListItem, NoteListItem>) {
            if (!container || !root) return;
            const rect = props.clientRect?.();
            if (rect) {
              container.style.top = `${rect.bottom + 4}px`;
              container.style.left = `${rect.left}px`;
            }
            root.render(
              createElement(WikilinkSuggestion, {
                ref: suggestionRef,
                items: props.items,
                command: props.command,
              }),
            );
          }

          function unmount() {
            root?.unmount();
            container?.remove();
            container = null;
            root = null;
          }

          return {
            onStart: mount,
            onUpdate: rerender,
            onExit: unmount,
            onKeyDown({ event }: SuggestionKeyDownProps) {
              if (event.key === 'Escape') { unmount(); return true; }
              return suggestionRef.current?.onKeyDown(event) ?? false;
            },
          };
        },
      }),
    ];
  },
});

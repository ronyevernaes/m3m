import { InputRule, markPasteRule } from '@tiptap/core';
import { Link } from '@tiptap/extension-link';

const LINK_INPUT_REGEX = /\[([^\]]+)\]\(([^)]+)\)$/;
const LINK_PASTE_REGEX = /https?:\/\/[^\s)>]+/g;

export const LinkExtension = Link.extend({
  addInputRules() {
    return [
      new InputRule({
        find: LINK_INPUT_REGEX,
        handler: ({ state, range, match }) => {
          const [, label, href] = match;
          const { tr } = state;
          const linkMark = this.type.create({ href, target: null });
          tr.replaceWith(range.from, range.to, state.schema.text(label, [linkMark]));
          tr.removeStoredMark(this.type);
        },
      }),
    ];
  },
  addPasteRules() {
    return [
      markPasteRule({
        find: LINK_PASTE_REGEX,
        type: this.type,
        getAttributes: (match) => ({ href: match[0], target: null }),
      }),
    ];
  },
});

import { Extension } from '@tiptap/core'
import { Plugin } from 'prosemirror-state'
import { Slice } from 'prosemirror-model'
import { markdownToTipTap } from '../../../lib/markdown'

export const MarkdownPasteExtension = Extension.create({
  name: 'markdownPaste',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste(view, event) {
            const data = event.clipboardData
            if (!data) return false
            if (data.getData('text/html')) return false
            const text = data.getData('text/plain')
            if (!text) return false

            const json = markdownToTipTap(text)
            const node = view.state.schema.nodeFromJSON(json)
            const { $from } = view.state.selection
            const isSingleParagraph =
              node.childCount === 1 && node.firstChild?.type.name === 'paragraph'
            const openDepth = isSingleParagraph && $from.parent.isTextblock ? 1 : 0
            const slice = new Slice(node.content, openDepth, openDepth)
            view.dispatch(view.state.tr.replaceSelection(slice))
            return true
          },
        },
      }),
    ]
  },
})

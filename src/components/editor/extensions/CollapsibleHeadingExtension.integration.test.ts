import { describe, it, expect } from 'vitest'
import { Editor } from '@tiptap/core'
import { StarterKit } from '@tiptap/starter-kit'
import { CollapsibleHeadingExtension, findSections } from './CollapsibleHeadingExtension'

function makeEditor(content: string | object = '') {
  return new Editor({
    element: document.createElement('div'),
    extensions: [
      StarterKit.configure({ codeBlock: false, heading: false }),
      CollapsibleHeadingExtension,
    ],
    content,
  })
}

describe('CollapsibleHeadingExtension integration', () => {
  it('creates editor without errors', () => {
    const editor = makeEditor()
    expect(editor).toBeDefined()
    expect(editor.isDestroyed).toBe(false)
    editor.destroy()
  })

  it('extension is registered as heading', () => {
    const editor = makeEditor()
    const ext = editor.extensionManager.extensions.find(e => e.name === 'heading')
    expect(ext).toBeDefined()
    editor.destroy()
  })

  it('storage initializes with empty set and blank noteId', () => {
    const editor = makeEditor()
    const ext = editor.extensionManager.extensions.find(e => e.name === 'heading')!
    const storage = ext.storage as { collapsedSections: Set<string>; noteId: string }
    expect(storage.collapsedSections).toBeInstanceOf(Set)
    expect(storage.collapsedSections.size).toBe(0)
    expect(storage.noteId).toBe('')
    editor.destroy()
  })

  it('parses heading content correctly', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Section A' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Content under A' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Section B' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Content under B' }] },
      ],
    })
    const doc = editor.state.doc
    const sections = findSections(doc)
    expect(sections).toHaveLength(2)
    expect(sections[0].key).toBe('0')
    expect(sections[1].key).toBe('1')
    editor.destroy()
  })

  it('collapse/expand cycle via storage mutation + meta dispatch', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Intro' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Content' }] },
      ],
    })
    const ext = editor.extensionManager.extensions.find(e => e.name === 'heading')!
    const storage = ext.storage as { collapsedSections: Set<string>; noteId: string }
    const key = '0'

    // Collapse
    storage.collapsedSections.add(key)
    editor.view.dispatch(editor.view.state.tr.setMeta('rebuildDecorations', true))
    expect(storage.collapsedSections.has(key)).toBe(true)

    // Expand
    storage.collapsedSections.delete(key)
    editor.view.dispatch(editor.view.state.tr.setMeta('rebuildDecorations', true))
    expect(storage.collapsedSections.has(key)).toBe(false)

    editor.destroy()
  })

  it('sets storage noteId for persistence keying', () => {
    const editor = makeEditor()
    const ext = editor.extensionManager.extensions.find(e => e.name === 'heading')!
    const storage = ext.storage as { collapsedSections: Set<string>; noteId: string }
    storage.noteId = 'note-abc-123'
    expect(storage.noteId).toBe('note-abc-123')
    editor.destroy()
  })
})

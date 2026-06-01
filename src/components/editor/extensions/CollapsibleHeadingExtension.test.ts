import { describe, it, expect } from 'vitest'
import { Schema } from '@tiptap/pm/model'
import type { Node } from '@tiptap/pm/model'
import { findSections, makeSectionKey } from './CollapsibleHeadingExtension'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    heading: { group: 'block', content: 'inline*', attrs: { level: { default: 1 } } },
    paragraph: { group: 'block', content: 'inline*' },
    text: { group: 'inline' },
  },
})

function h(level: number, text: string): Node {
  return schema.nodes.heading.create({ level }, schema.text(text))
}
function p(text: string): Node {
  return schema.nodes.paragraph.create(null, schema.text(text))
}
function doc(...nodes: Node[]): Node {
  return schema.nodes.doc.create(null, nodes)
}

describe('findSections', () => {
  it('returns one section for a single heading', () => {
    const d = doc(h(1, 'Intro'), p('content'))
    const sections = findSections(d)
    expect(sections).toHaveLength(1)
    expect(sections[0].key).toBe(makeSectionKey(1, 'Intro', 0))
  })

  it('splits at same-level headings', () => {
    const d = doc(h(2, 'A'), p('a1'), h(2, 'B'), p('b1'))
    const sections = findSections(d)
    expect(sections).toHaveLength(2)
    expect(sections[0].key).toBe(makeSectionKey(2, 'A', 0))
    expect(sections[1].key).toBe(makeSectionKey(2, 'B', 0))
    // A's content range ends before B's content range starts (B's heading is between them)
    expect(sections[0].contentTo).toBeLessThan(sections[1].contentFrom)
  })

  it('h3 is nested inside h2 section range', () => {
    const d = doc(h(2, 'Top'), p('intro'), h(3, 'Sub'), p('sub'), h(2, 'Next'))
    const sections = findSections(d)
    expect(sections).toHaveLength(3)
    const topIdx = sections.findIndex(s => s.key === makeSectionKey(2, 'Top', 0))
    const nextIdx = sections.findIndex(s => s.key === makeSectionKey(2, 'Next', 0))
    expect(topIdx).toBe(0)
    expect(nextIdx).toBe(2)
    // Top section ends at Next heading's start
    const nextSection = sections[nextIdx]
    const topSection = sections[topIdx]
    expect(topSection.contentTo).toBeLessThan(nextSection.contentFrom)
  })

  it('assigns occurrence index for duplicate heading text', () => {
    const d = doc(h(2, 'Intro'), p('first'), h(2, 'Intro'), p('second'))
    const sections = findSections(d)
    expect(sections[0].key).toBe(makeSectionKey(2, 'Intro', 0))
    expect(sections[1].key).toBe(makeSectionKey(2, 'Intro', 1))
  })

  it('returns empty array for a doc with no headings', () => {
    const d = doc(p('just a paragraph'))
    expect(findSections(d)).toHaveLength(0)
  })
})

import { describe, it, expect } from 'vitest'
import { snippetParts } from '@/utilies/lyric-snippet'

describe('snippetParts', () => {
  it('returns the whole text as one plain part when nothing is highlighted', () => {
    const parts = snippetParts({ text: '那一年的夏天', highlights: [] })
    expect(parts).toEqual([{ text: '那一年的夏天', hit: false }])
  })

  it('splits around a single hit', () => {
    const parts = snippetParts({ text: '那一年的夏天 我们都在', highlights: [[4, 6]] })
    expect(parts).toEqual([
      { text: '那一年的', hit: false },
      { text: '夏天', hit: true },
      { text: ' 我们都在', hit: false },
    ])
  })

  it('keeps several hits and the gaps between them', () => {
    const parts = snippetParts({ text: 'abcdef', highlights: [[0, 2], [4, 6]] })
    expect(parts).toEqual([
      { text: 'ab', hit: true },
      { text: 'cd', hit: false },
      { text: 'ef', hit: true },
    ])
  })

  it('sorts unordered spans and merges overlapping ones', () => {
    const parts = snippetParts({ text: 'abcdef', highlights: [[3, 5], [0, 2], [1, 4]] })
    expect(parts).toEqual([
      { text: 'abcde', hit: true },
      { text: 'f', hit: false },
    ])
  })

  it('emits no empty parts when a hit touches the edges', () => {
    const parts = snippetParts({ text: 'abcd', highlights: [[0, 1], [3, 4]] })
    expect(parts).toEqual([
      { text: 'a', hit: true },
      { text: 'bc', hit: false },
      { text: 'd', hit: true },
    ])
  })

  it('clamps out of range offsets instead of throwing', () => {
    const parts = snippetParts({ text: 'abc', highlights: [[2, 99]] })
    expect(parts).toEqual([
      { text: 'ab', hit: false },
      { text: 'c', hit: true },
    ])
  })

  it('returns no parts for empty text', () => {
    expect(snippetParts({ text: '', highlights: [[0, 1]] })).toEqual([])
  })
})

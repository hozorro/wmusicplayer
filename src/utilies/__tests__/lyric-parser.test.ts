import { describe, it, expect } from 'vitest'
import { LyricParser } from '@/utilies/lyric-parser'

const SAMPLE_LRC = `[ti:Test Song]
[ar:Test Artist]
[al:Test Album]
[offset:100]
[00:00.500]Intro
[00:05.000]First line of lyrics
[00:10.250]Second line of lyrics
[00:20.100]Third line of lyrics
[01:30.000]Late lyrics`

describe('LyricParser', () => {
  describe('parse()', () => {
    it('parses lyric lines with time tags', () => {
      const parser = new LyricParser(SAMPLE_LRC)
      const lyrics = parser.getLyrics()
      expect(lyrics.length).toBe(5)
      expect(lyrics[0]).toEqual({ time: 0.5, text: 'Intro' })
      expect(lyrics[1]).toEqual({ time: 5.0, text: 'First line of lyrics' })
    })

    it('parses 3-digit milliseconds correctly', () => {
      const parser = new LyricParser('[00:10.250]Hello')
      const lyrics = parser.getLyrics()
      expect(lyrics[0].time).toBeCloseTo(10.25, 3)
    })

    it('parses 2-digit milliseconds correctly', () => {
      const parser = new LyricParser('[00:10.25]Hello')
      const lyrics = parser.getLyrics()
      // '25' padEnd(3,'0') => '250' => 250ms => 0.250s
      expect(lyrics[0].time).toBeCloseTo(10.25, 3)
    })

    it('sorts lyric lines by time', () => {
      const lrc = `[00:20.000]Third
[00:05.000]First
[00:10.000]Second`
      const parser = new LyricParser(lrc)
      const lyrics = parser.getLyrics()
      expect(lyrics[0].text).toBe('First')
      expect(lyrics[1].text).toBe('Second')
      expect(lyrics[2].text).toBe('Third')
    })
  })

  describe('getMetadata()', () => {
    it('extracts metadata from time-tagged format [key:value]', () => {
      // Metadata embedded in the text part after a time tag: [00:00.000]ti:Test Song
      const parser = new LyricParser('[00:00.000]ti:Test Song\n[00:01.000]Lyric')
      const meta = parser.getMetadata()
      expect(meta.ti).toBe('Test Song')
    })

    it('parses total and offset as numbers', () => {
      const parser = new LyricParser('[00:00.000]offset:100\n[00:00.001]total:200')
      const meta = parser.getMetadata()
      expect(meta.offset).toBe(100)
      expect(meta.total).toBe(200)
    })

    it('returns a copy of metadata (not reference)', () => {
      const parser = new LyricParser('[00:00.000]ti:Song\n[00:01.000]Line')
      const meta1 = parser.getMetadata()
      meta1.ti = 'Modified'
      const meta2 = parser.getMetadata()
      expect(meta2.ti).toBe('Song')
    })

    it('does not extract [key:value] lines as metadata (known parser limitation)', () => {
      // Standard LRC metadata like [ti:Song] is NOT parsed because
      // the global metadata regex requires no leading bracket
      const parser = new LyricParser('[ti:Song]\n[ar:Artist]\n[00:05.000]Lyric')
      const meta = parser.getMetadata()
      expect(meta.ti).toBeUndefined()
      expect(meta.ar).toBeUndefined()
    })
  })

  describe('getLyrics()', () => {
    it('returns a copy of lyrics array', () => {
      const parser = new LyricParser('[00:01.000]Line1\n[00:02.000]Line2')
      const lyrics1 = parser.getLyrics()
      lyrics1.push({ time: 99, text: 'Fake' })
      const lyrics2 = parser.getLyrics()
      expect(lyrics2.length).toBe(2)
    })
  })

  describe('getCurrentLyricIndex()', () => {
    const parser = new LyricParser(`[00:05.000]First
[00:10.000]Second
[00:20.000]Third`)

    it('returns -1 when time is before first lyric', () => {
      expect(parser.getCurrentLyricIndex(2)).toBe(-1)
    })

    it('returns correct index at exact time', () => {
      expect(parser.getCurrentLyricIndex(5)).toBe(0)
      expect(parser.getCurrentLyricIndex(10)).toBe(1)
      expect(parser.getCurrentLyricIndex(20)).toBe(2)
    })

    it('returns correct index between lyrics', () => {
      expect(parser.getCurrentLyricIndex(7)).toBe(0)  // between 5 and 10
      expect(parser.getCurrentLyricIndex(15)).toBe(1) // between 10 and 20
    })

    it('returns last index when time is past last lyric', () => {
      expect(parser.getCurrentLyricIndex(100)).toBe(2)
    })

    it('returns -1 for empty lyrics', () => {
      const emptyParser = new LyricParser('')
      expect(emptyParser.getCurrentLyricIndex(100)).toBe(-1)
    })
  })

  describe('getCurrentLyric()', () => {
    const parser = new LyricParser(`[00:05.000]Hello World
[00:10.000]Goodbye World`)

    it('returns lyric text at given time', () => {
      expect(parser.getCurrentLyric(5)).toBe('Hello World')
      expect(parser.getCurrentLyric(10)).toBe('Goodbye World')
    })

    it('returns empty string when time is before first lyric', () => {
      expect(parser.getCurrentLyric(2)).toBe('')
    })
  })

  describe('regenerate()', () => {
    it('includes lyric lines in regenerated output', () => {
      const parser = new LyricParser(`[00:05.000]First line
[00:10.500]Second line`)
      const output = parser.regenerate()
      expect(output).toMatch(/\[00:05\.000\]First line/)
      expect(output).toMatch(/\[00:10\.500\]Second line/)
    })

    it('round-trips: parse -> regenerate -> parse gives same result', () => {
      const lrc = `[00:01.000]Line A
[00:05.000]Line B
[00:10.000]Line C`
      const parser1 = new LyricParser(lrc)
      const regenerated = parser1.regenerate()
      const parser2 = new LyricParser(regenerated)
      expect(parser2.getLyrics()).toEqual(parser1.getLyrics())
    })
  })

  describe('edge cases', () => {
    it('handles empty string input', () => {
      const parser = new LyricParser('')
      expect(parser.getLyrics()).toEqual([])
      expect(parser.getMetadata()).toEqual({})
    })

    it('handles plain text without time tags', () => {
      const parser = new LyricParser('Just some plain text\nAnother line')
      expect(parser.getLyrics()).toEqual([])
    })

    it('handles lyrics with empty text after time tag', () => {
      const parser = new LyricParser('[00:05.000]\n[00:10.000]Has text')
      const lyrics = parser.getLyrics()
      // Empty text lines are skipped
      expect(lyrics.length).toBe(1)
      expect(lyrics[0].text).toBe('Has text')
    })

    it('[ti:Song] and [ar:Artist] lines are not parsed as metadata or lyrics', () => {
      const parser = new LyricParser(`[ti:Song]
[00:01.000]Line
[ar:Artist]`)
      const meta = parser.getMetadata()
      // Known limitation: bracketed metadata is not extracted
      expect(meta.ti).toBeUndefined()
      expect(meta.ar).toBeUndefined()
      // Only the time-tagged line is a lyric
      expect(parser.getLyrics().length).toBe(1)
    })
  })
})

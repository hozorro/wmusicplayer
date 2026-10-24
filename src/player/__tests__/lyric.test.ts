// player/__tests__/lrc.test.ts
import { describe, expect, it } from 'vitest'
import { findLine, findWordIndex, parseLrc } from '../lyric'

describe('parseLrc', () => {
  it('基础时间戳 + 百分秒/毫秒精度 + CRLF', () => {
    const lines = parseLrc('[00:12.00]第一行\r\n[00:15.5]第二行\n[01:02.250]第三行')
    expect(lines.map(l => l.time)).toEqual([12, 15.5, 62.25])
    expect(lines.map(l => l.text)).toEqual(['第一行', '第二行', '第三行'])
  })

  it('一行多时间标签展开为多条', () => {
    const lines = parseLrc('[00:18.50][00:45.20]重复句')
    expect(lines).toHaveLength(2)
    expect(lines[0].text).toBe('重复句')
    expect(lines[1].time).toBe(45.2)
  })

  it('offset 正值整体提前', () => {
    const lines = parseLrc('[offset:500]\n[00:10.00]行')
    expect(lines[0].time).toBe(9.5)
  })

  it('元数据标签与乱序输入：滤除 + 排序', () => {
    const lines = parseLrc('[ti:标题]\n[ar:歌手]\n[00:30.00]后\n[00:10.00]先')
    expect(lines.map(l => l.text)).toEqual(['先', '后'])
  })
})

describe('findLine', () => {
  const lines = parseLrc('[00:10.00]a\n[00:20.00]b\n[00:30.00]c')
  it.each([
    [9.9, -1], [10, 0], [19.9, 0], [25, 1], [99, 2],
  ])('t=%s → %s', (t, expected) => {
    expect(findLine(lines, t)).toBe(expected)
  })
})
describe('parseLrc 逐字歌词', () => {
  it('解析逐字时间标签', () => {
    const lines = parseLrc('[00:11.780]<00:11.780>曲<00:12.958>：<00:14.136>何<00:15.314>俊<00:16.492>明')
    expect(lines).toHaveLength(1)
    expect(lines[0].text).toBe('曲：何俊明')
    expect(lines[0].words).toBeDefined()
    expect(lines[0].words!.length).toBe(5)
    expect(lines[0].words![0]).toEqual({ time: 11.78, text: '曲' })
    expect(lines[0].words![1]).toEqual({ time: 12.958, text: '：' })
    expect(lines[0].words![4]).toEqual({ time: 16.492, text: '明' })
  })

  it('逐字行 text 不含 <> 标签', () => {
    const lines = parseLrc('[00:10.00]<00:10.00>你<00:11.00>好')
    expect(lines[0].text).toBe('你好')
  })

  it('普通行无 words 字段', () => {
    const lines = parseLrc('[00:10.00]普通行')
    expect(lines[0].words).toBeUndefined()
  })

  it('逐字标签应用 offset', () => {
    const lines = parseLrc('[offset:500]\n[00:10.00]<00:10.00>字')
    expect(lines[0].words![0].time).toBe(9.5)
  })
})

describe('findWordIndex', () => {
  const words = [
    { time: 10, text: 'a' },
    { time: 11, text: 'b' },
    { time: 12, text: 'c' },
  ]
  it.each([
    [9.9, -1], [10, 0], [10.5, 0], [11, 1], [11.9, 1], [99, 2],
  ])('t=%s → %s', (t, expected) => {
    expect(findWordIndex(words, t)).toBe(expected)
  })
})

// player/__tests__/palette.test.ts
import { describe, expect, it } from 'vitest'
import { FALLBACK_PALETTE, ambientize, quantize, rgbToHsl } from '../palette'

const solid = (r: number, g: number, b: number, n = 100) => {
  const d = new Uint8ClampedArray(n * 4)
  for (let i = 0; i < d.length; i += 4) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255 }
  return d
}

describe('ambientize —— 结构化可读性不变量（A42）', () => {
  it('任意输入都被钳制进安全暗区', () => {
    for (const c of [
      { h: 0, s: 1, l: 0.97 },     // 极亮
      { h: 200, s: 0.95, l: 0.7 }, // 高饱和亮
      { h: 60, s: 1, l: 0.5 },
      { h: 0, s: 0, l: 0.01 },     // 极暗
    ]) {
      const a = ambientize(c)
      expect(a.l).toBeGreaterThanOrEqual(0.10)
      expect(a.l).toBeLessThanOrEqual(0.30)
      expect(a.s).toBeLessThanOrEqual(0.6)
    }
  })
})

describe('quantize', () => {
  it('纯红封面 → 主色落在红相区', () => {
    const p = quantize(solid(220, 30, 30))
    expect(p.primary.h).toBeLessThan(20)
    expect(p.primary.s).toBeGreaterThan(0.5)
  })

  it('双色封面 → 副色与主色色相显著分离', () => {
    const data = new Uint8ClampedArray([...solid(200, 40, 40, 50), ...solid(40, 90, 210, 50)])
    const p = quantize(data)
    const dh = Math.abs(p.primary.h - p.secondary.h)
    expect(Math.min(dh, 360 - dh)).toBeGreaterThan(45)
  })

  it('全黑封面 → 兜底调色板', () => {
    expect(quantize(solid(0, 0, 0))).toEqual(FALLBACK_PALETTE)
  })
})

describe('rgbToHsl', () => {
  it('三原色与灰度', () => {
    expect(rgbToHsl(255, 0, 0).h).toBe(0)
    expect(rgbToHsl(0, 255, 0).h).toBe(120)
    expect(rgbToHsl(0, 0, 255).h).toBe(240)
    expect(rgbToHsl(128, 128, 128).s).toBe(0)
  })
})
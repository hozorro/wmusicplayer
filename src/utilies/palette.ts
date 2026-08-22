/** 提取封面色与氛围化：纯函数层，与 Vue 无关 */

export interface Hsl { h: number; s: number; l: number }
export interface Palette { primary: Hsl, secondary: Hsl }

/** 提取失败（跨域污染 / 加载失败）的兜底：暖调深琥珀，与播放键 accent 同族 */
export const FALLBACK_PALETTE: Palette = {
  primary: { h: 179, s: 0.92, l: 0.09 },
  secondary: { h: 176, s: 0.76, l: 0.17 }
}

/** 通用色值运算：Hex 解析、可读文字色、明暗派生 */
export function rgbToHsl(r: number, g: number, b: number): Hsl {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l }
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break
    case g: h = ((b - r) / d + 2) * 60; break
    default: h = ((r - g) / d + 4) * 60
  }
  return { h, s, l }
}

export function hslCss(c: Hsl, alpha: number = 1): string {
  return `hsl(${c.h.toFixed(0)} ${(c.s * 100).toFixed(0)}% ${(c.l * 100).toFixed(0)}% /${alpha})`
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  }
}

/** 相对亮度（简化式）：裁决深浅文字 */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

/** 背景色上的可读文字：亮底深字，暗底亮字 */
export function readableTextColor(bgHex: string): string {
  return luminance(bgHex) > 0.6 ? '#18181b' : '#fafafa'   // zinc-900 / zinc-50
}

/** 在底色上派生明暗变体（dl 为负 = 压暗），返回 hsl css */
export function shade(bgHex: string, dl: number): string {
  const { r, g, b } = hexToRgb(bgHex)
  const { h, s, l } = rgbToHsl(r, g, b)
  return hslCss({ h, s, l: Math.max(0, Math.min(1, l + dl)) })
}

/**
 * 氛围化钳制（dark 主题）—— 结构化可读性第一道锁：
 * 无论封面多亮多艳，进入背景的颜色亮度恒定在[0.12, 0.38]，饱和度 ≤ 0.75
 * 区间刻意保留足够带宽，让不同封面呈现可辨识的深浅/艳淡差异，
 * 文字对比度下限交由 scrim 锁定
 * 此不变量有对应单测，不可悄悄放宽
 */
export function ambientize(c: Hsl): Hsl {
  return {
    h: c.h,
    s: Math.min(c.s, 0.75),
    l: Math.max(0.12, Math.min(c.l, 0.38))
  }
}

/**
 * 氛围化钳制（light 主题）—— 浅色可读性锁：
 * 背景亮度恒定在[0.80, 0.94]，饱和度 ≤ 0.45（粉彩区），
 * 保留封面色相的同时保证深色文字可读
 * 此不变量有对应单测，不可悄悄放宽
 */
export function ambientizeLight(c: Hsl): Hsl {
  return {
    h: c.h,
    s: Math.min(c.s, 0.45),
    l: Math.max(0.80, Math.min(c.l, 0.94))
  }
}

/**
 * 量化取色：色相 12 桶 x 明暗 2 层，饱和度加权（偏爱与背景拉开差距的彩色像素）
 * secondary 取与主色色像差 > 45° 的首个桶，营造“模糊封面”的双色氛围
 */
export function quantize(data: Uint8ClampedArray): Palette {
  const buckets = new Map<number, { r: number; g: number; b: number; w: number }>()
  for (let i = 0; i < data.length; i += 4) {
    const { h, s, l } = rgbToHsl(data[i], data[i + 1], data[i + 2])
    if (l < 0.05 || l > 0.96) continue    // 跳过近黑与近白噪声
    const w = s + 0.08
    const key = Math.floor(h / 30) * 2 + (l >= 0.5 ? 1 : 0)
    const bk = buckets.get(key) ?? { r: 0, g: 0, b: 0, w: 0 }
    bk.r += data[i] * w
    bk.g += data[i + 1] * w
    bk.b += data[i + 2] * w
    bk.w += w
    buckets.set(key, bk)
  }
  const ranked = [...buckets.values()].sort((x, y) => y.w - x.w)
  if (ranked.length === 0) return FALLBACK_PALETTE

  const toHsl = (bk: { r: number; g: number; b: number; w: number }) => 
    rgbToHsl(bk.r / bk.w, bk.g / bk.w, bk.b / bk.w)

  const primary = toHsl(ranked[0])
  let secondary: Hsl | null = null
  for (let i = 1; i < ranked.length; i++) {
    const c = toHsl(ranked[i])
    const dh = Math.abs(c.h - primary.h)
    if (Math.min(dh, 360 - dh) > 45) {
      secondary = c
      break
    }
  }
  return { primary, secondary: secondary ?? { ...primary, l: primary.l * 0.6 } }
}

/**
 * dark 主题四层渐变，模拟“封面极度模糊化”：
 * 顶部主色光晕（全量呈现不再压黑）+ 底部副色光晕 + 顶部副色暗角回响，
 * 基地渐变随主色色相染色并沉入深色 —— 基底随色相走是“不同封面不同背景”的核心
 */
export function ambientGradient(p: Palette): string {
  const a = ambientize(p.primary)
  const b = ambientize(p.secondary)
  return [
    `radial-gradient(120% 85% at 15% 8%, ${hslCss(a, 0.9)} 0%, transparent 56%)`,
    `radial-gradient(130% 95% at 85% 92%, ${hslCss(b, 0.85)} 0%, transparent 60%)`,
    `radial-gradient(80% 60% at 92% 10%, ${hslCss({ ...b, l: b.l * 0.7 }, 0.5)} 0%, transparent 58%)`,
    `linear-gradient(168deg, ${hslCss({ h: a.h, s: a.s * 0.55, l: a.l * 0.8 })} 0%, ${hslCss({ h: a.h, s: 0.25, l: 0.05 })} 100%)`
  ].join(', ')
}

/**
 * light 主题三层渐变：粉彩主/副色光晕 + 近白基地渐入淡彩，
 * 观感为封面的高明度极度模糊化，深色文字直接可读
 */
export function ambientGradientLight(p: Palette): string {
  const a = ambientizeLight(p.primary)
  const b = ambientizeLight(p.secondary)
  return [
    `radial-gradient(120% 85% at 15% 8%, ${hslCss(a, 0.8)} 0%, transparent 56%)`,
    `radial-gradient(130% 95% at 85% 92%, ${hslCss(b, 0.75)} 0%, transparent 60%)`,
    `linear-gradient(168deg, hsl(0 0% 99%) 0%, ${hslCss({ h: a.h, s: a.s * 0.6, l: 0.94 })} 100%)`
  ].join(', ')
}

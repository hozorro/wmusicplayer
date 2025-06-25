type rgbaColor = [
  red: number,
  green: number,
  blue: number,
  alpha?: number
]
export function convertDarkColor(rgba: rgbaColor): rgbaColor {
  const [r, g, b, a] = rgba;
  if (r * 0.299 + g * 0.587 + b * 0.114 > 186) {
    let drgb = [r * 0.299, g * 0.587, b * 0.114]
    let max = Math.max(...drgb);
    let index = drgb.indexOf(max);
    const rgb = [r, g, b]
    let ratio = max / rgb[index]
    return [rgba[0] * ratio, rgba[1] * ratio, rgba[2] * ratio, a]
  }
  return rgba
}


declare type rgbColor = [
  red: number,
  green: number,
  blue: number,
]

declare interface AnalysColors {
  corners: rgbColor[],
  center: rgbColor,
  dominant: rgbColor,
  secondDominant: rgbColor,
  average: rgbColor
}
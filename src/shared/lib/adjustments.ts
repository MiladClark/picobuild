import type { Adjustments } from '../types/project'

export function combinedBrightness(adj: Adjustments): number {
  return adj.brightness + adj.exposure * 0.75
}

export function combinedSaturation(adj: Adjustments): number {
  return adj.saturation + adj.vibrance * 0.5
}

export function combinedHue(adj: Adjustments): number {
  return adj.hue + adj.temperature * 0.25 + adj.tint * 0.15
}

/** Konva HSL filter uses `2 ** saturation`; 0 means neutral. */
export function konvaHslSaturation(adj: Adjustments): number {
  const factor = 1 + combinedSaturation(adj) / 100
  return Math.log2(Math.max(0.01, factor))
}

export function hasActiveAdjustments(adj: Adjustments): boolean {
  return (
    adj.brightness !== 0 ||
    adj.exposure !== 0 ||
    adj.contrast !== 0 ||
    adj.saturation !== 0 ||
    adj.vibrance !== 0 ||
    adj.hue !== 0 ||
    adj.temperature !== 0 ||
    adj.tint !== 0 ||
    adj.sharpness !== 0 ||
    adj.blur !== 0 ||
    adj.highlights !== 0 ||
    adj.shadows !== 0 ||
    adj.whites !== 0 ||
    adj.blacks !== 0
  )
}

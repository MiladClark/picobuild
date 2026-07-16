import Konva from 'konva'
import type { Filter } from 'konva/lib/Node'
import type { Adjustments } from '@shared/types/project'
import {
  combinedBrightness,
  combinedHue,
  hasActiveAdjustments,
  konvaHslSaturation
} from '@shared/lib/adjustments'

export function applyKonvaAdjustments(
  node: Konva.Image,
  adj: Adjustments,
  width: number,
  height: number
): void {
  if (!hasActiveAdjustments(adj)) {
    node.clearCache()
    node.filters([])
    return
  }

  const filters: Filter[] = []
  const brightnessVal = combinedBrightness(adj) / 100
  const needsHsl =
    adj.hue !== 0 ||
    adj.saturation !== 0 ||
    adj.vibrance !== 0 ||
    adj.temperature !== 0 ||
    adj.tint !== 0

  if (brightnessVal !== 0) filters.push(Konva.Filters.Brighten)
  if (adj.contrast !== 0) filters.push(Konva.Filters.Contrast)
  if (needsHsl) filters.push(Konva.Filters.HSL)
  if (adj.blur > 0) filters.push(Konva.Filters.Blur)

  node.filters(filters)

  if (brightnessVal !== 0) {
    node.brightness(Math.max(-1, Math.min(1, brightnessVal)))
  }
  if (adj.contrast !== 0) {
    node.contrast(adj.contrast)
  }
  if (needsHsl) {
    node.hue(combinedHue(adj))
    node.saturation(konvaHslSaturation(adj))
    node.luminance(0)
  }
  if (adj.blur > 0) {
    node.blurRadius(Math.max(1, adj.blur / 4))
  }

  node.cache({
    x: 0,
    y: 0,
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
    pixelRatio: 1
  })
}

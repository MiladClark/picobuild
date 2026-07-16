export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export { formatRenamePattern, ensureUniqueNames } from '../../../shared/lib/format'

export const ASPECT_PRESETS = [
  { label: '1:1', ratio: 1 },
  { label: '4:5', ratio: 4 / 5 },
  { label: '16:9', ratio: 16 / 9 },
  { label: '9:16', ratio: 9 / 16 },
  { label: '3:2', ratio: 3 / 2 }
] as const

export function adjustmentsToCssFilter(adj: {
  brightness: number
  exposure: number
  contrast: number
  saturation: number
  hue: number
  temperature: number
  tint: number
}): string {
  const brightness = 1 + (adj.brightness + adj.exposure * 0.75) / 100
  const contrast = 1 + adj.contrast / 100
  const saturate = 1 + adj.saturation / 100
  const hue = adj.hue + adj.temperature * 0.25 + adj.tint * 0.15
  return `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) hue-rotate(${hue}deg)`
}

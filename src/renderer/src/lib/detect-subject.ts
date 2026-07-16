export interface SubjectBounds {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

interface Rgb {
  r: number
  g: number
  b: number
}

interface SideBackground extends Rgb {
  threshold: number
}

function colorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

function getPixel(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number
): { r: number; g: number; b: number; a: number } {
  const i = (y * width + x) * 4
  return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] }
}

function sampleSideBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  side: 'left' | 'right' | 'top' | 'bottom'
): SideBackground {
  const strip = Math.max(4, Math.round(Math.min(width, height) * 0.025))
  const rs: number[] = []
  const gs: number[] = []
  const bs: number[] = []

  const push = (x: number, y: number): void => {
    const px = getPixel(data, width, x, y)
    rs.push(px.r)
    gs.push(px.g)
    bs.push(px.b)
  }

  if (side === 'left') {
    for (let x = 0; x < strip; x++) {
      for (let y = 0; y < height; y += 2) push(x, y)
    }
  } else if (side === 'right') {
    for (let x = width - strip; x < width; x++) {
      for (let y = 0; y < height; y += 2) push(x, y)
    }
  } else if (side === 'top') {
    for (let y = 0; y < strip; y++) {
      for (let x = 0; x < width; x += 2) push(x, y)
    }
  } else {
    for (let y = height - strip; y < height; y++) {
      for (let x = 0; x < width; x += 2) push(x, y)
    }
  }

  const mean = (values: number[]): number => values.reduce((s, v) => s + v, 0) / values.length
  const std = (values: number[], avg: number): number => {
    const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length
    return Math.sqrt(variance)
  }

  const r = mean(rs)
  const g = mean(gs)
  const b = mean(bs)
  const spread = (std(rs, r) + std(gs, g) + std(bs, b)) / 3
  const threshold = Math.max(14, Math.min(48, spread * 2.2 + 12))

  return { r, g, b, threshold }
}

function nearestSideBackground(
  x: number,
  y: number,
  width: number,
  height: number,
  sides: {
    left: SideBackground
    right: SideBackground
    top: SideBackground
    bottom: SideBackground
  }
): SideBackground {
  const distLeft = x
  const distRight = width - 1 - x
  const distTop = y
  const distBottom = height - 1 - y
  const min = Math.min(distLeft, distRight, distTop, distBottom)

  if (min === distLeft) return sides.left
  if (min === distRight) return sides.right
  if (min === distTop) return sides.top
  return sides.bottom
}

function isObjectPixel(
  px: { r: number; g: number; b: number; a: number },
  bg: SideBackground,
  hasTransparency: boolean,
  alphaThreshold: number
): boolean {
  if (hasTransparency) return px.a > alphaThreshold
  return colorDistance(px.r, px.g, px.b, bg.r, bg.g, bg.b) > bg.threshold
}

function trimObjectBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  hasTransparency: boolean,
  alphaThreshold: number
): SubjectBounds | null {
  const sides = {
    left: sampleSideBackground(data, width, height, 'left'),
    right: sampleSideBackground(data, width, height, 'right'),
    top: sampleSideBackground(data, width, height, 'top'),
    bottom: sampleSideBackground(data, width, height, 'bottom')
  }

  let left = width
  let right = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = getPixel(data, width, x, y)
      const bg = nearestSideBackground(x, y, width, height, sides)
      if (isObjectPixel(px, bg, hasTransparency, alphaThreshold)) {
        if (x < left) left = x
        break
      }
    }

    for (let x = width - 1; x >= 0; x--) {
      const px = getPixel(data, width, x, y)
      const bg = nearestSideBackground(x, y, width, height, sides)
      if (isObjectPixel(px, bg, hasTransparency, alphaThreshold)) {
        if (x > right) right = x
        break
      }
    }
  }

  if (right < left) return null

  let top = height
  let bottom = -1

  for (let x = left; x <= right; x++) {
    for (let y = 0; y < height; y++) {
      const px = getPixel(data, width, x, y)
      const bg = nearestSideBackground(x, y, width, height, sides)
      if (isObjectPixel(px, bg, hasTransparency, alphaThreshold)) {
        if (y < top) top = y
        break
      }
    }

    for (let y = height - 1; y >= 0; y--) {
      const px = getPixel(data, width, x, y)
      const bg = nearestSideBackground(x, y, width, height, sides)
      if (isObjectPixel(px, bg, hasTransparency, alphaThreshold)) {
        if (y > bottom) bottom = y
        break
      }
    }
  }

  if (bottom < top) return null

  return {
    left,
    top,
    right: right + 1,
    bottom: bottom + 1,
    width: right + 1 - left,
    height: bottom + 1 - top
  }
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image for subject detection'))
    img.src = dataUrl
  })
}

export function detectSubjectFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number
): SubjectBounds {
  const alphaThreshold = 24

  let hasTransparency = false
  for (let i = 3; i < data.length; i += 16) {
    if (data[i] < 250) {
      hasTransparency = true
      break
    }
  }

  const trimmed = trimObjectBounds(data, width, height, hasTransparency, alphaThreshold)
  if (trimmed && trimmed.width > 0 && trimmed.height > 0) {
    return trimmed
  }

  if (hasTransparency) {
    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0
    let found = false

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (getPixel(data, width, x, y).a > alphaThreshold) {
          found = true
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
    }

    if (found) {
      return {
        left: minX,
        top: minY,
        right: maxX + 1,
        bottom: maxY + 1,
        width: maxX + 1 - minX,
        height: maxY + 1 - minY
      }
    }
  }

  return { left: 0, top: 0, right: width, bottom: height, width, height }
}

export async function detectSubjectFromDataUrl(
  dataUrl: string,
  sourceWidth?: number,
  sourceHeight?: number
): Promise<SubjectBounds> {
  const img = await loadImage(dataUrl)
  const maxDim = 1600
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
  const width = Math.max(1, Math.round(img.naturalWidth * scale))
  const height = Math.max(1, Math.round(img.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return {
      left: 0,
      top: 0,
      right: img.naturalWidth,
      bottom: img.naturalHeight,
      width: img.naturalWidth,
      height: img.naturalHeight
    }
  }

  ctx.drawImage(img, 0, 0, width, height)
  const imageData = ctx.getImageData(0, 0, width, height)
  const bounds = detectSubjectFromImageData(imageData.data, width, height)

  const scaleToSourceX = (sourceWidth ?? img.naturalWidth) / img.naturalWidth
  const scaleToSourceY = (sourceHeight ?? img.naturalHeight) / img.naturalHeight
  const inv = 1 / scale

  return {
    left: Math.round(bounds.left * inv * scaleToSourceX),
    top: Math.round(bounds.top * inv * scaleToSourceY),
    right: Math.round(bounds.right * inv * scaleToSourceX),
    bottom: Math.round(bounds.bottom * inv * scaleToSourceY),
    width: Math.round(bounds.width * inv * scaleToSourceX),
    height: Math.round(bounds.height * inv * scaleToSourceY)
  }
}

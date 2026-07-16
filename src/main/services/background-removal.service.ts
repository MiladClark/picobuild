import { app } from 'electron'
import { dirname, join, sep } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { createRequire } from 'module'
import { pathToFileURL } from 'url'
import { fork } from 'child_process'
import { is } from '@electron-toolkit/utils'
import sharp from 'sharp'

export interface SubjectBounds {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
  imageWidth: number
  imageHeight: number
}

export type RemovalProgress = (progress: number) => void

/** 'best' (medium model) gives noticeably cleaner masks than 'fast' (small); despeckle is on by default. */
export interface RemovalOptions {
  quality?: 'fast' | 'best'
  despeckle?: boolean
}

/** Rewrite an app.asar path to its asar.unpacked twin (native deps are unpacked). */
function unpacked(p: string): string {
  const seg = `app.asar${sep}`
  if (p.includes(seg) && !p.includes('app.asar.unpacked')) {
    return p.replace(seg, `app.asar.unpacked${sep}`)
  }
  return p
}

/** Absolute path to the installed @imgly/background-removal-node entry file. */
function imglyEntry(): string {
  const require = createRequire(__filename)
  return unpacked(require.resolve('@imgly/background-removal-node'))
}

/** file:// URL of the package's dist dir, which holds resources.json + model chunks. */
function imglyPublicPath(): string {
  return pathToFileURL(dirname(imglyEntry()) + sep).href
}

/** Path to the forked worker script (shipped under resources/, unpacked from asar). */
function workerPath(): string {
  const base = is.dev
    ? join(app.getAppPath(), 'resources')
    : join(process.resourcesPath, 'resources')
  return join(base, 'bg-removal-worker.cjs')
}

/**
 * Run the segmentation model on a source image and return an RGBA PNG buffer
 * (subject opaque, background transparent) at the source resolution.
 *
 * The model runs in a forked child process: onnxruntime-node and sharp's
 * libvips crash if loaded in the same process, and the main process owns sharp.
 */
export async function computeCutout(
  sourcePath: string,
  onProgress?: RemovalProgress,
  model: 'small' | 'medium' = 'medium'
): Promise<Buffer> {
  // Normalize to PNG in the main process (sharp handles every input format),
  // then hand the bytes to the worker so it only ever decodes PNG.
  const inputPng = await sharp(sourcePath).png().toBuffer()

  return new Promise((resolve, reject) => {
    const child = fork(workerPath(), [], {
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
    })

    let settled = false
    const finish = (fn: () => void): void => {
      if (settled) return
      settled = true
      fn()
    }

    child.on(
      'message',
      (msg: {
        type: string
        current?: number
        total?: number
        data?: string
        message?: string
      }) => {
        if (msg.type === 'progress') {
          if (onProgress) {
            const total = msg.total ?? 1
            const frac = total > 0 ? (msg.current ?? 0) / total : 0
            onProgress(15 + Math.round(frac * 70))
          }
        } else if (msg.type === 'done') {
          finish(() => resolve(Buffer.from(msg.data ?? '', 'base64')))
        } else if (msg.type === 'error') {
          finish(() => reject(new Error(msg.message || 'Background removal failed')))
        }
      }
    )

    child.on('error', (err) => finish(() => reject(err)))
    child.on('exit', (code) => {
      finish(() => reject(new Error(`Background removal worker exited (code ${code})`)))
    })

    child.send({
      imglyPath: imglyEntry(),
      publicPath: imglyPublicPath(),
      inputData: inputPng.toString('base64'),
      model
    })
  })
}

/**
 * Remove the background and persist the cutout next to the source image.
 * Returns the absolute path of the written PNG.
 */
export async function removeBackgroundToFile(
  sourcePath: string,
  assetId: string,
  onProgress?: RemovalProgress,
  options?: RemovalOptions
): Promise<string> {
  onProgress?.(5)
  const model = options?.quality === 'fast' ? 'small' : 'medium'
  const rawCutout = await computeCutout(sourcePath, onProgress, model)
  onProgress?.(88)

  const cutout = options?.despeckle === false ? rawCutout : await despeckleCutout(rawCutout)
  onProgress?.(95)

  const cacheDir = join(dirname(sourcePath), '.picobuild-cache')
  if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true })
  const outputPath = join(cacheDir, `${assetId}-nobg.png`)
  await sharp(cutout).png().toFile(outputPath)

  onProgress?.(100)
  return outputPath
}

const ALPHA_THRESHOLD = 24
const SCAN_MAX_DIM = 1024
// Fraction of the scan's min dimension used to bridge small gaps between
// alpha blobs (e.g. a pair of earrings) before picking the dominant one.
const MERGE_RADIUS_FRACTION = 0.015
const MERGE_RADIUS_MIN = 3
const MERGE_RADIUS_MAX = 22
// Reject a "winning" blob this small relative to the scan area — it's noise,
// not a subject (e.g. a lone bright pixel a segmentation model left behind).
const MIN_COMPONENT_AREA_FRACTION = 0.0015
// Segmentation masks are rarely clean 0/255 — they carry a wide halo of
// low-confidence, partially-transparent pixels (soft shadows, feathered
// edges, residual noise) that can stretch across most of the frame. Picking
// the biggest blob at ALPHA_THRESHOLD alone lets that faint, sprawling halo
// (once bridged by the merge radius) outweigh the small, solidly-opaque
// product. So try strict ("confidently opaque") thresholds first — noise
// rarely clears them — and only fall back to the loose threshold if nothing
// substantial is found there.
const CORE_ALPHA_THRESHOLDS = [200, 140, 90, ALPHA_THRESHOLD]
// Strict thresholds can shave a couple of soft/anti-aliased edge pixels off
// the true silhouette — pad back out a little so the crop isn't shrink-wrapped.
const EDGE_PADDING_FRACTION = 0.015

/** 1D box dilation along rows via prefix sums — O(width*height), no O(radius) inner loop. */
function dilateHorizontal(
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number
): Uint8Array {
  const out = new Uint8Array(width * height)
  const prefix = new Int32Array(width + 1)
  for (let y = 0; y < height; y++) {
    const row = y * width
    prefix[0] = 0
    for (let x = 0; x < width; x++) {
      prefix[x + 1] = prefix[x] + mask[row + x]
    }
    for (let x = 0; x < width; x++) {
      const lo = Math.max(0, x - radius)
      const hi = Math.min(width, x + radius + 1)
      out[row + x] = prefix[hi] - prefix[lo] > 0 ? 1 : 0
    }
  }
  return out
}

/** 1D box dilation along columns via prefix sums. */
function dilateVertical(
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number
): Uint8Array {
  const out = new Uint8Array(width * height)
  const prefix = new Int32Array(height + 1)
  for (let x = 0; x < width; x++) {
    prefix[0] = 0
    for (let y = 0; y < height; y++) {
      prefix[y + 1] = prefix[y] + mask[y * width + x]
    }
    for (let y = 0; y < height; y++) {
      const lo = Math.max(0, y - radius)
      const hi = Math.min(height, y + radius + 1)
      out[y * width + x] = prefix[hi] - prefix[lo] > 0 ? 1 : 0
    }
  }
  return out
}

interface ComponentBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  area: number
}

interface ComponentLabeling {
  /** 1 where alpha clears `threshold` (the raw, undilated foreground test). */
  isFg: Uint8Array
  /** Component id per pixel (shared across dilation-bridged blobs); -1 = background. */
  labels: Int32Array
  bestLabel: number
  bestArea: number
}

/**
 * Label connected blobs of pixels whose alpha clears `threshold`. Connectivity
 * is computed on a mildly dilated copy of the mask (so nearby parts of one
 * subject, e.g. a pair of earrings, count as a single blob), while each
 * component's area is measured from the true (undilated) pixels — this lets
 * distant, disconnected noise (stray bright specks, segmentation artifacts)
 * lose to the real subject on pixel count instead of quietly merging into it.
 */
function labelAlphaComponents(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  mergeRadius: number,
  threshold: number
): ComponentLabeling {
  const size = width * height
  const isFg = new Uint8Array(size)
  for (let i = 0; i < size; i++) {
    isFg[i] = data[i * channels + (channels - 1)] > threshold ? 1 : 0
  }

  const connectMask =
    mergeRadius > 0
      ? dilateVertical(
          dilateHorizontal(isFg, width, height, mergeRadius),
          width,
          height,
          mergeRadius
        )
      : isFg

  const labels = new Int32Array(size).fill(-1)
  const queue = new Int32Array(size)
  let bestLabel = -1
  let bestArea = 0
  let nextLabel = 0

  for (let start = 0; start < size; start++) {
    if (!connectMask[start] || labels[start] !== -1) continue

    const label = nextLabel++
    let qHead = 0
    let qTail = 0
    queue[qTail++] = start
    labels[start] = label
    let area = 0

    while (qHead < qTail) {
      const idx = queue[qHead++]
      if (isFg[idx]) area++

      const x = idx % width
      const y = (idx / width) | 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
          const nIdx = ny * width + nx
          if (!connectMask[nIdx] || labels[nIdx] !== -1) continue
          labels[nIdx] = label
          queue[qTail++] = nIdx
        }
      }
    }

    if (area > bestArea) {
      bestArea = area
      bestLabel = label
    }
  }

  return { isFg, labels, bestLabel, bestArea }
}

/** Bounding box of the true (undilated) foreground pixels belonging to the winning label. */
function boundsFromLabeling(labeling: ComponentLabeling, width: number): ComponentBounds | null {
  const { isFg, labels, bestLabel } = labeling
  if (bestLabel < 0) return null

  let minX = width
  let minY = Infinity
  let maxX = -1
  let maxY = -1
  let area = 0

  for (let idx = 0; idx < labels.length; idx++) {
    if (labels[idx] !== bestLabel || !isFg[idx]) continue
    const x = idx % width
    const y = (idx / width) | 0
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
    area++
  }

  if (area === 0) return null
  return { minX, minY, maxX, maxY, area }
}

/** Every pixel reachable (via the dilated connectivity) from the winning label — includes its soft/feathered halo, not just the strict-threshold core. */
function keepMaskFromLabeling(labeling: ComponentLabeling): Uint8Array {
  const { labels, bestLabel } = labeling
  const mask = new Uint8Array(labels.length)
  if (bestLabel < 0) return mask
  for (let i = 0; i < labels.length; i++) {
    mask[i] = labels[i] === bestLabel ? 1 : 0
  }
  return mask
}

/**
 * Compute the tight bounding box of the opaque region of an RGBA buffer,
 * scanning a downscaled copy for speed and mapping the result back to the
 * original resolution. Tries strict ("confidently opaque") alpha thresholds
 * before the loose one, so a soft, sprawling low-confidence halo can't
 * outweigh the actual product; only the dominant connected blob at whichever
 * threshold wins counts, so isolated noise elsewhere in the frame can't
 * expand the box either.
 */
async function alphaBounds(rgbaPng: Buffer): Promise<SubjectBounds | null> {
  const meta = await sharp(rgbaPng).metadata()
  const imageWidth = meta.width ?? 0
  const imageHeight = meta.height ?? 0
  if (imageWidth === 0 || imageHeight === 0) return null

  const scale = Math.min(1, SCAN_MAX_DIM / Math.max(imageWidth, imageHeight))
  const scanW = Math.max(1, Math.round(imageWidth * scale))
  const scanH = Math.max(1, Math.round(imageHeight * scale))

  const { data, info } = await sharp(rgbaPng)
    .resize(scanW, scanH, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const mergeRadius = Math.min(
    MERGE_RADIUS_MAX,
    Math.max(
      MERGE_RADIUS_MIN,
      Math.round(Math.min(info.width, info.height) * MERGE_RADIUS_FRACTION)
    )
  )
  const scanArea = info.width * info.height
  const minArea = scanArea * MIN_COMPONENT_AREA_FRACTION

  let component: ComponentBounds | null = null
  for (const threshold of CORE_ALPHA_THRESHOLDS) {
    const labeling = labelAlphaComponents(
      data,
      info.width,
      info.height,
      info.channels,
      mergeRadius,
      threshold
    )
    if (labeling.bestLabel >= 0 && labeling.bestArea >= minArea) {
      component = boundsFromLabeling(labeling, info.width)
      if (component) break
    }
  }
  if (!component) return null

  const inv = 1 / scale
  let left = Math.max(0, Math.floor(component.minX * inv))
  let top = Math.max(0, Math.floor(component.minY * inv))
  let right = Math.min(imageWidth, Math.ceil((component.maxX + 1) * inv))
  let bottom = Math.min(imageHeight, Math.ceil((component.maxY + 1) * inv))

  const padX = Math.round((right - left) * EDGE_PADDING_FRACTION)
  const padY = Math.round((bottom - top) * EDGE_PADDING_FRACTION)
  left = Math.max(0, left - padX)
  top = Math.max(0, top - padY)
  right = Math.min(imageWidth, right + padX)
  bottom = Math.min(imageHeight, bottom + padY)

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
    imageWidth,
    imageHeight
  }
}

/**
 * Zero out (make transparent) any alpha region that isn't part of the
 * dominant subject blob. Segmentation models — especially on busy or
 * low-contrast backgrounds — often leave faint, disconnected residue (soft
 * shadow ghosts, noise) that a naive "keep any non-zero alpha" cutout ships
 * as visible background patches. This reuses the same strict-first threshold
 * ladder as `alphaBounds` to find the real subject, then fades everything
 * else in the frame to fully transparent, working on a downscaled mask
 * (cheap) and applying it to the full-resolution alpha (correct output).
 */
async function despeckleCutout(rgbaPng: Buffer): Promise<Buffer> {
  const meta = await sharp(rgbaPng).metadata()
  const imageWidth = meta.width ?? 0
  const imageHeight = meta.height ?? 0
  if (imageWidth === 0 || imageHeight === 0) return rgbaPng

  const scale = Math.min(1, SCAN_MAX_DIM / Math.max(imageWidth, imageHeight))
  const scanW = Math.max(1, Math.round(imageWidth * scale))
  const scanH = Math.max(1, Math.round(imageHeight * scale))

  const { data: scanData, info: scanInfo } = await sharp(rgbaPng)
    .resize(scanW, scanH, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const mergeRadius = Math.min(
    MERGE_RADIUS_MAX,
    Math.max(
      MERGE_RADIUS_MIN,
      Math.round(Math.min(scanInfo.width, scanInfo.height) * MERGE_RADIUS_FRACTION)
    )
  )
  const scanArea = scanInfo.width * scanInfo.height
  const minArea = scanArea * MIN_COMPONENT_AREA_FRACTION

  let keepMask: Uint8Array | null = null
  for (const threshold of CORE_ALPHA_THRESHOLDS) {
    const labeling = labelAlphaComponents(
      scanData,
      scanInfo.width,
      scanInfo.height,
      scanInfo.channels,
      mergeRadius,
      threshold
    )
    if (labeling.bestLabel >= 0 && labeling.bestArea >= minArea) {
      keepMask = keepMaskFromLabeling(labeling)
      break
    }
  }
  // Nothing confidently found (e.g. a genuinely soft/diffuse subject with no
  // solid core anywhere) — leave the cutout untouched rather than guessing.
  if (!keepMask) return rgbaPng

  // Grow the keep region a little further so this can't nibble into the
  // subject's own soft, gradually-fading edge.
  const featherRadius = Math.max(2, Math.round(mergeRadius * 0.6))
  const grownMask = dilateVertical(
    dilateHorizontal(keepMask, scanInfo.width, scanInfo.height, featherRadius),
    scanInfo.width,
    scanInfo.height,
    featherRadius
  )

  const maskBytes = Buffer.alloc(grownMask.length)
  for (let i = 0; i < grownMask.length; i++) maskBytes[i] = grownMask[i] ? 255 : 0

  // Upscale with a smooth kernel: the mask boundary sits out in the
  // noise/halo region well outside the subject's true edge, so a soft ramp
  // there just fades the removed residue out gently instead of a hard seam.
  const upscaledMask = await sharp(maskBytes, {
    raw: { width: scanInfo.width, height: scanInfo.height, channels: 1 }
  })
    .resize(imageWidth, imageHeight, { kernel: 'cubic' })
    .raw()
    .toBuffer()

  const { data: fullData, info: fullInfo } = await sharp(rgbaPng)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const channels = fullInfo.channels
  const out = Buffer.from(fullData)
  const pixelCount = imageWidth * imageHeight
  for (let p = 0; p < pixelCount; p++) {
    const alphaIdx = p * channels + (channels - 1)
    out[alphaIdx] = Math.round((out[alphaIdx] * upscaledMask[p]) / 255)
  }

  return sharp(out, { raw: { width: imageWidth, height: imageHeight, channels } })
    .png()
    .toBuffer()
}

/**
 * Detect the product/subject bounds in an image. If the image already has a
 * meaningful alpha channel (e.g. a background-removed asset) its transparency
 * is used directly; otherwise the segmentation model produces a mask.
 */
export async function detectSubjectBounds(path: string): Promise<SubjectBounds> {
  const meta = await sharp(path).metadata()
  const imageWidth = meta.width ?? 0
  const imageHeight = meta.height ?? 0

  let usableAlpha = false
  if (meta.hasAlpha) {
    const stats = await sharp(path).stats()
    const alpha = stats.channels[stats.channels.length - 1]
    // A flat, fully-opaque alpha channel carries no subject information.
    usableAlpha = alpha.min < 250 - ALPHA_THRESHOLD
  }

  const rgba = usableAlpha
    ? await sharp(path).ensureAlpha().png().toBuffer()
    : await computeCutout(path, undefined, 'medium')

  const bounds = await alphaBounds(rgba)
  if (bounds) return bounds

  return {
    left: 0,
    top: 0,
    right: imageWidth,
    bottom: imageHeight,
    width: imageWidth,
    height: imageHeight,
    imageWidth,
    imageHeight
  }
}

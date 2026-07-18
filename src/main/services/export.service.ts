import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import sharp, { type Sharp } from 'sharp'
import type { Adjustments, ExportFormat, ImageAsset, Project } from '../../shared/types/project'
import { combinedBrightness, combinedHue, combinedSaturation } from '../../shared/lib/adjustments'
import { formatRenamePattern, ensureUniqueNames } from '../../shared/lib/format'

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const color = hex.replace('#', '')
  return {
    r: parseInt(color.slice(0, 2), 16),
    g: parseInt(color.slice(2, 4), 16),
    b: parseInt(color.slice(4, 6), 16)
  }
}

function parseHexColorSafe(value: string, fallback: string): { r: number; g: number; b: number } {
  const normalized = value.trim()
  const hex = /^#?[0-9a-fA-F]{6}$/.test(normalized)
    ? normalized.startsWith('#')
      ? normalized
      : `#${normalized}`
    : fallback
  return parseHexColor(hex)
}

async function resolveSourcePath(asset: ImageAsset): Promise<string> {
  if (asset.processedPath && existsSync(asset.processedPath)) {
    try {
      const meta = await sharp(asset.processedPath).metadata()
      if (meta.width && meta.height && meta.format) {
        return asset.processedPath
      }
    } catch {
      // Fall back to original source when cached processed image is invalid.
    }
  }

  if (!existsSync(asset.sourcePath)) {
    throw new Error(`Source image not found: ${asset.sourcePath}`)
  }

  return asset.sourcePath
}

async function toEncodedPngBuffer(pipeline: Sharp): Promise<Buffer> {
  const buffer = await pipeline.ensureAlpha().png().toBuffer()
  if (buffer.length < 8 || buffer.readUInt32BE(0) !== 0x89504e47) {
    throw new Error('Failed to encode image layer for export')
  }
  return buffer
}

interface CompositePlacement {
  input: Buffer
  left: number
  top: number
}

async function prepareCompositeLayer(
  imageBuffer: Buffer,
  left: number,
  top: number,
  canvasWidth: number,
  canvasHeight: number
): Promise<CompositePlacement | null> {
  const meta = await sharp(imageBuffer).metadata()
  const imageWidth = meta.width ?? 0
  const imageHeight = meta.height ?? 0
  if (imageWidth <= 0 || imageHeight <= 0) return null

  const roundedLeft = Math.round(left)
  const roundedTop = Math.round(top)
  const cropLeft = Math.max(0, -roundedLeft)
  const cropTop = Math.max(0, -roundedTop)
  const placeLeft = Math.max(0, roundedLeft)
  const placeTop = Math.max(0, roundedTop)
  const cropWidth = Math.min(imageWidth - cropLeft, canvasWidth - placeLeft)
  const cropHeight = Math.min(imageHeight - cropTop, canvasHeight - placeTop)

  if (cropWidth <= 0 || cropHeight <= 0) return null

  const needsCrop =
    cropLeft > 0 || cropTop > 0 || cropWidth < imageWidth || cropHeight < imageHeight

  const input = needsCrop
    ? await sharp(imageBuffer)
        .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
        .png()
        .toBuffer()
    : imageBuffer

  return { input, left: placeLeft, top: placeTop }
}

function createCanvasBackground(canvas: Project['canvas']): Sharp {
  const { width, height } = canvas

  if (canvas.background.type === 'transparent') {
    return sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
  }

  if (canvas.background.type === 'gradient') {
    const start = parseHexColorSafe(canvas.background.value, '#ffffff')
    const end = parseHexColorSafe(canvas.background.gradientEnd ?? '#000000', '#000000')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgb(${start.r},${start.g},${start.b})"/>
          <stop offset="100%" stop-color="rgb(${end.r},${end.g},${end.b})"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
    </svg>`
    return sharp(Buffer.from(svg)).resize(width, height).png()
  }

  const { r, g, b } = parseHexColorSafe(canvas.background.value, '#ffffff')
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r, g, b, alpha: 255 }
    }
  })
}

function applyAdjustments(pipeline: Sharp, adj: Adjustments): Sharp {
  let p = pipeline

  const brightness = 1 + combinedBrightness(adj) / 100
  const saturation = 1 + combinedSaturation(adj) / 100
  const hue = Math.round(combinedHue(adj))

  if (brightness !== 1 || saturation !== 1 || hue !== 0) {
    p = p.modulate({ brightness, saturation, hue })
  }

  if (adj.contrast !== 0) {
    const c = adj.contrast / 100
    p = p.linear(1 + c, -128 * c)
  }

  if (adj.highlights !== 0 || adj.shadows !== 0) {
    const gamma = 1 - (adj.shadows - adj.highlights) / 400
    if (gamma > 0.2 && gamma < 3) {
      p = p.gamma(gamma)
    }
  }

  if (adj.blur > 0) {
    p = p.blur(Math.max(0.3, adj.blur / 10))
  }

  if (adj.sharpness > 0) {
    p = p.sharpen({ sigma: Math.max(0.3, adj.sharpness / 15) })
  }

  return p
}

async function clampCrop(
  sourcePath: string,
  crop: NonNullable<ImageAsset['transform']['crop']>
): Promise<NonNullable<ImageAsset['transform']['crop']>> {
  const meta = await sharp(sourcePath).metadata()
  const maxW = meta.width ?? crop.width
  const maxH = meta.height ?? crop.height
  const x = Math.max(0, Math.min(Math.round(crop.x), maxW - 1))
  const y = Math.max(0, Math.min(Math.round(crop.y), maxH - 1))
  const width = Math.max(1, Math.min(Math.round(crop.width), maxW - x))
  const height = Math.max(1, Math.min(Math.round(crop.height), maxH - y))
  return { x, y, width, height }
}

function getFormatExt(format: ExportFormat): string {
  return format === 'jpg' ? '.jpg' : `.${format}`
}

export interface ExportResult {
  assetId: string
  fileName: string
  outputPath: string
  status: 'completed' | 'failed'
  error?: string
}

export interface ExportProgress {
  jobId: string
  progress: number
  current: number
  total: number
  item?: ExportResult
}

const activeJobs = new Map<string, { cancelled: boolean }>()

export function cancelExportJob(jobId: string): void {
  const job = activeJobs.get(jobId)
  if (job) job.cancelled = true
}

/** Used by the updater to avoid replacing the app binary mid-export. */
export function hasActiveExportJobs(): boolean {
  return activeJobs.size > 0
}

export interface ExportRunResult {
  results: ExportResult[]
  cancelled: boolean
}

export async function exportAssets(
  project: Project,
  assetIds: string[],
  outputDir: string,
  jobId: string,
  onProgress: (p: ExportProgress) => void
): Promise<ExportRunResult> {
  activeJobs.set(jobId, { cancelled: false })
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true })

  const assets = project.assets.filter((a) => assetIds.includes(a.id))
  const format = project.exportSettings.format
  const ext = getFormatExt(format)

  const rawNames = assets.map((a, i) => {
    const name = formatRenamePattern(
      project.exportSettings.renamePattern,
      project.name,
      a.displayName,
      i + 1
    )
    return `${name}${ext}`
  })
  const fileNames = ensureUniqueNames(rawNames)

  const results: ExportResult[] = []
  const total = assets.length
  let cancelled = false

  for (let i = 0; i < assets.length; i++) {
    const job = activeJobs.get(jobId)
    if (job?.cancelled) {
      cancelled = true
      break
    }

    const asset = assets[i]
    const fileName = fileNames[i]
    const outputPath = join(outputDir, fileName)

    try {
      await renderAsset(project, asset, outputPath, format, project.exportSettings.quality)
      const result: ExportResult = {
        assetId: asset.id,
        fileName,
        outputPath,
        status: 'completed'
      }
      results.push(result)
      onProgress({
        jobId,
        progress: ((i + 1) / total) * 100,
        current: i + 1,
        total,
        item: result
      })
    } catch (err) {
      const result: ExportResult = {
        assetId: asset.id,
        fileName,
        outputPath,
        status: 'failed',
        error: String(err)
      }
      results.push(result)
      onProgress({
        jobId,
        progress: ((i + 1) / total) * 100,
        current: i + 1,
        total,
        item: result
      })
    }
  }

  activeJobs.delete(jobId)
  return { results, cancelled }
}

async function renderAsset(
  project: Project,
  asset: ImageAsset,
  outputPath: string,
  format: ExportFormat,
  quality: number
): Promise<void> {
  const sourcePath = await resolveSourcePath(asset)
  const { canvas, margins } = project

  let image = sharp(sourcePath)
  if (asset.transform.crop) {
    const crop = await clampCrop(sourcePath, asset.transform.crop)
    image = image.extract({
      left: crop.x,
      top: crop.y,
      width: crop.width,
      height: crop.height
    })
  }

  const targetW = Math.max(1, Math.round(asset.transform.width))
  const targetH = Math.max(1, Math.round(asset.transform.height))
  image = image.resize(targetW, targetH, { fit: 'fill' })

  if (asset.transform.flipX) {
    image = image.flop()
  }
  if (asset.transform.flipY) {
    image = image.flip()
  }

  if (asset.transform.rotation !== 0) {
    image = image.rotate(asset.transform.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
  }

  image = applyAdjustments(image, asset.adjustments)
  const imageBuffer = await toEncodedPngBuffer(image)

  const placement = await prepareCompositeLayer(
    imageBuffer,
    margins.left + asset.transform.x,
    margins.top + asset.transform.y,
    canvas.width,
    canvas.height
  )

  let pipeline = createCanvasBackground(canvas)
  if (placement) {
    pipeline = pipeline.composite([
      {
        input: placement.input,
        left: placement.left,
        top: placement.top
      }
    ])
  }

  if (format === 'jpg') {
    const flattenBg =
      canvas.background.type === 'transparent'
        ? { r: 255, g: 255, b: 255 }
        : parseHexColorSafe(canvas.background.value, '#ffffff')
    pipeline = pipeline.flatten({ background: { ...flattenBg, alpha: 255 } })
  }

  switch (format) {
    case 'png':
      await pipeline.png().toFile(outputPath)
      break
    case 'jpg':
      await pipeline.jpeg({ quality }).toFile(outputPath)
      break
    case 'webp':
      await pipeline.webp({ quality, alphaQuality: quality }).toFile(outputPath)
      break
    case 'avif':
      await pipeline.avif({ quality }).toFile(outputPath)
      break
  }
}

export function estimateExportSize(project: Project, count: number): number {
  const pixels = project.canvas.width * project.canvas.height
  const q = project.exportSettings.quality / 100
  const bytesPerPixel = project.exportSettings.format === 'png' ? 3 : 0.5 * q
  return Math.round(pixels * bytesPerPixel * count)
}

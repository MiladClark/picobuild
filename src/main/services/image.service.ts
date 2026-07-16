import { existsSync, statSync } from 'fs'
import { basename, extname } from 'path'
import sharp from 'sharp'
import type { ImageMetadata } from '../../shared/types/project'

const IMAGE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.bmp', '.tiff', '.tif'
])

export function isImageFile(filePath: string): boolean {
  return IMAGE_EXTENSIONS.has(extname(filePath).toLowerCase())
}

export async function getImageMetadata(filePath: string): Promise<ImageMetadata> {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }
  const stats = statSync(filePath)
  const meta = await sharp(filePath).metadata()
  return {
    name: basename(filePath),
    format: meta.format ?? extname(filePath).slice(1),
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    size: stats.size,
    path: filePath
  }
}

export async function generateThumbnail(
  filePath: string,
  maxSize = 120
): Promise<Buffer> {
  return sharp(filePath)
    .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer()
}

export function fileExists(filePath: string): boolean {
  return existsSync(filePath)
}

export async function getImagePreviewDataUrl(
  filePath: string,
  maxSize = 2048
): Promise<string> {
  const meta = await sharp(filePath).metadata()
  const mime =
    meta.format === 'png'
      ? 'image/png'
      : meta.format === 'webp'
        ? 'image/webp'
        : meta.format === 'gif'
          ? 'image/gif'
          : 'image/jpeg'

  const buffer = await sharp(filePath)
    .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
    .toBuffer()

  return `data:${mime};base64,${buffer.toString('base64')}`
}

export async function getImageDataUrl(filePath: string): Promise<string> {
  const buffer = await sharp(filePath).toBuffer()
  const meta = await sharp(filePath).metadata()
  const mime = meta.format === 'png' ? 'image/png' : meta.format === 'webp' ? 'image/webp' : 'image/jpeg'
  return `data:${mime};base64,${buffer.toString('base64')}`
}

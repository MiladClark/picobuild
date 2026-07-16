import { randomUUID } from '@renderer/lib/id'
import { detectSubjectFromDataUrl } from '@renderer/lib/detect-subject'
import { DEFAULT_ADJUSTMENTS } from '@shared/types/project'
import type { ImageAsset, Project, Transform } from '@shared/types/project'

export function computeFitTransform(
  metaWidth: number,
  metaHeight: number,
  project: Project
): ImageAsset['transform'] {
  const fitW = project.canvas.width - project.margins.left - project.margins.right
  const fitH = project.canvas.height - project.margins.top - project.margins.bottom
  const scale = Math.min(fitW / metaWidth, fitH / metaHeight, 1)
  const width = metaWidth * scale
  const height = metaHeight * scale
  return {
    x: (fitW - width) / 2,
    y: (fitH - height) / 2,
    width,
    height,
    rotation: 0,
    flipX: false,
    flipY: false
  }
}

export function computeSubjectGridTransform(
  metaWidth: number,
  metaHeight: number,
  subject: { left: number; top: number; width: number; height: number },
  project: Project
): Transform {
  const { margins, canvas } = project
  const contentLeft = margins.left
  const contentTop = margins.top
  const contentRight = canvas.width - margins.right
  const contentBottom = canvas.height - margins.bottom
  const contentW = contentRight - contentLeft
  const contentH = contentBottom - contentTop

  if (subject.width <= 0 || subject.height <= 0) {
    return computeFitTransform(metaWidth, metaHeight, project)
  }

  // Uniform "contain" scale: the subject grows until the limiting axis touches
  // both of its grid lines, never distorting and never overflowing the grid.
  const scaleW = contentW / subject.width
  const scaleH = contentH / subject.height
  const fillWidth = scaleW <= scaleH
  const scale = Math.min(scaleW, scaleH)

  let canvasSubLeft: number
  let canvasSubTop: number

  if (fillWidth) {
    // Wide product: snap flush to the left and right grid lines, center vertically.
    canvasSubLeft = contentLeft
    const scaledSubH = subject.height * scale
    canvasSubTop = contentTop + (contentH - scaledSubH) / 2
  } else {
    // Tall product: snap flush to the top and bottom grid lines, center horizontally.
    canvasSubTop = contentTop
    const scaledSubW = subject.width * scale
    canvasSubLeft = contentLeft + (contentW - scaledSubW) / 2
  }

  const width = metaWidth * scale
  const height = metaHeight * scale
  const scaledSubLeft = subject.left * scale
  const scaledSubTop = subject.top * scale

  return {
    x: canvasSubLeft - margins.left - scaledSubLeft,
    y: canvasSubTop - margins.top - scaledSubTop,
    width,
    height,
    rotation: 0,
    flipX: false,
    flipY: false
  }
}

export async function createAssetsFromPaths(
  paths: string[],
  project: Project
): Promise<ImageAsset[]> {
  const assets: ImageAsset[] = []
  for (const path of paths) {
    const exists = await window.api.image.exists(path)
    if (!exists) continue
    const isImg = await window.api.image.isImage(path)
    if (!isImg) continue

    const meta = await window.api.image.metadata(path)
    let transform = computeFitTransform(meta.width, meta.height, project)

    try {
      const dataUrl = await window.api.image.preview(path)
      const subject = await detectSubjectFromDataUrl(dataUrl, meta.width, meta.height)
      if (subject.width > 0 && subject.height > 0) {
        transform = computeSubjectGridTransform(meta.width, meta.height, subject, project)
      }
    } catch {
      // fallback to centered fit
    }

    assets.push({
      id: randomUUID(),
      sourcePath: path,
      displayName: meta.name,
      transform,
      adjustments: { ...DEFAULT_ADJUSTMENTS },
      status: 'completed'
    })
  }
  return assets
}

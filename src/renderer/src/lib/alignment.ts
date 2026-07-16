import type { Project, Transform } from '@shared/types/project'
import { snapContentToCanvasGrid, snapToGrid } from './grid'

export function getContentArea(project: Project): { width: number; height: number } {
  const { margins, canvas } = project
  return {
    width: canvas.width - margins.left - margins.right,
    height: canvas.height - margins.top - margins.bottom
  }
}

export type AlignAction =
  | 'left'
  | 'right'
  | 'center-h'
  | 'top'
  | 'bottom'
  | 'center-v'
  | 'center'
  | 'fit-width'
  | 'fit-height'

export function computeAlignment(
  action: AlignAction,
  transform: Transform,
  project: Project,
  snap = false
): Partial<Transform> {
  const area = getContentArea(project)
  const { margins } = project
  const snapVal = (contentCoord: number, marginOffset: number): number =>
    snap ? snapContentToCanvasGrid(contentCoord, marginOffset) : Math.round(contentCoord)

  switch (action) {
    case 'left':
      return { x: snapVal(0, margins.left) }
    case 'right':
      return { x: snapVal(area.width - transform.width, margins.left) }
    case 'center-h':
      return { x: snapVal((area.width - transform.width) / 2, margins.left) }
    case 'top':
      return { y: snapVal(0, margins.top) }
    case 'bottom':
      return { y: snapVal(area.height - transform.height, margins.top) }
    case 'center-v':
      return { y: snapVal((area.height - transform.height) / 2, margins.top) }
    case 'center':
      return {
        x: snapVal((area.width - transform.width) / 2, margins.left),
        y: snapVal((area.height - transform.height) / 2, margins.top)
      }
    case 'fit-width':
      return {
        x: snapVal(0, margins.left),
        width: snap ? snapToGrid(area.width) : Math.round(area.width)
      }
    case 'fit-height':
      return {
        y: snapVal(0, margins.top),
        height: snap ? snapToGrid(area.height) : Math.round(area.height)
      }
    default:
      return {}
  }
}

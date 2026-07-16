export const GRID_STEP = 50
export const GRID_MAJOR = 100

export function snapToGrid(value: number, step = GRID_STEP): number {
  return Math.round(value / step) * step
}

export function snapDown(value: number, step = GRID_STEP): number {
  return Math.floor(value / step) * step
}

/** Snap a content-area coordinate so its canvas position aligns with grid lines. */
export function snapContentToCanvasGrid(
  contentCoord: number,
  marginOffset: number,
  step = GRID_STEP
): number {
  return snapToGrid(marginOffset + contentCoord, step) - marginOffset
}

/** Snap a canvas-absolute coordinate to the grid. */
export function snapCanvasToGrid(canvasCoord: number, step = GRID_STEP): number {
  return snapToGrid(canvasCoord, step)
}

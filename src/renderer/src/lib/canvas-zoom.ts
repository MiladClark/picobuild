export function computeCanvasFitScale(
  viewportWidth: number,
  viewportHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  padding = 40
): number {
  if (viewportWidth <= 0 || viewportHeight <= 0 || canvasWidth <= 0 || canvasHeight <= 0) {
    return 1
  }

  const availW = Math.max(1, viewportWidth - padding)
  const availH = Math.max(1, viewportHeight - padding)
  const scale = Math.min(availW / canvasWidth, availH / canvasHeight)

  return Math.max(0.05, Math.min(scale, 8))
}

export function computeDisplayZoomPercent(fitScale: number, zoom: number): number {
  return Math.round(fitScale * zoom * 100)
}

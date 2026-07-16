import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Stage,
  Layer,
  Rect,
  Image as KonvaImage,
  Transformer,
  Line,
  Text,
  Group
} from 'react-konva'
import type Konva from 'konva'
import { Upload, ImageIcon, AlertCircle, Loader2, X, Check, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useProjectStore } from '@renderer/stores/project-store'
import { useEditorStore } from '@renderer/stores/editor-store'
import { useAppStore } from '@renderer/stores/app-store'
import { useImagePreview } from '@renderer/hooks/use-image-loader'
import { useImportAssets } from '@renderer/hooks/use-import-assets'
import { GRID_MAJOR, GRID_STEP, snapContentToCanvasGrid } from '@renderer/lib/grid'
import { applyKonvaAdjustments } from '@renderer/lib/apply-konva-adjustments'
import { computeCanvasFitScale } from '@renderer/lib/canvas-zoom'
import { useThemeStore } from '@renderer/stores/theme-store'
import { Button } from '@renderer/components/ui'
import { CanvasWorkspace } from './CanvasRulers'
import type { ImageCrop } from '@shared/types/project'

const GRID_COLORS = {
  dark: { minor: 'rgba(34, 211, 238, 0.55)', major: 'rgba(34, 211, 238, 0.85)' },
  light: { minor: 'rgba(8, 145, 178, 0.5)', major: 'rgba(8, 145, 178, 0.8)' }
}

function GridOverlay({
  width,
  height,
  step = GRID_STEP,
  theme
}: {
  width: number
  height: number
  step?: number
  theme: 'dark' | 'light'
}): React.JSX.Element {
  const colors = GRID_COLORS[theme]
  const lines: React.JSX.Element[] = []
  for (let x = 0; x <= width; x += step) {
    const major = x % GRID_MAJOR === 0
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, 0, x, height]}
        stroke={major ? colors.major : colors.minor}
        strokeWidth={major ? 1.2 : 0.7}
        listening={false}
      />
    )
  }
  for (let y = 0; y <= height; y += step) {
    const major = y % GRID_MAJOR === 0
    lines.push(
      <Line
        key={`h-${y}`}
        points={[0, y, width, y]}
        stroke={major ? colors.major : colors.minor}
        strokeWidth={major ? 1.2 : 0.7}
        listening={false}
      />
    )
  }
  return <Group listening={false}>{lines}</Group>
}

function CropThirdsGrid({
  x,
  y,
  width,
  height
}: {
  x: number
  y: number
  width: number
  height: number
}): React.JSX.Element {
  const stroke = 'rgba(255,255,255,0.55)'
  return (
    <Group listening={false}>
      {[1, 2].map((i) => (
        <Line
          key={`tv-${i}`}
          points={[x + (width * i) / 3, y, x + (width * i) / 3, y + height]}
          stroke={stroke}
          strokeWidth={1}
          strokeScaleEnabled={false}
        />
      ))}
      {[1, 2].map((i) => (
        <Line
          key={`th-${i}`}
          points={[x, y + (height * i) / 3, x + width, y + (height * i) / 3]}
          stroke={stroke}
          strokeWidth={1}
          strokeScaleEnabled={false}
        />
      ))}
    </Group>
  )
}

function CropDimOverlay({
  canvasWidth,
  canvasHeight,
  cropX,
  cropY,
  cropW,
  cropH
}: {
  canvasWidth: number
  canvasHeight: number
  cropX: number
  cropY: number
  cropW: number
  cropH: number
}): React.JSX.Element {
  const dim = 'rgba(0,0,0,0.55)'
  return (
    <Group listening={false}>
      <Rect x={0} y={0} width={canvasWidth} height={cropY} fill={dim} />
      <Rect
        x={0}
        y={cropY + cropH}
        width={canvasWidth}
        height={canvasHeight - cropY - cropH}
        fill={dim}
      />
      <Rect x={0} y={cropY} width={cropX} height={cropH} fill={dim} />
      <Rect
        x={cropX + cropW}
        y={cropY}
        width={canvasWidth - cropX - cropW}
        height={cropH}
        fill={dim}
      />
    </Group>
  )
}

export function EditorCanvas(): React.JSX.Element {
  const { t } = useTranslation()
  const project = useProjectStore((s) => s.project)
  const selectedAssetId = useProjectStore((s) => s.selectedAssetId)
  const updateAsset = useProjectStore((s) => s.updateAsset)
  const { pickAndImport, importPaths } = useImportAssets()
  const zoom = useAppStore((s) => s.zoom)
  const fitViewRequest = useAppStore((s) => s.fitViewRequest)
  const setCanvasFitScale = useAppStore((s) => s.setCanvasFitScale)
  const focusMode = useAppStore((s) => s.focusMode)
  const rightCollapsed = useAppStore((s) => s.rightCollapsed)
  const activeTool = useAppStore((s) => s.activeTool)
  const setActiveTool = useAppStore((s) => s.setActiveTool)
  const theme = useThemeStore((s) => s.theme)
  const {
    showGrid,
    showRuler,
    snapToGrid: snapEnabled,
    pushHistory,
    cropDraft,
    setCropDraft,
    registerCropHandlers
  } = useEditorStore()
  const viewportRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const cropTransformerRef = useRef<Konva.Transformer>(null)
  const imageRef = useRef<Konva.Image>(null)
  const cropRectRef = useRef<Konva.Rect>(null)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })
  const [isDragOver, setIsDragOver] = useState(false)
  const [fitScale, setFitScale] = useState(1)
  const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 })
  const [cropRatio, setCropRatio] = useState<number | null>(null)

  const asset = project?.assets.find((a) => a.id === selectedAssetId)
  const imagePath = asset?.processedPath || asset?.sourcePath
  const { image, state: imageState, error: imageError } = useImagePreview(imagePath)

  useEffect(() => {
    const node = imageRef.current
    if (!node || !image || imageState !== 'loaded' || !asset) return

    applyKonvaAdjustments(node, asset.adjustments, asset.transform.width, asset.transform.height)
    node.getLayer()?.batchDraw()
  }, [
    asset?.adjustments,
    asset?.transform.width,
    asset?.transform.height,
    asset?.transform.crop,
    image,
    imageState,
    stageSize.width,
    stageSize.height
  ])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const measure = (): void => {
      const width = el.clientWidth
      const height = el.clientHeight
      if (width > 0 && height > 0) {
        setStageSize({ width, height })
      }
    }

    const observer = new ResizeObserver(() => {
      measure()
    })
    observer.observe(el)

    measure()
    const raf = requestAnimationFrame(() => {
      measure()
      requestAnimationFrame(measure)
    })

    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [showRuler, focusMode, rightCollapsed])

  useEffect(() => {
    if (!project || stageSize.width <= 0 || stageSize.height <= 0) return

    const scale = computeCanvasFitScale(
      stageSize.width,
      stageSize.height,
      project.canvas.width,
      project.canvas.height
    )
    setFitScale(scale)
    setCanvasFitScale(scale)
  }, [
    project,
    project?.canvas.width,
    project?.canvas.height,
    stageSize,
    fitViewRequest,
    focusMode,
    rightCollapsed,
    setCanvasFitScale
  ])

  useEffect(() => {
    if (!imagePath) {
      setSourceSize({ width: 0, height: 0 })
      return
    }
    window.api.image
      .metadata(imagePath)
      .then((meta) => {
        setSourceSize({ width: meta.width, height: meta.height })
      })
      .catch(() => setSourceSize({ width: 0, height: 0 }))
  }, [imagePath])

  useEffect(() => {
    if (transformerRef.current && imageRef.current && activeTool === 'select') {
      transformerRef.current.nodes([imageRef.current])
      transformerRef.current.getLayer()?.batchDraw()
    } else if (transformerRef.current) {
      transformerRef.current.nodes([])
    }
  }, [selectedAssetId, asset, image, activeTool])

  useEffect(() => {
    if (cropTransformerRef.current && cropRectRef.current && activeTool === 'crop') {
      cropTransformerRef.current.nodes([cropRectRef.current])
      cropTransformerRef.current.getLayer()?.batchDraw()
    } else if (cropTransformerRef.current) {
      cropTransformerRef.current.nodes([])
    }
  }, [selectedAssetId, asset, image, activeTool, cropDraft])

  useEffect(() => {
    if (activeTool === 'crop' && asset) {
      setCropDraft({ x: 0, y: 0, width: asset.transform.width, height: asset.transform.height })
    } else {
      setCropDraft(null)
    }
  }, [activeTool, asset?.id, setCropDraft])

  const applyCrop = useCallback((): void => {
    if (!asset || !cropDraft || sourceSize.width === 0) return

    const currentCrop: ImageCrop = asset.transform.crop ?? {
      x: 0,
      y: 0,
      width: sourceSize.width,
      height: sourceSize.height
    }

    const scaleX = currentCrop.width / asset.transform.width
    const scaleY = currentCrop.height / asset.transform.height

    // A flipped image is mirrored on screen, so the on-screen crop offset maps
    // to the opposite side of the source region.
    const srcOffsetX = asset.transform.flipX
      ? asset.transform.width - cropDraft.x - cropDraft.width
      : cropDraft.x
    const srcOffsetY = asset.transform.flipY
      ? asset.transform.height - cropDraft.y - cropDraft.height
      : cropDraft.y

    const newCrop: ImageCrop = {
      x: Math.round(currentCrop.x + srcOffsetX * scaleX),
      y: Math.round(currentCrop.y + srcOffsetY * scaleY),
      width: Math.max(1, Math.round(cropDraft.width * scaleX)),
      height: Math.max(1, Math.round(cropDraft.height * scaleY))
    }

    newCrop.x = Math.max(0, Math.min(newCrop.x, sourceSize.width - 1))
    newCrop.y = Math.max(0, Math.min(newCrop.y, sourceSize.height - 1))
    newCrop.width = Math.min(newCrop.width, sourceSize.width - newCrop.x)
    newCrop.height = Math.min(newCrop.height, sourceSize.height - newCrop.y)

    pushHistory({
      assetId: asset.id,
      transform: { ...asset.transform },
      adjustments: { ...asset.adjustments }
    })

    updateAsset(asset.id, {
      transform: {
        ...asset.transform,
        x: asset.transform.x + cropDraft.x,
        y: asset.transform.y + cropDraft.y,
        width: cropDraft.width,
        height: cropDraft.height,
        crop: newCrop
      }
    })

    setActiveTool('select')
    toast.success('Crop applied')
  }, [asset, cropDraft, sourceSize, pushHistory, updateAsset, setActiveTool])

  const cancelCrop = useCallback((): void => {
    setActiveTool('select')
  }, [setActiveTool])

  const resetCropDraft = useCallback((): void => {
    if (!asset) return
    setCropDraft({ x: 0, y: 0, width: asset.transform.width, height: asset.transform.height })
    setCropRatio(null)
  }, [asset, setCropDraft])

  // Set the crop draft to the largest rect with the given aspect ratio,
  // centered inside the image. null = free-form (keeps the current draft).
  const applyCropRatio = useCallback(
    (ratio: number | null): void => {
      setCropRatio(ratio)
      if (!asset || ratio === null) return
      const W = asset.transform.width
      const H = asset.transform.height
      let w = W
      let h = w / ratio
      if (h > H) {
        h = H
        w = h * ratio
      }
      setCropDraft({ x: (W - w) / 2, y: (H - h) / 2, width: w, height: h })
    },
    [asset, setCropDraft]
  )

  useEffect(() => {
    if (activeTool === 'crop') {
      registerCropHandlers(applyCrop, cancelCrop)
    } else {
      registerCropHandlers(null, null)
    }
    return () => registerCropHandlers(null, null)
  }, [activeTool, applyCrop, cancelCrop, registerCropHandlers])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (activeTool !== 'crop') return
      if (e.key === 'Enter') {
        e.preventDefault()
        applyCrop()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        cancelCrop()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeTool, applyCrop, cancelCrop])

  const snap = useCallback(
    (contentCoord: number, marginOffset: number) =>
      snapEnabled ? snapContentToCanvasGrid(contentCoord, marginOffset) : contentCoord,
    [snapEnabled]
  )

  const handleDrop = async (e: React.DragEvent): Promise<void> => {
    e.preventDefault()
    setIsDragOver(false)
    if (!project) return

    const paths: string[] = []
    for (const f of Array.from(e.dataTransfer.files)) {
      const p = (f as File & { path?: string }).path
      if (p) paths.push(p)
    }
    await importPaths(paths)
  }

  if (!project) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--text-muted)]">
        {t('imageBuilder.noProject')}
      </div>
    )
  }

  const stageWidth = Math.max(1, stageSize.width)
  const stageHeight = Math.max(1, stageSize.height)

  const { canvas, margins } = project
  const displayScale = fitScale * zoom
  const displayW = canvas.width * displayScale
  const displayH = canvas.height * displayScale
  const offsetX = (stageWidth - displayW) / 2
  const offsetY = (stageHeight - displayH) / 2

  // Gradient renders top → bottom, matching the export pipeline (sharp SVG).
  const bgFillProps =
    canvas.background.type === 'gradient'
      ? {
          fillLinearGradientStartPoint: { x: 0, y: 0 },
          fillLinearGradientEndPoint: { x: 0, y: canvas.height },
          fillLinearGradientColorStops: [
            0,
            canvas.background.value,
            1,
            canvas.background.gradientEnd ?? '#000000'
          ]
        }
      : {
          fill: canvas.background.type === 'transparent' ? '#1e1e24' : canvas.background.value
        }

  const hasAssets = project.assets.length > 0
  const showEmptyState = !hasAssets

  const layerProps = { x: offsetX, y: offsetY, scaleX: displayScale, scaleY: displayScale }

  const imageCrop: ImageCrop | null =
    asset && sourceSize.width > 0
      ? (asset.transform.crop ?? {
          x: 0,
          y: 0,
          width: sourceSize.width,
          height: sourceSize.height
        })
      : null

  const isCropMode = activeTool === 'crop' && !!asset && !!cropDraft
  const imageDraggable = activeTool === 'select' || activeTool === 'move'

  const cropAbsX = asset && cropDraft ? margins.left + asset.transform.x + cropDraft.x : 0
  const cropAbsY = asset && cropDraft ? margins.top + asset.transform.y + cropDraft.y : 0

  // Display px → source px, for the live dimension readout in the crop toolbar.
  const cropSourceScaleX =
    asset && sourceSize.width > 0
      ? (asset.transform.crop?.width ?? sourceSize.width) / asset.transform.width
      : 1
  const cropSourceScaleY =
    asset && sourceSize.height > 0
      ? (asset.transform.crop?.height ?? sourceSize.height) / asset.transform.height
      : 1

  return (
    <div
      ref={containerRef}
      className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--bg-canvas)] ${isDragOver ? 'ring-2 ring-inset ring-[var(--accent)]' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <CanvasWorkspace
        showRuler={showRuler}
        offsetX={offsetX}
        offsetY={offsetY}
        displayScale={displayScale}
        canvasWidth={canvas.width}
        canvasHeight={canvas.height}
      >
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div ref={viewportRef} className="absolute inset-0">
            <Stage width={stageWidth} height={stageHeight}>
              <Layer {...layerProps}>
                <Rect
                  width={canvas.width}
                  height={canvas.height}
                  {...bgFillProps}
                  stroke="#4f46e5"
                  strokeWidth={2}
                  shadowColor="black"
                  shadowBlur={20}
                  shadowOpacity={0.3}
                  cornerRadius={2}
                />

                {canvas.background.type === 'transparent' &&
                  Array.from({ length: Math.ceil(canvas.height / 20) }, (_, row) =>
                    Array.from({ length: Math.ceil(canvas.width / 20) }, (_, col) => (
                      <Rect
                        key={`chk-${row}-${col}`}
                        x={col * 20}
                        y={row * 20}
                        width={20}
                        height={20}
                        fill={(row + col) % 2 === 0 ? '#2a2a30' : '#1e1e24'}
                        listening={false}
                      />
                    ))
                  ).flat()}
              </Layer>

              <Layer {...layerProps}>
                {asset && image && imageState === 'loaded' && (
                  <>
                    <KonvaImage
                      ref={imageRef}
                      image={image}
                      x={margins.left + asset.transform.x}
                      y={margins.top + asset.transform.y}
                      width={asset.transform.width}
                      height={asset.transform.height}
                      cropX={imageCrop?.x}
                      cropY={imageCrop?.y}
                      cropWidth={imageCrop?.width}
                      cropHeight={imageCrop?.height}
                      rotation={asset.transform.rotation}
                      scaleX={asset.transform.flipX ? -1 : 1}
                      scaleY={asset.transform.flipY ? -1 : 1}
                      offsetX={asset.transform.flipX ? asset.transform.width : 0}
                      offsetY={asset.transform.flipY ? asset.transform.height : 0}
                      draggable={imageDraggable}
                      onDragStart={() => {
                        if (!imageDraggable) return
                        pushHistory({
                          assetId: asset.id,
                          transform: { ...asset.transform },
                          adjustments: { ...asset.adjustments }
                        })
                      }}
                      onDragEnd={(e) => {
                        if (!imageDraggable) return
                        updateAsset(asset.id, {
                          transform: {
                            ...asset.transform,
                            x: snap(e.target.x() - margins.left, margins.left),
                            y: snap(e.target.y() - margins.top, margins.top)
                          }
                        })
                      }}
                      onTransformStart={() => {
                        if (activeTool !== 'select') return
                        pushHistory({
                          assetId: asset.id,
                          transform: { ...asset.transform },
                          adjustments: { ...asset.adjustments }
                        })
                      }}
                      onTransformEnd={() => {
                        if (activeTool !== 'select') return
                        const node = imageRef.current
                        if (!node) return
                        const sx = node.scaleX()
                        const sy = node.scaleY()
                        const flipX = sx < 0
                        const flipY = sy < 0
                        node.scaleX(flipX ? -1 : 1)
                        node.scaleY(flipY ? -1 : 1)
                        updateAsset(asset.id, {
                          transform: {
                            ...asset.transform,
                            x: snap(node.x() - margins.left, margins.left),
                            y: snap(node.y() - margins.top, margins.top),
                            width: Math.max(20, Math.abs(node.width() * sx)),
                            height: Math.max(20, Math.abs(node.height() * sy)),
                            rotation: node.rotation(),
                            flipX,
                            flipY
                          }
                        })
                      }}
                    />
                  </>
                )}

                {asset && imageState === 'loading' && (
                  <Text
                    x={canvas.width / 2 - 40}
                    y={canvas.height / 2}
                    text="Loading..."
                    fill="#9ca3af"
                    fontSize={14}
                  />
                )}
              </Layer>

              <Layer {...layerProps} listening={false}>
                {showGrid && (
                  <GridOverlay width={canvas.width} height={canvas.height} theme={theme} />
                )}
                <Rect
                  x={margins.left}
                  y={margins.top}
                  width={canvas.width - margins.left - margins.right}
                  height={canvas.height - margins.top - margins.bottom}
                  stroke="#22d3ee"
                  strokeWidth={1.5}
                  dash={[8, 4]}
                  opacity={0.85}
                  listening={false}
                />
              </Layer>

              <Layer {...layerProps}>
                {isCropMode && cropDraft && asset && (
                  <>
                    <CropDimOverlay
                      canvasWidth={canvas.width}
                      canvasHeight={canvas.height}
                      cropX={cropAbsX}
                      cropY={cropAbsY}
                      cropW={cropDraft.width}
                      cropH={cropDraft.height}
                    />
                    <CropThirdsGrid
                      x={cropAbsX}
                      y={cropAbsY}
                      width={cropDraft.width}
                      height={cropDraft.height}
                    />
                    <Rect
                      ref={cropRectRef}
                      x={cropAbsX}
                      y={cropAbsY}
                      width={cropDraft.width}
                      height={cropDraft.height}
                      stroke="#22d3ee"
                      strokeWidth={2}
                      strokeScaleEnabled={false}
                      listening
                      draggable
                      onDragMove={(e) => {
                        // Live update so the dim overlay + thirds grid follow the drag.
                        const imgX = margins.left + asset.transform.x
                        const imgY = margins.top + asset.transform.y
                        setCropDraft({
                          ...cropDraft,
                          x: e.target.x() - imgX,
                          y: e.target.y() - imgY
                        })
                      }}
                      onDragEnd={(e) => {
                        const imgX = margins.left + asset.transform.x
                        const imgY = margins.top + asset.transform.y
                        setCropDraft({
                          ...cropDraft,
                          x: e.target.x() - imgX,
                          y: e.target.y() - imgY
                        })
                      }}
                      onTransform={() => {
                        // Bake scale into width/height every frame so the stroke
                        // stays crisp and state mirrors the node live.
                        const node = cropRectRef.current
                        if (!node) return
                        const imgX = margins.left + asset.transform.x
                        const imgY = margins.top + asset.transform.y
                        const w = Math.max(1, node.width() * node.scaleX())
                        const h = Math.max(1, node.height() * node.scaleY())
                        node.scaleX(1)
                        node.scaleY(1)
                        node.width(w)
                        node.height(h)
                        setCropDraft({
                          x: node.x() - imgX,
                          y: node.y() - imgY,
                          width: w,
                          height: h
                        })
                      }}
                      onTransformEnd={() => {
                        const node = cropRectRef.current
                        if (!node) return
                        const imgX = margins.left + asset.transform.x
                        const imgY = margins.top + asset.transform.y
                        setCropDraft({
                          x: node.x() - imgX,
                          y: node.y() - imgY,
                          width: Math.max(1, node.width() * node.scaleX()),
                          height: Math.max(1, node.height() * node.scaleY())
                        })
                        node.scaleX(1)
                        node.scaleY(1)
                      }}
                      dragBoundFunc={(pos) => {
                        // pos is in absolute stage coordinates; convert the image
                        // bounds (layer content coords) into the same space.
                        const imgX = margins.left + asset.transform.x
                        const imgY = margins.top + asset.transform.y
                        const minX = offsetX + imgX * displayScale
                        const minY = offsetY + imgY * displayScale
                        const maxX =
                          offsetX + (imgX + asset.transform.width - cropDraft.width) * displayScale
                        const maxY =
                          offsetY +
                          (imgY + asset.transform.height - cropDraft.height) * displayScale
                        return {
                          x: Math.min(Math.max(pos.x, minX), Math.max(minX, maxX)),
                          y: Math.min(Math.max(pos.y, minY), Math.max(minY, maxY))
                        }
                      }}
                    />
                    <Transformer
                      ref={cropTransformerRef}
                      borderStroke="#22d3ee"
                      anchorStroke="#22d3ee"
                      anchorFill="#ffffff"
                      anchorSize={9}
                      anchorCornerRadius={2}
                      rotateEnabled={false}
                      flipEnabled={false}
                      keepRatio={cropRatio !== null}
                      ignoreStroke
                      enabledAnchors={
                        cropRatio !== null
                          ? ['top-left', 'top-right', 'bottom-left', 'bottom-right']
                          : [
                              'top-left',
                              'top-right',
                              'bottom-left',
                              'bottom-right',
                              'middle-left',
                              'middle-right',
                              'top-center',
                              'bottom-center'
                            ]
                      }
                      boundBoxFunc={(oldBox, newBox) => {
                        // Boxes are in absolute stage coordinates.
                        const minSize = 20 * displayScale
                        if (newBox.width < minSize || newBox.height < minSize) return oldBox
                        const imgX = margins.left + asset.transform.x
                        const imgY = margins.top + asset.transform.y
                        const left = offsetX + imgX * displayScale
                        const top = offsetY + imgY * displayScale
                        const right = offsetX + (imgX + asset.transform.width) * displayScale
                        const bottom = offsetY + (imgY + asset.transform.height) * displayScale
                        const eps = 0.5

                        if (cropRatio !== null) {
                          // Clamping would break the locked ratio — reject instead.
                          if (
                            newBox.x < left - eps ||
                            newBox.y < top - eps ||
                            newBox.x + newBox.width > right + eps ||
                            newBox.y + newBox.height > bottom + eps
                          ) {
                            return oldBox
                          }
                          return newBox
                        }

                        // Free-form: clamp the box to the image bounds.
                        const x = Math.max(newBox.x, left)
                        const y = Math.max(newBox.y, top)
                        let width = newBox.width - (x - newBox.x)
                        let height = newBox.height - (y - newBox.y)
                        width = Math.min(width, right - x)
                        height = Math.min(height, bottom - y)
                        if (width < minSize || height < minSize) return oldBox
                        return { ...newBox, x, y, width, height }
                      }}
                    />
                  </>
                )}

                {activeTool === 'select' && asset && image && imageState === 'loaded' && (
                  <Transformer
                    ref={transformerRef}
                    borderStroke="#22d3ee"
                    anchorStroke="#22d3ee"
                    anchorFill="#0891b2"
                    anchorSize={8}
                    boundBoxFunc={(oldBox, newBox) => {
                      if (newBox.width < 20 || newBox.height < 20) return oldBox
                      return newBox
                    }}
                    rotateEnabled
                    enabledAnchors={[
                      'top-left',
                      'top-right',
                      'bottom-left',
                      'bottom-right',
                      'middle-left',
                      'middle-right',
                      'top-center',
                      'bottom-center'
                    ]}
                  />
                )}
              </Layer>
            </Stage>
          </div>

          {isCropMode && cropDraft && asset && (
            <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-panel)]/95 p-1.5 shadow-[var(--shadow-md)] backdrop-blur-sm">
              <div className="flex items-center gap-0.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] p-0.5">
                {(
                  [
                    { label: 'Free', ratio: null },
                    { label: '1:1', ratio: 1 },
                    { label: '4:3', ratio: 4 / 3 },
                    { label: '3:4', ratio: 3 / 4 },
                    { label: '16:9', ratio: 16 / 9 },
                    { label: '9:16', ratio: 9 / 16 }
                  ] as Array<{ label: string; ratio: number | null }>
                ).map(({ label, ratio }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => applyCropRatio(ratio)}
                    className={`focus-ring rounded-[5px] px-2 py-1 text-[11px] font-medium transition-colors ${
                      cropRatio === ratio
                        ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[inset_0_0_0_1px_var(--border-strong)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <span className="min-w-[76px] px-1 text-center text-[11px] tabular-nums text-[var(--text-secondary)]">
                {Math.round(cropDraft.width * cropSourceScaleX)} ×{' '}
                {Math.round(cropDraft.height * cropSourceScaleY)}
              </span>

              <div className="h-4 w-px bg-[var(--border)]" />

              <Button size="icon" variant="ghost" onClick={resetCropDraft} title="Reset crop">
                <RotateCcw size={13} />
              </Button>
              <Button size="icon" variant="ghost" onClick={cancelCrop} title="Cancel (Esc)">
                <X size={14} />
              </Button>
              <Button size="icon" variant="primary" onClick={applyCrop} title="Apply (Enter)">
                <Check size={14} />
              </Button>
            </div>
          )}

          {showEmptyState && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="pointer-events-auto flex flex-col items-center gap-4 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--border)] bg-[var(--bg-panel)]/95 px-14 py-12 backdrop-blur-sm">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
                  <ImageIcon size={32} className="text-[var(--text-muted)]" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Drop images here or click Import
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    PNG, JPG, WebP, AVIF supported
                  </p>
                </div>
                <Button variant="primary" onClick={pickAndImport}>
                  <Upload size={16} className="mr-2" />
                  {t('imageBuilder.import')}
                </Button>
              </div>
            </div>
          )}

          {asset && imageState === 'error' && (
            <div className="absolute bottom-20 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-400">
              <AlertCircle size={16} />
              {imageError ?? 'Failed to load image'}
            </div>
          )}

          {isDragOver && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[var(--accent)]/10">
              <div className="rounded-[var(--radius-md)] bg-[var(--bg-panel)] px-6 py-3 text-sm font-medium text-[var(--accent)] shadow-[var(--shadow-md)]">
                Drop to import
              </div>
            </div>
          )}

          {imageState === 'loading' && asset && (
            <div className="absolute right-4 top-4 flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-panel)]/95 px-3 py-1.5 text-xs text-[var(--text-muted)] backdrop-blur-sm">
              <Loader2 size={14} className="animate-spin" />
              Loading image...
            </div>
          )}
        </div>
      </CanvasWorkspace>
    </div>
  )
}

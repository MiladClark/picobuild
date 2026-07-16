import { useCallback } from 'react'
import { toast } from 'sonner'
import { useProjectStore } from '@renderer/stores/project-store'
import { useEditorStore } from '@renderer/stores/editor-store'
import { computeAlignment, type AlignAction } from '@renderer/lib/alignment'
import { computeSubjectGridTransform } from '@renderer/lib/import-assets'

export function useAlignActions(): {
  hasAsset: boolean
  applyAlign: (action: AlignAction) => void
  snapProductToGrid: () => Promise<void>
} {
  const project = useProjectStore((s) => s.project)
  const selectedAssetId = useProjectStore((s) => s.selectedAssetId)
  const updateAsset = useProjectStore((s) => s.updateAsset)
  const snapToGrid = useEditorStore((s) => s.snapToGrid)
  const pushHistory = useEditorStore((s) => s.pushHistory)

  const asset = project?.assets.find((a) => a.id === selectedAssetId)
  const hasAsset = !!asset

  const pushAssetHistory = useCallback((): void => {
    if (!asset) return
    pushHistory({
      assetId: asset.id,
      transform: { ...asset.transform },
      adjustments: { ...asset.adjustments }
    })
  }, [asset, pushHistory])

  const applyAlign = useCallback(
    (action: AlignAction): void => {
      if (!asset || !project) return
      pushAssetHistory()
      const partial = computeAlignment(action, asset.transform, project, snapToGrid)
      updateAsset(asset.id, { transform: { ...asset.transform, ...partial } })
    },
    [asset, project, snapToGrid, pushAssetHistory, updateAsset]
  )

  const snapProductToGrid = useCallback(async (): Promise<void> => {
    if (!asset || !project) return
    const toastId = toast.loading('Detecting product…')
    try {
      const path = asset.processedPath || asset.sourcePath
      const subject = await window.api.image.detectSubject(path)
      if (subject.width <= 0 || subject.height <= 0) {
        toast.error('Could not detect a product in this image', { id: toastId })
        return
      }
      pushAssetHistory()
      const next = computeSubjectGridTransform(
        subject.imageWidth,
        subject.imageHeight,
        subject,
        project
      )
      updateAsset(asset.id, {
        transform: {
          ...next,
          crop: asset.transform.crop,
          rotation: asset.transform.rotation,
          flipX: asset.transform.flipX,
          flipY: asset.transform.flipY
        }
      })
      const contentW = project.canvas.width - project.margins.left - project.margins.right
      const contentH = project.canvas.height - project.margins.top - project.margins.bottom
      const fillWidth = contentW / subject.width <= contentH / subject.height
      toast.success(
        fillWidth
          ? 'Product fitted to grid (left ↔ right)'
          : 'Product fitted to grid (top ↕ bottom)',
        { id: toastId }
      )
    } catch (e) {
      toast.error(String(e), { id: toastId })
    }
  }, [asset, project, pushAssetHistory, updateAsset])

  return { hasAsset, applyAlign, snapProductToGrid }
}

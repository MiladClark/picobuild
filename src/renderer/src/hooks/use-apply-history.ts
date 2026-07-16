import { useCallback } from 'react'
import { useEditorStore } from '@renderer/stores/editor-store'
import { useProjectStore } from '@renderer/stores/project-store'

export function useApplyHistory(): {
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
} {
  const updateAsset = useProjectStore((s) => s.updateAsset)
  const { undo: undoEntry, redo: redoEntry, canUndo, canRedo } = useEditorStore()

  const undo = useCallback((): void => {
    const entry = undoEntry()
    if (entry) {
      updateAsset(entry.assetId, {
        transform: entry.transform,
        adjustments: entry.adjustments
      })
    }
  }, [undoEntry, updateAsset])

  const redo = useCallback((): void => {
    const entry = redoEntry()
    if (entry) {
      updateAsset(entry.assetId, {
        transform: entry.transform,
        adjustments: entry.adjustments
      })
    }
  }, [redoEntry, updateAsset])

  return { undo, redo, canUndo, canRedo }
}

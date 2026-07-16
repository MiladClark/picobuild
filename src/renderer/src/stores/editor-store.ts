import { create } from 'zustand'
import type { Adjustments, Transform } from '@shared/types/project'
import { DEFAULT_ADJUSTMENTS } from '@shared/types/project'

interface HistoryEntry {
  assetId: string
  transform: Transform
  adjustments: Adjustments
}

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

interface EditorState {
  history: HistoryEntry[]
  historyIndex: number
  showGrid: boolean
  showRuler: boolean
  snapToGrid: boolean
  smartGuides: boolean
  cropDraft: CropRect | null
  cropApply: (() => void) | null
  cropCancel: (() => void) | null
  pushHistory: (entry: HistoryEntry) => void
  undo: () => HistoryEntry | null
  redo: () => HistoryEntry | null
  canUndo: () => boolean
  canRedo: () => boolean
  setShowGrid: (v: boolean) => void
  setShowRuler: (v: boolean) => void
  setSnapToGrid: (v: boolean) => void
  setSmartGuides: (v: boolean) => void
  setCropDraft: (rect: CropRect | null) => void
  registerCropHandlers: (apply: (() => void) | null, cancel: (() => void) | null) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  history: [],
  historyIndex: -1,
  showGrid: true,
  showRuler: true,
  snapToGrid: true,
  smartGuides: true,
  cropDraft: null,
  cropApply: null,
  cropCancel: null,
  pushHistory: (entry) => {
    const { history, historyIndex } = get()
    const trimmed = history.slice(0, historyIndex + 1)
    set({
      history: [...trimmed, entry],
      historyIndex: trimmed.length
    })
  },
  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex <= 0) return null
    const newIndex = historyIndex - 1
    set({ historyIndex: newIndex })
    return history[newIndex]
  },
  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return null
    const newIndex = historyIndex + 1
    set({ historyIndex: newIndex })
    return history[newIndex]
  },
  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,
  setShowGrid: (v) => set({ showGrid: v }),
  setShowRuler: (v) => set({ showRuler: v }),
  setSnapToGrid: (v) => set({ snapToGrid: v }),
  setSmartGuides: (v) => set({ smartGuides: v }),
  setCropDraft: (rect) => set({ cropDraft: rect }),
  registerCropHandlers: (apply, cancel) => set({ cropApply: apply, cropCancel: cancel })
}))

export { DEFAULT_ADJUSTMENTS }

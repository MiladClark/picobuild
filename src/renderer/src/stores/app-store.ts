import { create } from 'zustand'

export type RightPanelTab = 'canvas' | 'adjust' | 'background' | 'export'
export type ActiveTool = 'select' | 'move' | 'crop'

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 3
export const clampZoom = (z: number): number => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z))

interface AppState {
  rightCollapsed: boolean
  focusMode: boolean
  activeTool: ActiveTool
  zoom: number
  panX: number
  panY: number
  canvasFitScale: number
  fitViewRequest: number
  rightPanelTab: RightPanelTab
  shortcutsOpen: boolean
  toggleRight: () => void
  setRightCollapsed: (v: boolean) => void
  setFocusMode: (v: boolean) => void
  toggleFocusMode: () => void
  setActiveTool: (tool: ActiveTool) => void
  setZoom: (zoom: number) => void
  setZoomAndPan: (zoom: number, panX: number, panY: number) => void
  setPan: (panX: number, panY: number) => void
  setCanvasFitScale: (scale: number) => void
  fitToView: () => void
  setRightPanelTab: (tab: RightPanelTab) => void
  setShortcutsOpen: (v: boolean) => void
  toggleShortcuts: () => void
}

export const useAppStore = create<AppState>((set) => ({
  rightCollapsed: false,
  focusMode: false,
  activeTool: 'select',
  zoom: 1,
  panX: 0,
  panY: 0,
  canvasFitScale: 1,
  fitViewRequest: 0,
  rightPanelTab: 'canvas',
  shortcutsOpen: false,
  toggleRight: () =>
    set((state) => ({
      rightCollapsed: !state.rightCollapsed,
      fitViewRequest: state.fitViewRequest + 1
    })),
  setRightCollapsed: (v) =>
    set((state) => ({
      rightCollapsed: v,
      fitViewRequest: !v ? state.fitViewRequest + 1 : state.fitViewRequest
    })),
  setFocusMode: (v) =>
    set((state) => ({
      focusMode: v,
      rightCollapsed: v ? true : state.rightCollapsed,
      fitViewRequest: v ? state.fitViewRequest + 1 : state.fitViewRequest,
      zoom: v ? 1 : state.zoom,
      panX: v ? 0 : state.panX,
      panY: v ? 0 : state.panY
    })),
  toggleFocusMode: () =>
    set((state) => {
      const next = !state.focusMode
      return {
        focusMode: next,
        rightCollapsed: next ? true : state.rightCollapsed,
        fitViewRequest: next ? state.fitViewRequest + 1 : state.fitViewRequest,
        zoom: next ? 1 : state.zoom,
        panX: next ? 0 : state.panX,
        panY: next ? 0 : state.panY
      }
    }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),
  setZoomAndPan: (zoom, panX, panY) => set({ zoom: clampZoom(zoom), panX, panY }),
  setPan: (panX, panY) => set({ panX, panY }),
  setCanvasFitScale: (scale) => set({ canvasFitScale: scale }),
  fitToView: () =>
    set((state) => ({
      zoom: 1,
      panX: 0,
      panY: 0,
      fitViewRequest: state.fitViewRequest + 1
    })),
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
  setShortcutsOpen: (v) => set({ shortcutsOpen: v }),
  toggleShortcuts: () => set((state) => ({ shortcutsOpen: !state.shortcutsOpen }))
}))

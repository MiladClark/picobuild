import { create } from 'zustand'

export type RightPanelTab = 'canvas' | 'adjust' | 'background' | 'export'
export type ActiveTool = 'select' | 'move' | 'crop'

interface AppState {
  rightCollapsed: boolean
  focusMode: boolean
  activeTool: ActiveTool
  zoom: number
  canvasFitScale: number
  fitViewRequest: number
  rightPanelTab: RightPanelTab
  toggleRight: () => void
  setRightCollapsed: (v: boolean) => void
  setFocusMode: (v: boolean) => void
  toggleFocusMode: () => void
  setActiveTool: (tool: ActiveTool) => void
  setZoom: (zoom: number) => void
  setCanvasFitScale: (scale: number) => void
  fitToView: () => void
  setRightPanelTab: (tab: RightPanelTab) => void
}

export const useAppStore = create<AppState>((set) => ({
  rightCollapsed: false,
  focusMode: false,
  activeTool: 'select',
  zoom: 1,
  canvasFitScale: 1,
  fitViewRequest: 0,
  rightPanelTab: 'canvas',
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
      fitViewRequest: v ? state.fitViewRequest + 1 : state.fitViewRequest
    })),
  toggleFocusMode: () =>
    set((state) => {
      const next = !state.focusMode
      return {
        focusMode: next,
        rightCollapsed: next ? true : state.rightCollapsed,
        fitViewRequest: next ? state.fitViewRequest + 1 : state.fitViewRequest,
        zoom: next ? 1 : state.zoom
      }
    }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(3, zoom)) }),
  setCanvasFitScale: (scale) => set({ canvasFitScale: scale }),
  fitToView: () =>
    set((state) => ({
      zoom: 1,
      fitViewRequest: state.fitViewRequest + 1
    })),
  setRightPanelTab: (tab) => set({ rightPanelTab: tab })
}))

import { ZoomIn, ZoomOut, Maximize2, Focus } from 'lucide-react'
import { useProjectStore } from '@renderer/stores/project-store'
import { useAppStore } from '@renderer/stores/app-store'
import { ToolbarButton } from '@renderer/components/ui'
import { computeDisplayZoomPercent } from '@renderer/lib/canvas-zoom'
import { BuilderAlignToolbar } from './BuilderAlignToolbar'

const statusBtn = 'h-6 w-6'

export function BottomBar(): React.JSX.Element | null {
  const project = useProjectStore((s) => s.project)
  const selectedAssetId = useProjectStore((s) => s.selectedAssetId)
  const { zoom, canvasFitScale, focusMode, setZoom, fitToView, toggleFocusMode } = useAppStore()

  if (!project) return null

  const asset = project.assets.find((a) => a.id === selectedAssetId)
  const assetIndex = project.assets.findIndex((a) => a.id === selectedAssetId)
  const zoomPercent = computeDisplayZoomPercent(canvasFitScale, zoom)

  return (
    <footer className="relative flex h-[var(--statusbar-height)] shrink-0 items-center overflow-hidden border-t border-[var(--border)] bg-[var(--bg-bottombar)] text-[11px]">
      {!focusMode && (
        <div className="bar-x flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          {project.assets.length > 0 && asset ? (
            <>
              <span className="status-chip tabular-nums text-[var(--text-secondary)]">
                {assetIndex + 1}/{project.assets.length}
              </span>
              <span className="h-3 w-px shrink-0 bg-[var(--border)]" />
              <span className="status-chip min-w-0">
                <span className="truncate">{asset.displayName}</span>
              </span>
              <span className="h-3 w-px shrink-0 bg-[var(--border)]" />
              <span className="status-chip tabular-nums">
                {Math.round(asset.transform.width)} × {Math.round(asset.transform.height)}
              </span>
              <span className="h-3 w-px shrink-0 bg-[var(--border)]" />
              <span className="status-chip tabular-nums">
                {Math.round(asset.transform.rotation)}°
              </span>
            </>
          ) : (
            <span className="status-chip text-[var(--text-muted)]">No image selected</span>
          )}
        </div>
      )}

      {focusMode && <div className="min-w-0 flex-1" />}

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="pointer-events-auto rounded-[var(--radius-sm)] bg-[var(--bg-bottombar)] px-1">
          <BuilderAlignToolbar compact />
        </div>
      </div>

      <div className="bar-x ml-auto flex shrink-0 items-center gap-0.5">
        {!focusMode && (
          <>
            <span className="status-chip hidden tabular-nums text-[var(--text-muted)] min-[1240px]:inline-flex">
              Canvas {project.canvas.width} × {project.canvas.height}
            </span>
            <span className="mx-1 hidden h-3 w-px shrink-0 bg-[var(--border)] min-[1240px]:block" />
          </>
        )}

        <ToolbarButton title="Zoom out" onClick={() => setZoom(zoom - 0.15)} className={statusBtn}>
          <ZoomOut size={13} />
        </ToolbarButton>
        <button
          type="button"
          title="Fit to view"
          onClick={fitToView}
          className="focus-ring h-6 min-w-[42px] rounded-[var(--radius-xs)] px-1 text-center text-[11px] tabular-nums text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          {zoomPercent}%
        </button>
        <ToolbarButton title="Zoom in" onClick={() => setZoom(zoom + 0.15)} className={statusBtn}>
          <ZoomIn size={13} />
        </ToolbarButton>
        <ToolbarButton title="Fit to view" onClick={fitToView} className={statusBtn}>
          <Maximize2 size={13} />
        </ToolbarButton>
        <span className="mx-1 h-3 w-px shrink-0 bg-[var(--border)]" />
        <ToolbarButton
          active={focusMode}
          title={focusMode ? 'Exit focus (Esc)' : 'Focus mode (F)'}
          onClick={toggleFocusMode}
          className={statusBtn}
        >
          <Focus size={13} />
        </ToolbarButton>
      </div>
    </footer>
  )
}

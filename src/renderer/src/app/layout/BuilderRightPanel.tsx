import { useEffect, useState } from 'react'
import {
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  PanelRightClose,
  PanelRight,
  Frame,
  SlidersHorizontal,
  Wand2,
  Download,
  ImagePlus
} from 'lucide-react'
import { useAppStore, type RightPanelTab } from '@renderer/stores/app-store'
import { useProjectStore } from '@renderer/stores/project-store'
import { TabBar, Button } from '@renderer/components/ui'
import { CanvasPanel } from '@renderer/features/canvas/CanvasPanel'
import { AdjustmentsPanel } from '@renderer/features/adjustments/AdjustmentsPanel'
import { BackgroundPanel } from '@renderer/features/background/BackgroundPanel'
import { ExportPanel } from '@renderer/features/export/ExportPanel'
import { loadThumbnail } from '@renderer/hooks/use-image-loader'
import { useImportAssets } from '@renderer/hooks/use-import-assets'
import { cn } from '@renderer/lib/utils'

export function BuilderRightPanel(): React.JSX.Element | null {
  const { rightCollapsed, toggleRight, rightPanelTab, setRightPanelTab, focusMode } = useAppStore()
  const project = useProjectStore((s) => s.project)
  const selectedAssetId = useProjectStore((s) => s.selectedAssetId)
  const setSelectedAssetId = useProjectStore((s) => s.setSelectedAssetId)
  const removeAssets = useProjectStore((s) => s.removeAssets)
  const { pickAndImport } = useImportAssets()
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!project) return
    for (const asset of project.assets) {
      loadThumbnail(asset.sourcePath)
        .then((thumb) => setThumbnails((prev) => ({ ...prev, [asset.sourcePath]: thumb })))
        .catch(() => {})
    }
  }, [project?.assets])

  if (focusMode) {
    return <div className="w-0 shrink-0 overflow-hidden" aria-hidden />
  }

  if (!project) return null

  const tabs: Array<{ id: RightPanelTab; label: string; icon?: React.ReactNode }> = [
    { id: 'canvas', label: 'Canvas', icon: <Frame size={12} /> },
    { id: 'adjust', label: 'Adjust', icon: <SlidersHorizontal size={12} /> },
    { id: 'background', label: 'BG', icon: <Wand2 size={12} /> },
    { id: 'export', label: 'Export', icon: <Download size={12} /> }
  ]

  if (rightCollapsed) {
    return (
      <aside className="flex w-10 shrink-0 flex-col items-center border-l border-[var(--border)] bg-[var(--bg-sidebar)] py-2">
        <button
          type="button"
          onClick={toggleRight}
          title="Expand inspector"
          className="focus-ring flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          <PanelRight size={15} />
        </button>
      </aside>
    )
  }

  const selectAdjacent = (dir: -1 | 1): void => {
    const idx = project.assets.findIndex((a) => a.id === selectedAssetId)
    const next = (idx + dir + project.assets.length) % project.assets.length
    setSelectedAssetId(project.assets[next].id)
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--bg-sidebar)]">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] pl-3.5 pr-2">
        <span className="section-title">Images ({project.assets.length})</span>
        <div className="flex shrink-0 items-center gap-0.5">
          {project.assets.length > 1 && (
            <>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => selectAdjacent(-1)}
                title="Previous"
              >
                <ChevronLeft size={13} />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => selectAdjacent(1)} title="Next">
                <ChevronRight size={13} />
              </Button>
            </>
          )}
          <Button size="icon" variant="ghost" onClick={pickAndImport} title="Import images">
            <Upload size={13} />
          </Button>
          <Button size="icon" variant="ghost" onClick={toggleRight} title="Collapse inspector">
            <PanelRightClose size={13} />
          </Button>
        </div>
      </div>

      <div className="shrink-0 border-b border-[var(--border)] px-3.5 py-3">
        {project.assets.length === 0 ? (
          <button
            type="button"
            onClick={pickAndImport}
            className="focus-ring flex w-full flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-input)]/40 px-4 py-7 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-muted)] hover:text-[var(--accent-hover)]"
          >
            <ImagePlus size={18} />
            Import images
          </button>
        ) : (
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
            {project.assets.map((asset) => {
              const isSelected = selectedAssetId === asset.id
              return (
                <div key={asset.id} className="group relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedAssetId(asset.id)}
                    title={asset.displayName}
                    className={cn(
                      'block h-14 w-14 overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-input)] transition-all duration-150',
                      isSelected
                        ? 'shadow-[0_0_0_2px_var(--accent)]'
                        : 'shadow-[0_0_0_1px_var(--border)] hover:shadow-[0_0_0_1px_var(--border-strong)]'
                    )}
                  >
                    {thumbnails[asset.sourcePath] ? (
                      <img
                        src={thumbnails[asset.sourcePath]}
                        className={cn(
                          'h-full w-full object-cover transition-opacity',
                          !isSelected && 'opacity-75 group-hover:opacity-100'
                        )}
                        alt=""
                      />
                    ) : (
                      <div className="skeleton h-full w-full" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAssets([asset.id])}
                    title="Remove"
                    className="absolute -right-1.5 -top-1.5 hidden h-[18px] w-[18px] items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--danger)] hover:text-white group-hover:flex"
                  >
                    <X size={10} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <TabBar
        tabs={tabs}
        active={rightPanelTab}
        onChange={(id) => setRightPanelTab(id as RightPanelTab)}
      />

      <div className="panel-body min-h-0 flex-1 overflow-y-auto">
        {rightPanelTab === 'canvas' && <CanvasPanel />}
        {rightPanelTab === 'adjust' && <AdjustmentsPanel />}
        {rightPanelTab === 'background' && <BackgroundPanel />}
        {rightPanelTab === 'export' && <ExportPanel />}
      </div>
    </aside>
  )
}

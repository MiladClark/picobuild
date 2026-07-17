import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Image as ImageIcon } from 'lucide-react'
import { Button } from '@renderer/components/ui'
import { EditorCanvas } from '@renderer/features/canvas/EditorCanvas'
import { useProjectStore } from '@renderer/stores/project-store'
import { useAppStore } from '@renderer/stores/app-store'
import { useEditorStore } from '@renderer/stores/editor-store'
import { useProjectSave } from '@renderer/hooks/use-project-save'
import { useApplyHistory } from '@renderer/hooks/use-apply-history'

const ZOOM_STEP = 0.15
const NUDGE_STEP = 1
const NUDGE_STEP_LARGE = 10

function useAutoSave(): void {
  const project = useProjectStore((s) => s.project)
  const isDirty = useProjectStore((s) => s.isDirty)
  const markClean = useProjectStore((s) => s.markClean)
  const setProject = useProjectStore((s) => s.setProject)

  useEffect(() => {
    if (!project || !isDirty || !project.filePath) return
    const timer = setTimeout(async () => {
      try {
        const saved = await window.api.project.save(project)
        setProject(saved)
        markClean()
      } catch (e) {
        console.error('Auto-save failed', e)
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [project, isDirty, markClean, setProject])
}

export function ImageBuilderPage(): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const project = useProjectStore((s) => s.project)
  const updateAsset = useProjectStore((s) => s.updateAsset)
  const selectedAssetId = useProjectStore((s) => s.selectedAssetId)
  const removeAssets = useProjectStore((s) => s.removeAssets)
  const {
    setActiveTool,
    activeTool,
    toggleFocusMode,
    setFocusMode,
    focusMode,
    setRightPanelTab,
    setRightCollapsed,
    zoom,
    setZoom,
    setPan,
    fitToView,
    toggleShortcuts
  } = useAppStore()
  const pushHistory = useEditorStore((s) => s.pushHistory)
  const handleSave = useProjectSave()
  const { undo, redo } = useApplyHistory()

  useAutoSave()

  useEffect(() => {
    if (!project) return
    for (const asset of project.assets) {
      window.api.image.exists(asset.sourcePath).then((exists) => {
        if (!exists && asset.status !== 'missing') {
          updateAsset(asset.id, { status: 'missing' })
        }
      })
    }
  }, [project?.id, updateAsset])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      if (e.key === 'v' || e.key === 'V') setActiveTool('select')
      if (e.key === 'm' || e.key === 'M') setActiveTool('move')
      if (e.key === 'c' || e.key === 'C') setActiveTool('crop')
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault()
        undo()
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault()
        redo()
      }
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false)
        return
      }
      if (e.key === 'f' || e.key === 'F') toggleFocusMode()
      if (e.key === 'e' || e.key === 'E') {
        if (focusMode) setFocusMode(false)
        setRightCollapsed(false)
        setRightPanelTab('export')
      }

      // Zoom & pan
      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        setZoom(zoom + ZOOM_STEP)
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        setZoom(zoom - ZOOM_STEP)
      }
      if (e.shiftKey && e.code === 'Digit1') {
        e.preventDefault()
        setZoom(1)
        setPan(0, 0)
      }
      if (e.shiftKey && e.code === 'Digit0') {
        e.preventDefault()
        fitToView()
      }

      // Show/hide the keyboard-shortcuts cheat sheet
      if (e.shiftKey && e.code === 'Slash') {
        e.preventDefault()
        toggleShortcuts()
      }

      // Nudge / delete the selected image
      const asset = project?.assets.find((a) => a.id === selectedAssetId)
      if (asset && (activeTool === 'select' || activeTool === 'move')) {
        const step = e.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP
        let dx = 0
        let dy = 0
        if (e.key === 'ArrowLeft') dx = -step
        else if (e.key === 'ArrowRight') dx = step
        else if (e.key === 'ArrowUp') dy = -step
        else if (e.key === 'ArrowDown') dy = step
        if (dx !== 0 || dy !== 0) {
          e.preventDefault()
          pushHistory({
            assetId: asset.id,
            transform: { ...asset.transform },
            adjustments: { ...asset.adjustments }
          })
          updateAsset(asset.id, {
            transform: { ...asset.transform, x: asset.transform.x + dx, y: asset.transform.y + dy }
          })
        }
      }
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedAssetId &&
        activeTool !== 'crop'
      ) {
        e.preventDefault()
        removeAssets([selectedAssetId])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    handleSave,
    setActiveTool,
    activeTool,
    undo,
    redo,
    focusMode,
    setFocusMode,
    toggleFocusMode,
    setRightPanelTab,
    setRightCollapsed,
    zoom,
    setZoom,
    setPan,
    fitToView,
    toggleShortcuts,
    project,
    selectedAssetId,
    updateAsset,
    removeAssets,
    pushHistory
  ])

  if (!project) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-[var(--bg-canvas)] p-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-xl)] bg-[var(--bg-elevated)] text-[var(--text-muted)] shadow-[inset_0_0_0_1px_var(--border)]">
          <ImageIcon size={24} strokeWidth={1.5} />
        </div>
        <div className="max-w-sm text-center">
          <p className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
            {t('imageBuilder.noProject')}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            Create or open a project to start editing
          </p>
        </div>
        <Button variant="primary" size="lg" onClick={() => navigate('/projects')}>
          {t('nav.projects')}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <EditorCanvas />
    </div>
  )
}

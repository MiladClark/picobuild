import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Image as ImageIcon } from 'lucide-react'
import { Button } from '@renderer/components/ui'
import { EditorCanvas } from '@renderer/features/canvas/EditorCanvas'
import { useProjectStore } from '@renderer/stores/project-store'
import { useAppStore } from '@renderer/stores/app-store'
import { useProjectSave } from '@renderer/hooks/use-project-save'
import { useApplyHistory } from '@renderer/hooks/use-apply-history'

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
  const {
    setActiveTool,
    toggleFocusMode,
    setFocusMode,
    focusMode,
    setRightPanelTab,
    setRightCollapsed
  } = useAppStore()
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
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    handleSave,
    setActiveTool,
    undo,
    redo,
    focusMode,
    setFocusMode,
    toggleFocusMode,
    setRightPanelTab,
    setRightCollapsed
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

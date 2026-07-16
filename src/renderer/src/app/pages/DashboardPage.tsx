import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, FolderOpen, Sparkles, ArrowRight, FileImage, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, PageHeader, Card } from '@renderer/components/ui'
import { useProjectStore } from '@renderer/stores/project-store'
import { createAssetsFromPaths } from '@renderer/lib/import-assets'

export function DashboardPage(): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { recentProjects, setProject, setRecentProjects } = useProjectStore()

  useEffect(() => {
    window.api.project.listRecent().then(setRecentProjects).catch(console.error)
  }, [setRecentProjects])

  const handleNew = async (): Promise<void> => {
    try {
      const result = await window.api.project.create()
      if (!result) return
      setProject(result.project)
      toast.success(t('projects.created'))
      navigate('/builder')
    } catch (e) {
      toast.error(String(e))
    }
  }

  const handleOpen = async (): Promise<void> => {
    try {
      const result = await window.api.project.open()
      if (!result) return
      setProject(result.project)
      toast.success(t('projects.opened'))
      navigate('/builder')
    } catch (e) {
      toast.error(String(e))
    }
  }

  const handleQuickDemo = async (): Promise<void> => {
    try {
      const samplePaths = await window.api.app.sampleImages()
      if (samplePaths.length === 0) {
        toast.error('No sample images found')
        return
      }
      const result = await window.api.project.create('Demo Project')
      if (!result) return
      const assets = await createAssetsFromPaths(samplePaths.slice(0, 2), result.project)
      const project = { ...result.project, assets }
      await window.api.project.save(project)
      setProject(project)
      toast.success(`Demo ready with ${assets.length} sample image(s)`)
      navigate('/builder')
    } catch (e) {
      toast.error(String(e))
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        actions={
          <>
            <Button variant="secondary" size="lg" onClick={handleOpen}>
              <FolderOpen size={15} />
              {t('dashboard.openProject')}
            </Button>
            <Button variant="primary" size="lg" onClick={handleNew}>
              <Plus size={15} />
              {t('dashboard.newProject')}
            </Button>
          </>
        }
      />

      <div className="page-content mx-auto w-full max-w-4xl flex-1">
        <Card
          onClick={handleQuickDemo}
          className="group mb-10 flex w-full items-center gap-4 border-transparent bg-gradient-to-r from-[var(--accent-muted)] to-transparent shadow-[inset_0_0_0_1px_var(--accent-ring)] hover:!translate-y-0 hover:border-transparent hover:from-[var(--accent-muted)] hover:to-[var(--accent-muted)]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[image:var(--accent-grad)] text-white shadow-[var(--shadow-sm),var(--edge-highlight)]">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">Try with sample images</p>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-muted)]">
              Quick demo with built-in test images
            </p>
          </div>
          <ArrowRight
            size={16}
            className="shrink-0 text-[var(--text-muted)] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[var(--accent-hover)]"
          />
        </Card>

        <h2 className="page-section-title">{t('dashboard.recentProjects')}</h2>

        {recentProjects.length === 0 ? (
          <p className="text-sm leading-relaxed text-[var(--text-muted)]">
            {t('dashboard.getStarted')}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recentProjects.map((p) => (
              <Card
                key={p.filePath}
                className="w-full"
                onClick={async () => {
                  const project = await window.api.project.openPath(p.filePath)
                  setProject(project)
                  navigate('/builder')
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] shadow-[inset_0_0_0_1px_var(--border)]">
                    <FileImage size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {p.name}
                    </p>
                    <p className="mono mt-1 truncate text-[var(--text-muted)]">{p.filePath}</p>
                    <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                      <Clock size={11} />
                      {new Date(p.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

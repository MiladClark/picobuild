import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, FolderOpen, Trash2 } from 'lucide-react'
import { Button, Modal, Input, PageHeader, ListRow } from '@renderer/components/ui'
import { useProjectStore } from '@renderer/stores/project-store'

export function ProjectsPage(): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { project, setProject, recentProjects, setRecentProjects } = useProjectStore()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')

  const refreshRecent = async (): Promise<void> => {
    const list = await window.api.project.listRecent()
    setRecentProjects(list)
  }

  const handleCreate = async (): Promise<void> => {
    try {
      const result = await window.api.project.create(newName || undefined)
      if (!result) return
      setProject(result.project)
      setShowCreate(false)
      setNewName('')
      toast.success(t('projects.created'))
      await refreshRecent()
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
      await refreshRecent()
      navigate('/builder')
    } catch (e) {
      toast.error(String(e))
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return
    try {
      await window.api.project.delete(deleteTarget)
      if (project?.filePath === deleteTarget) setProject(null)
      toast.success(t('projects.deleted'))
      setDeleteTarget(null)
      await refreshRecent()
    } catch (e) {
      toast.error(String(e))
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <PageHeader
        title={t('projects.title')}
        actions={
          <>
            <Button variant="secondary" onClick={handleOpen}>
              <FolderOpen size={15} />
              {t('projects.open')}
            </Button>
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              <Plus size={15} />
              {t('projects.create')}
            </Button>
          </>
        }
      />

      <div className="page-content mx-auto w-full max-w-4xl flex-1">
        {project && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-[var(--radius-lg)] bg-[var(--accent-muted)] px-5 py-4 shadow-[inset_0_0_0_1px_var(--accent-ring)]">
            <div className="min-w-0">
              <p className="section-title text-[var(--accent-hover)]">Current project</p>
              <p className="mt-1.5 truncate text-sm font-medium text-[var(--text-primary)]">
                {project.name}
              </p>
            </div>
            <Button size="sm" variant="primary" onClick={() => navigate('/builder')}>
              Continue editing
            </Button>
          </div>
        )}

        {recentProjects.length === 0 ? (
          <p className="py-10 text-center text-sm leading-relaxed text-[var(--text-muted)]">
            {t('dashboard.getStarted')}
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {recentProjects.map((p) => (
              <ListRow key={p.filePath} className="group">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {p.name}
                  </p>
                  <p className="mono truncate text-[var(--text-muted)]">{p.filePath}</p>
                </div>
                <div className="flex shrink-0 gap-1.5 opacity-60 transition-opacity group-hover:opacity-100">
                  <Button
                    size="sm"
                    onClick={async () => {
                      const opened = await window.api.project.openPath(p.filePath)
                      setProject(opened)
                      navigate('/builder')
                    }}
                  >
                    {t('projects.open')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="hover:!bg-[var(--danger-muted)] hover:!text-[var(--danger)]"
                    onClick={() => setDeleteTarget(p.filePath)}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </ListRow>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={t('projects.create')}
        footer={
          <>
            <Button onClick={() => setShowCreate(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleCreate}>
              {t('projects.create')}
            </Button>
          </>
        }
      >
        <Input
          label={t('projects.name')}
          placeholder={t('projects.namePlaceholder')}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('projects.delete')}
        footer={
          <>
            <Button onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={handleDelete}>
              {t('common.delete')}
            </Button>
          </>
        }
      >
        {t('projects.confirmDelete')}
      </Modal>
    </div>
  )
}

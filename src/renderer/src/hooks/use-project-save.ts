import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useProjectStore } from '@renderer/stores/project-store'

export function useProjectSave(): () => Promise<void> {
  const { t } = useTranslation()
  const project = useProjectStore((s) => s.project)
  const setProject = useProjectStore((s) => s.setProject)
  const markClean = useProjectStore((s) => s.markClean)

  return useCallback(async () => {
    if (!project) return
    try {
      const saved = await window.api.project.save(project)
      setProject(saved)
      markClean()
      toast.success(t('projects.saved'))
    } catch (e) {
      toast.error(String(e))
    }
  }, [project, setProject, markClean, t])
}

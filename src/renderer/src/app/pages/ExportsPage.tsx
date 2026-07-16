import { ExportPanel } from '@renderer/features/export/ExportPanel'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '@renderer/stores/project-store'
import { PageHeader } from '@renderer/components/ui'

export function ExportsPage(): React.JSX.Element {
  const { t } = useTranslation()
  const project = useProjectStore((s) => s.project)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <PageHeader title={t('nav.exports')} />

      <div className="page-content mx-auto w-full max-w-lg flex-1">
        {!project ? (
          <p className="text-sm leading-relaxed text-[var(--text-muted)]">
            {t('common.noProjectOpen')}
          </p>
        ) : (
          <ExportPanel />
        )}
      </div>
    </div>
  )
}

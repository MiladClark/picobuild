import { useTranslation } from 'react-i18next'
import { useProjectStore } from '@renderer/stores/project-store'
import { PageHeader, Card } from '@renderer/components/ui'

export function AssetsPage(): React.JSX.Element {
  const { t } = useTranslation()
  const project = useProjectStore((s) => s.project)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <PageHeader title={t('assets.title')} />

      <div className="page-content mx-auto w-full max-w-4xl flex-1">
        {!project ? (
          <p className="text-sm leading-relaxed text-[var(--text-muted)]">
            {t('common.noProjectOpen')}
          </p>
        ) : project.assets.length === 0 ? (
          <p className="text-sm leading-relaxed text-[var(--text-muted)]">{t('assets.noAssets')}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {project.assets.map((asset) => (
              <Card key={asset.id}>
                <p className="truncate font-medium text-[var(--text-primary)]">
                  {asset.displayName}
                </p>
                <p className="mt-2 truncate text-sm text-[var(--text-muted)]">{asset.sourcePath}</p>
                <div className="mt-4 flex gap-4 text-sm text-[var(--text-secondary)]">
                  <span>
                    {Math.round(asset.transform.width)}×{Math.round(asset.transform.height)}
                  </span>
                  <span className="capitalize">{asset.status}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Section, Button, Input, Slider, Select, SectionDivider } from '@renderer/components/ui'
import { useProjectStore } from '@renderer/stores/project-store'
import { formatRenamePattern, formatFileSize } from '@renderer/lib/format'

export function ExportPanel(): React.JSX.Element {
  const { t } = useTranslation()
  const project = useProjectStore((s) => s.project)
  const updateProject = useProjectStore((s) => s.updateProject)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [jobId, setJobId] = useState<string | null>(null)
  const jobIdRef = useRef<string | null>(null)
  const [estimate, setEstimate] = useState(0)
  const [previewNames, setPreviewNames] = useState<string[]>([])

  useEffect(() => {
    const unsub1 = window.api.export.onProgress((p) => setProgress(p.progress))
    const unsub2 = window.api.export.onComplete((data) => {
      if (jobIdRef.current && data.jobId !== jobIdRef.current) return
      setExporting(false)
      setProgress(100)
      jobIdRef.current = null

      if (data.error) {
        toast.error(`Export failed: ${data.error}`)
        return
      }

      const failed = data.results.filter((r) => r.status === 'failed')
      const succeeded = data.results.filter((r) => r.status === 'completed')

      if (failed.length > 0 && succeeded.length === 0) {
        toast.error(failed[0].error ?? 'Export failed')
      } else if (failed.length > 0) {
        toast.warning(`Exported ${succeeded.length} file(s), ${failed.length} failed`)
      } else if (succeeded.length > 0) {
        toast.success(t('export.completed'))
      } else {
        toast.error('No files were exported')
      }
    })
    return () => {
      unsub1()
      unsub2()
    }
  }, [t])

  useEffect(() => {
    if (!project) return
    window.api.export.estimate(project, project.assets.length).then(setEstimate)
    const names = project.assets.map(
      (a, i) =>
        `${formatRenamePattern(
          project.exportSettings.renamePattern,
          project.name,
          a.displayName,
          i + 1
        )}.${project.exportSettings.format === 'jpg' ? 'jpg' : project.exportSettings.format}`
    )
    setPreviewNames(names)
  }, [project])

  if (!project) return <></>

  const handleExport = async (): Promise<void> => {
    let outputDir = project.exportSettings.outputDir
    if (!outputDir) {
      outputDir = (await window.api.dialog.pickOutputDir()) ?? undefined
      if (!outputDir) return
      updateProject({ exportSettings: { ...project.exportSettings, outputDir } })
    }

    const assetIds = project.assets.map((a) => a.id)
    if (assetIds.length === 0) {
      toast.error('No assets to export')
      return
    }

    setExporting(true)
    setProgress(0)
    try {
      const id = await window.api.export.start(
        { ...project, exportSettings: { ...project.exportSettings, outputDir } },
        assetIds,
        outputDir
      )
      jobIdRef.current = id
      setJobId(id)
    } catch (e) {
      setExporting(false)
      toast.error(`Export failed: ${String(e)}`)
    }
  }

  return (
    <div className="panel-stack">
      <Section title="Output">
        <Select
          label={t('export.format')}
          value={project.exportSettings.format}
          options={[
            { value: 'png', label: 'PNG' },
            { value: 'jpg', label: 'JPG' },
            { value: 'webp', label: 'WebP' },
            { value: 'avif', label: 'AVIF' }
          ]}
          onChange={(value) =>
            updateProject({
              exportSettings: {
                ...project.exportSettings,
                format: value as typeof project.exportSettings.format
              }
            })
          }
        />

        <Slider
          label={t('export.quality')}
          value={project.exportSettings.quality}
          min={1}
          max={100}
          onChange={(v) =>
            updateProject({
              exportSettings: { ...project.exportSettings, quality: v }
            })
          }
        />

        <Input
          label={t('export.renamePattern')}
          value={project.exportSettings.renamePattern}
          onChange={(e) =>
            updateProject({
              exportSettings: { ...project.exportSettings, renamePattern: e.target.value }
            })
          }
        />

        {project.exportSettings.outputDir && (
          <p
            className="mono truncate rounded-[var(--radius-xs)] bg-[var(--bg-elevated)] px-2 py-1.5 text-[var(--text-muted)]"
            title={project.exportSettings.outputDir}
          >
            {project.exportSettings.outputDir}
          </p>
        )}
      </Section>

      <div className="section-divider">
        <Section title="Preview">
          <p className="text-xs text-[var(--text-muted)]">
            Est. size:{' '}
            <span className="font-medium tabular-nums text-[var(--text-secondary)]">
              {formatFileSize(estimate)}
            </span>
            {' · '}
            {project.assets.length} file(s)
          </p>
          {previewNames.length > 0 && (
            <div className="max-h-36 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2">
              {previewNames.map((n) => (
                <div key={n} className="mono truncate py-1 text-[var(--text-secondary)]">
                  {n}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {exporting && (
        <div className="h-1 overflow-hidden rounded-full bg-[var(--bg-active)]">
          <div
            className="h-full rounded-full bg-[image:var(--accent-grad)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <SectionDivider>
        <div className="flex gap-3">
          <Button
            size="md"
            variant="primary"
            className="flex-1"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? t('export.inProgress') : t('export.start')}
          </Button>
          {exporting && jobId && (
            <Button
              size="md"
              variant="secondary"
              onClick={() => {
                window.api.export.cancel(jobId)
                setExporting(false)
              }}
            >
              {t('export.cancel')}
            </Button>
          )}
        </div>
      </SectionDivider>
    </div>
  )
}

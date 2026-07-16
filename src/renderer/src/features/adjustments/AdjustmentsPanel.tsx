import { useTranslation } from 'react-i18next'
import { RotateCcw, ImageOff } from 'lucide-react'
import { Section, Slider, EmptyState } from '@renderer/components/ui'
import { useProjectStore } from '@renderer/stores/project-store'
import { useEditorStore } from '@renderer/stores/editor-store'
import { DEFAULT_ADJUSTMENTS } from '@shared/types/project'

export function AdjustmentsPanel(): React.JSX.Element {
  const { t } = useTranslation()
  const project = useProjectStore((s) => s.project)
  const selectedAssetId = useProjectStore((s) => s.selectedAssetId)
  const updateAsset = useProjectStore((s) => s.updateAsset)
  const pushHistory = useEditorStore((s) => s.pushHistory)

  const asset = project?.assets.find((a) => a.id === selectedAssetId)

  if (!asset) {
    return <EmptyState icon={<ImageOff size={16} />}>Select an image to adjust</EmptyState>
  }

  const setAdj = (key: keyof typeof asset.adjustments, value: number): void => {
    pushHistory({
      assetId: asset.id,
      transform: { ...asset.transform },
      adjustments: { ...asset.adjustments }
    })
    updateAsset(asset.id, {
      adjustments: { ...asset.adjustments, [key]: value }
    })
  }

  const isPristine = Object.entries(DEFAULT_ADJUSTMENTS).every(
    ([k, v]) => asset.adjustments[k as keyof typeof asset.adjustments] === v
  )

  return (
    <div className="panel-stack">
      <Section
        title={t('adjustments.title')}
        actions={
          <button
            type="button"
            title={t('adjustments.reset')}
            disabled={isPristine}
            onClick={() => updateAsset(asset.id, { adjustments: { ...DEFAULT_ADJUSTMENTS } })}
            className="focus-ring flex h-6 w-6 items-center justify-center rounded-[var(--radius-xs)] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-30"
          >
            <RotateCcw size={12} />
          </button>
        }
      >
        <Slider
          label={t('adjustments.brightness')}
          value={asset.adjustments.brightness}
          onChange={(v) => setAdj('brightness', v)}
        />
        <Slider
          label={t('adjustments.exposure')}
          value={asset.adjustments.exposure}
          onChange={(v) => setAdj('exposure', v)}
        />
        <Slider
          label={t('adjustments.contrast')}
          value={asset.adjustments.contrast}
          onChange={(v) => setAdj('contrast', v)}
        />
        <Slider
          label={t('adjustments.saturation')}
          value={asset.adjustments.saturation}
          onChange={(v) => setAdj('saturation', v)}
        />
        <Slider
          label={t('adjustments.temperature')}
          value={asset.adjustments.temperature}
          onChange={(v) => setAdj('temperature', v)}
        />
        <Slider
          label={t('adjustments.tint')}
          value={asset.adjustments.tint}
          onChange={(v) => setAdj('tint', v)}
        />
        <Slider
          label={t('adjustments.hue')}
          value={asset.adjustments.hue}
          min={-180}
          max={180}
          onChange={(v) => setAdj('hue', v)}
        />
      </Section>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Wand2, CheckCircle2, ChevronDown } from 'lucide-react'
import { Section, Button, ChipGroup, Toggle } from '@renderer/components/ui'
import { ColorPickerPopover, type ColorPickerTab } from '@renderer/components/ui/color-picker'
import { useProjectStore } from '@renderer/stores/project-store'
import { invalidateImagePreview } from '@renderer/hooks/use-image-loader'
import { cn } from '@renderer/lib/utils'

const QUALITY_KEY = 'picobuild.bg-removal-quality'
const DESPECKLE_KEY = 'picobuild.bg-removal-despeckle'

function loadQuality(): 'fast' | 'best' {
  try {
    return localStorage.getItem(QUALITY_KEY) === 'fast' ? 'fast' : 'best'
  } catch {
    return 'best'
  }
}

function loadDespeckle(): boolean {
  try {
    return localStorage.getItem(DESPECKLE_KEY) !== 'off'
  } catch {
    return true
  }
}

export function BackgroundPanel(): React.JSX.Element {
  const { t } = useTranslation()
  const project = useProjectStore((s) => s.project)
  const updateProject = useProjectStore((s) => s.updateProject)
  const selectedAssetId = useProjectStore((s) => s.selectedAssetId)
  const updateAsset = useProjectStore((s) => s.updateAsset)
  const [removing, setRemoving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [quality, setQuality] = useState<'fast' | 'best'>(loadQuality)
  const [despeckle, setDespeckle] = useState(loadDespeckle)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const removingAssetId = useRef<string | null>(null)

  useEffect(() => {
    const unsubscribe = window.api.background.onProgress((p) => {
      if (p.assetId === removingAssetId.current) setProgress(p.progress)
    })
    return unsubscribe
  }, [])

  if (!project) return <></>

  const { canvas } = project
  const asset = project.assets.find((a) => a.id === selectedAssetId)
  const bg = canvas.background
  const gradientEnd = bg.gradientEnd ?? '#432E73'

  const setBackground = (partial: Partial<typeof bg>): void => {
    updateProject({
      canvas: { ...canvas, background: { ...bg, ...partial } }
    })
  }

  const pickerTab: ColorPickerTab = bg.type === 'gradient' ? 'gradient' : 'solid'
  const fillPreview =
    bg.type === 'gradient' ? `linear-gradient(90deg, ${bg.value}, ${gradientEnd})` : bg.value

  const handleRemoveBg = async (): Promise<void> => {
    if (!asset) return

    setRemoving(true)
    setProgress(0)
    removingAssetId.current = asset.id
    try {
      updateAsset(asset.id, { status: 'processing' })
      const outputPath = await window.api.background.remove(asset.sourcePath, asset.id, {
        quality,
        despeckle
      })
      invalidateImagePreview(outputPath)
      if (asset.processedPath) invalidateImagePreview(asset.processedPath)
      updateAsset(asset.id, {
        processedPath: outputPath,
        backgroundRemoved: true,
        status: 'completed'
      })
      toast.success(t('background.removed'))
    } catch (e) {
      updateAsset(asset.id, { status: 'failed' })
      toast.error(`Background removal failed: ${String(e)}`)
    } finally {
      setRemoving(false)
      setProgress(0)
      removingAssetId.current = null
    }
  }

  return (
    <div className="panel-stack">
      <Section title="Canvas Background">
        <ChipGroup
          options={[
            { label: 'Color', value: 'color' },
            { label: 'Transparent', value: 'transparent' },
            { label: 'Gradient', value: 'gradient' }
          ]}
          value={bg.type}
          onChange={(type) => {
            setBackground({ type: type as typeof bg.type })
            if (type === 'transparent') setPickerOpen(false)
          }}
        />

        {bg.type !== 'transparent' && (
          <button
            type="button"
            ref={triggerRef}
            onClick={() => setPickerOpen((o) => !o)}
            className={cn(
              'focus-ring flex h-[var(--h-control)] w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] border bg-[var(--bg-input)] px-2.5 transition-colors',
              pickerOpen
                ? 'border-[var(--accent)] shadow-[0_0_0_2px_var(--accent-ring)]'
                : 'border-[var(--border)] hover:border-[var(--border-strong)]'
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-4 w-9 shrink-0 rounded-[4px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]"
                style={{ background: fillPreview }}
              />
              <span className="mono truncate uppercase text-[var(--text-primary)]">
                {bg.type === 'gradient' ? `${bg.value} → ${gradientEnd}` : bg.value}
              </span>
            </span>
            <ChevronDown
              size={13}
              className={cn(
                'shrink-0 text-[var(--text-muted)] transition-transform duration-150',
                pickerOpen && 'rotate-180'
              )}
            />
          </button>
        )}

        <ColorPickerPopover
          open={pickerOpen}
          anchorRef={triggerRef}
          onClose={() => setPickerOpen(false)}
          tab={pickerTab}
          onTabChange={(tab) => setBackground({ type: tab === 'gradient' ? 'gradient' : 'color' })}
          solid={bg.value}
          onSolidChange={(value) => setBackground({ value })}
          gradient={{ start: bg.value, end: gradientEnd }}
          onGradientChange={(g) => setBackground({ value: g.start, gradientEnd: g.end })}
        />
      </Section>

      {asset && (
        <div className="section-divider">
          <Section title="Remove Background">
            <p className="text-xs leading-relaxed text-[var(--text-muted)]">
              AI-powered background removal. Runs fully offline on your device.
            </p>

            <ChipGroup
              options={[
                { label: 'Best quality', value: 'best' },
                { label: 'Fast', value: 'fast' }
              ]}
              value={quality}
              onChange={(v) => {
                const next = v as 'fast' | 'best'
                setQuality(next)
                try {
                  localStorage.setItem(QUALITY_KEY, next)
                } catch {
                  /* ignore */
                }
              }}
            />

            <Toggle
              label="Clean up leftover residue"
              checked={despeckle}
              onChange={(v) => {
                setDespeckle(v)
                try {
                  localStorage.setItem(DESPECKLE_KEY, v ? 'on' : 'off')
                } catch {
                  /* ignore */
                }
              }}
            />

            <Button
              size="md"
              variant="primary"
              className="w-full"
              onClick={handleRemoveBg}
              disabled={removing}
            >
              <Wand2 size={13} />
              {removing ? t('background.removing') : t('background.removeBg')}
            </Button>
            {removing && (
              <div className="flex items-center gap-2.5">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--bg-active)]">
                  <div
                    className="h-full rounded-full bg-[image:var(--accent-grad)] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="min-w-[32px] text-right text-[11px] tabular-nums text-[var(--text-muted)]">
                  {Math.round(progress)}%
                </span>
              </div>
            )}
            {asset.backgroundRemoved && !removing && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--success)]">
                <CheckCircle2 size={13} />
                Background removed
              </p>
            )}
          </Section>
        </div>
      )}
    </div>
  )
}

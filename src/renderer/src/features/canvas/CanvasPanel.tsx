import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link2, Link2Off } from 'lucide-react'
import { Input, Section, FieldGrid } from '@renderer/components/ui'
import { useProjectStore } from '@renderer/stores/project-store'
import { cn } from '@renderer/lib/utils'

function LinkToggle({
  linked,
  title,
  onChange
}: {
  linked: boolean
  title: string
  onChange: (v: boolean) => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={linked}
      title={title}
      onClick={() => onChange(!linked)}
      className={cn(
        'focus-ring flex h-6 w-6 items-center justify-center rounded-[var(--radius-xs)] transition-colors',
        linked
          ? 'bg-[var(--accent-muted)] text-[var(--accent-hover)] shadow-[inset_0_0_0_1px_var(--accent-ring)]'
          : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
      )}
    >
      {linked ? <Link2 size={13} /> : <Link2Off size={13} />}
    </button>
  )
}

export function CanvasPanel(): React.JSX.Element {
  const { t } = useTranslation()
  const project = useProjectStore((s) => s.project)
  const updateProject = useProjectStore((s) => s.updateProject)
  const [marginsLinked, setMarginsLinked] = useState(() => {
    const m = project?.margins
    return !!m && m.top === m.right && m.top === m.bottom && m.top === m.left
  })

  if (!project) return <></>

  const { canvas, margins } = project

  const setCanvas = (partial: Partial<typeof canvas>): void => {
    updateProject({ canvas: { ...canvas, ...partial } })
  }

  const setWidth = (w: number): void => {
    if (canvas.aspectLock && canvas.width > 0 && canvas.height > 0 && w > 0) {
      setCanvas({ width: w, height: Math.round(w / (canvas.width / canvas.height)) })
    } else {
      setCanvas({ width: w })
    }
  }

  const setHeight = (h: number): void => {
    if (canvas.aspectLock && canvas.width > 0 && canvas.height > 0 && h > 0) {
      setCanvas({ height: h, width: Math.round(h * (canvas.width / canvas.height)) })
    } else {
      setCanvas({ height: h })
    }
  }

  const setMargin = (side: 'top' | 'right' | 'bottom' | 'left', value: number): void => {
    if (marginsLinked) {
      updateProject({ margins: { top: value, right: value, bottom: value, left: value } })
    } else {
      updateProject({ margins: { ...margins, [side]: value } })
    }
  }

  return (
    <div className="panel-stack">
      <Section
        title="Canvas Size"
        actions={
          <LinkToggle
            linked={canvas.aspectLock}
            title={t('canvas.aspectLock')}
            onChange={(v) => setCanvas({ aspectLock: v })}
          />
        }
      >
        <FieldGrid>
          <Input
            label={t('canvas.width')}
            type="number"
            suffix="px"
            value={canvas.width}
            onChange={(e) => setWidth(Number(e.target.value))}
          />
          <Input
            label={t('canvas.height')}
            type="number"
            suffix="px"
            value={canvas.height}
            onChange={(e) => setHeight(Number(e.target.value))}
          />
        </FieldGrid>

        <Input
          label={t('canvas.dpi')}
          type="number"
          suffix="dpi"
          value={canvas.dpi}
          onChange={(e) => setCanvas({ dpi: Number(e.target.value) })}
        />
      </Section>

      <div className="section-divider">
        <Section
          title="Margins"
          actions={
            <LinkToggle
              linked={marginsLinked}
              title="Link all margins"
              onChange={(v) => {
                setMarginsLinked(v)
                if (v) {
                  updateProject({
                    margins: {
                      top: margins.top,
                      right: margins.top,
                      bottom: margins.top,
                      left: margins.top
                    }
                  })
                }
              }}
            />
          }
        >
          <FieldGrid>
            {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
              <Input
                key={side}
                label={side.charAt(0).toUpperCase() + side.slice(1)}
                type="number"
                suffix="px"
                value={margins[side]}
                onChange={(e) => setMargin(side, Number(e.target.value))}
              />
            ))}
          </FieldGrid>
        </Section>
      </div>
    </div>
  )
}

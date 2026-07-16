import {
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  LocateFixed,
  ScanLine
} from 'lucide-react'
import { ToolbarButton } from '@renderer/components/ui'
import { useAlignActions } from '@renderer/hooks/use-align-actions'
import { cn } from '@renderer/lib/utils'

export function BuilderAlignToolbar({ compact = false }: { compact?: boolean }): React.JSX.Element {
  const { hasAsset, applyAlign, snapProductToGrid } = useAlignActions()
  const btn = compact ? 'h-7 w-7' : undefined
  const icon = compact ? 14 : 15
  const divider = compact ? 'mx-1 h-4' : 'mx-1 h-5'

  return (
    <div className="flex items-center gap-0.5">
      <ToolbarButton
        disabled={!hasAsset}
        title="Align left"
        onClick={() => applyAlign('left')}
        className={btn}
      >
        <AlignHorizontalJustifyStart size={icon} />
      </ToolbarButton>
      <ToolbarButton
        disabled={!hasAsset}
        title="Center horizontal"
        onClick={() => applyAlign('center-h')}
        className={btn}
      >
        <AlignHorizontalJustifyCenter size={icon} />
      </ToolbarButton>
      <ToolbarButton
        disabled={!hasAsset}
        title="Align right"
        onClick={() => applyAlign('right')}
        className={btn}
      >
        <AlignHorizontalJustifyEnd size={icon} />
      </ToolbarButton>

      <div className={cn('w-px bg-[var(--border)]', divider)} />

      <ToolbarButton
        disabled={!hasAsset}
        title="Align top"
        onClick={() => applyAlign('top')}
        className={btn}
      >
        <AlignVerticalJustifyStart size={icon} />
      </ToolbarButton>
      <ToolbarButton
        disabled={!hasAsset}
        title="Center vertical"
        onClick={() => applyAlign('center-v')}
        className={btn}
      >
        <AlignVerticalJustifyCenter size={icon} />
      </ToolbarButton>
      <ToolbarButton
        disabled={!hasAsset}
        title="Align bottom"
        onClick={() => applyAlign('bottom')}
        className={btn}
      >
        <AlignVerticalJustifyEnd size={icon} />
      </ToolbarButton>

      <div className={cn('w-px bg-[var(--border)]', divider)} />

      <ToolbarButton
        disabled={!hasAsset}
        title="Center in canvas"
        onClick={() => applyAlign('center')}
        className={btn}
      >
        <LocateFixed size={icon} />
      </ToolbarButton>
      <ToolbarButton
        disabled={!hasAsset}
        title="Detect product & fit to grid (wide: left/right, tall: top/bottom)"
        onClick={snapProductToGrid}
        className={btn}
      >
        <ScanLine size={icon} />
      </ToolbarButton>
    </div>
  )
}

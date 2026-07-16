import { GRID_MAJOR, GRID_STEP } from '@renderer/lib/grid'

export const RULER_SIZE = 36

interface RulerCornerProps {
  size?: number
}

function RulerCorner({ size = RULER_SIZE }: RulerCornerProps): React.JSX.Element {
  return (
    <div
      className="relative shrink-0 border-r border-[var(--border)] bg-[var(--bg-ruler)]"
      style={{ width: size, height: size }}
    >
      <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wider text-[var(--ruler-muted)]">
        px
      </span>
    </div>
  )
}

interface TopRulerProps {
  offsetX: number
  displayScale: number
  canvasWidth: number
}

function TopRuler({ offsetX, displayScale, canvasWidth }: TopRulerProps): React.JSX.Element {
  const ticks: React.JSX.Element[] = []

  for (let px = 0; px <= canvasWidth; px += GRID_STEP) {
    const major = px % GRID_MAJOR === 0
    const x = px * displayScale
    ticks.push(
      <div
        key={`t-${px}`}
        className="absolute bottom-0 w-px"
        style={{
          left: x,
          height: major ? 16 : 9,
          background: major ? 'var(--ruler-tick-major)' : 'var(--ruler-tick-minor)'
        }}
      />
    )
    if (major) {
      ticks.push(
        <span
          key={`tl-${px}`}
          className="absolute -translate-x-1/2 select-none text-[11px] font-bold tabular-nums leading-none text-[var(--ruler-text)]"
          style={{ left: x, bottom: 18 }}
        >
          {px}
        </span>
      )
    }
  }

  return (
    <div
      className="relative min-w-0 flex-1 overflow-hidden border-[var(--border)] bg-[var(--bg-ruler)] shadow-[inset_0_-1px_0_0_var(--border)]"
      style={{ height: RULER_SIZE }}
    >
      <div
        className="absolute inset-y-0"
        style={{ transform: `translateX(${offsetX}px)`, width: canvasWidth * displayScale }}
      >
        {ticks}
      </div>
    </div>
  )
}

interface LeftRulerProps {
  offsetY: number
  displayScale: number
  canvasHeight: number
}

function LeftRuler({ offsetY, displayScale, canvasHeight }: LeftRulerProps): React.JSX.Element {
  const ticks: React.JSX.Element[] = []

  for (let px = 0; px <= canvasHeight; px += GRID_STEP) {
    const major = px % GRID_MAJOR === 0
    const y = px * displayScale
    ticks.push(
      <div
        key={`l-${px}`}
        className="absolute right-0 h-px"
        style={{
          top: y,
          width: major ? 16 : 9,
          background: major ? 'var(--ruler-tick-major)' : 'var(--ruler-tick-minor)'
        }}
      />
    )
    if (major) {
      ticks.push(
        <span
          key={`ll-${px}`}
          className="absolute -translate-y-1/2 select-none pl-1.5 text-[10px] font-bold tabular-nums leading-none text-[var(--ruler-text)]"
          style={{ top: y, left: 0, width: RULER_SIZE - 4 }}
        >
          {px}
        </span>
      )
    }
  }

  return (
    <div
      className="relative shrink-0 overflow-hidden border-r border-[var(--border)] bg-[var(--bg-ruler)] shadow-[inset_-1px_0_0_0_var(--border)]"
      style={{ width: RULER_SIZE }}
    >
      <div
        className="absolute left-0 right-0"
        style={{ transform: `translateY(${offsetY}px)`, height: canvasHeight * displayScale }}
      >
        {ticks}
      </div>
    </div>
  )
}

interface CanvasWorkspaceProps {
  showRuler: boolean
  offsetX: number
  offsetY: number
  displayScale: number
  canvasWidth: number
  canvasHeight: number
  children: React.ReactNode
}

export function CanvasWorkspace({
  showRuler,
  offsetX,
  offsetY,
  displayScale,
  canvasWidth,
  canvasHeight,
  children
}: CanvasWorkspaceProps): React.JSX.Element {
  if (!showRuler) {
    return (
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    )
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0" style={{ height: RULER_SIZE }}>
        <RulerCorner />
        <TopRuler offsetX={offsetX} displayScale={displayScale} canvasWidth={canvasWidth} />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1">
        <LeftRuler offsetY={offsetY} displayScale={displayScale} canvasHeight={canvasHeight} />
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}

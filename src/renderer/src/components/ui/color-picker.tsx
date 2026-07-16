import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pipette, Plus, ArrowLeftRight, X } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

/* ------------------------------------------------------------- color utils */

interface HSV {
  h: number // 0-360
  s: number // 0-1
  v: number // 0-1
}

function normalizeHex(input: string): string | null {
  let s = input.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    s = s
      .split('')
      .map((c) => c + c)
      .join('')
  }
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null
  return `#${s.toUpperCase()}`
}

function hexToHsv(hex: string): HSV {
  const n = normalizeHex(hex) ?? '#FFFFFF'
  const r = parseInt(n.slice(1, 3), 16) / 255
  const g = parseInt(n.slice(3, 5), 16) / 255
  const b = parseInt(n.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6)
    else if (max === g) h = 60 * ((b - r) / d + 2)
    else h = 60 * ((r - g) / d + 4)
  }
  if (h < 0) h += 360
  return { h, s: max === 0 ? 0 : d / max, v: max }
}

function hsvToHex({ h, s, v }: HSV): string {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const to = (n: number): string =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase()
}

/* ------------------------------------------------------------ saved colors */

const SAVED_KEY = 'picobuild.saved-colors'
const DEFAULT_SAVED = [
  '#FFFFFF',
  '#F4F4F5',
  '#18181B',
  '#7F56D9',
  '#432E73',
  '#2563EB',
  '#0EA5E9',
  '#10B981',
  '#F59E0B',
  '#EF4444'
]

function loadSaved(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY)
    if (!raw) return DEFAULT_SAVED
    const arr = JSON.parse(raw)
    if (Array.isArray(arr) && arr.every((c) => typeof c === 'string')) return arr
  } catch {
    /* ignore */
  }
  return DEFAULT_SAVED
}

function persistSaved(colors: string[]): void {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(colors))
  } catch {
    /* ignore */
  }
}

/* --------------------------------------------------------------- drag hook */

function useDrag(
  onMove: (xRatio: number, yRatio: number) => void
): (e: React.PointerEvent<HTMLDivElement>) => void {
  return useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = e.currentTarget
      el.setPointerCapture(e.pointerId)
      const rect = el.getBoundingClientRect()
      const update = (clientX: number, clientY: number): void => {
        const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
        const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height))
        onMove(x, y)
      }
      update(e.clientX, e.clientY)
      const move = (ev: PointerEvent): void => update(ev.clientX, ev.clientY)
      const up = (): void => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    },
    [onMove]
  )
}

/* ------------------------------------------------------------ SV area + hue */

function SVArea({ hsv, onChange }: { hsv: HSV; onChange: (hsv: HSV) => void }): React.JSX.Element {
  const onPointerDown = useDrag((x, y) => onChange({ ...hsv, s: x, v: 1 - y }))
  return (
    <div
      onPointerDown={onPointerDown}
      className="relative h-[150px] w-full cursor-crosshair touch-none rounded-[var(--radius-md)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
      style={{
        background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h}, 100%, 50%))`
      }}
    >
      <div
        className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35),0_1px_3px_rgba(0,0,0,0.4)]"
        style={{
          left: `${hsv.s * 100}%`,
          top: `${(1 - hsv.v) * 100}%`,
          background: hsvToHex(hsv)
        }}
      />
    </div>
  )
}

function HueSlider({
  hue,
  onChange
}: {
  hue: number
  onChange: (h: number) => void
}): React.JSX.Element {
  const onPointerDown = useDrag((x) => onChange(Math.min(359.9, x * 360)))
  return (
    <div
      onPointerDown={onPointerDown}
      className="relative h-3 flex-1 cursor-ew-resize touch-none rounded-full"
      style={{
        background:
          'linear-gradient(to right, #f00, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00)'
      }}
    >
      <div
        className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35),0_1px_3px_rgba(0,0,0,0.4)]"
        style={{ left: `${(hue / 360) * 100}%`, background: `hsl(${hue}, 100%, 50%)` }}
      />
    </div>
  )
}

/* ---------------------------------------------------------------- hex field */

function HexField({
  value,
  onChange,
  className
}: {
  value: string
  onChange: (hex: string) => void
  className?: string
}): React.JSX.Element {
  const [draft, setDraft] = useState(value.replace(/^#/, ''))
  const [editing, setEditing] = useState(false)
  const [lastValue, setLastValue] = useState(value)

  // Sync external value changes into the draft while not editing (render-time
  // derived-state adjustment, per React guidance).
  if (value !== lastValue) {
    setLastValue(value)
    if (!editing) setDraft(value.replace(/^#/, ''))
  }

  const commit = (): void => {
    const n = normalizeHex(draft)
    if (n) onChange(n)
    else setDraft(value.replace(/^#/, ''))
    setEditing(false)
  }

  return (
    <div
      className={cn(
        'flex h-[var(--h-control)] min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-input)] px-2 transition-colors focus-within:border-[var(--accent)] hover:border-[var(--border-strong)]',
        className
      )}
    >
      <span
        className="h-4 w-4 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]"
        style={{ background: value }}
      />
      <span className="text-[11px] text-[var(--text-muted)]">#</span>
      <input
        value={draft}
        spellCheck={false}
        onFocus={(e) => {
          setEditing(true)
          e.target.select()
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setDraft(value.replace(/^#/, ''))
            setEditing(false)
            e.currentTarget.blur()
          }
        }}
        className="mono w-full min-w-0 bg-transparent uppercase text-[var(--text-primary)] outline-none"
      />
    </div>
  )
}

/* ------------------------------------------------------------- saved colors */

function SavedSwatches({
  current,
  onPick
}: {
  current: string
  onPick: (hex: string) => void
}): React.JSX.Element {
  const [saved, setSaved] = useState<string[]>(loadSaved)
  const normalized = normalizeHex(current)

  const add = (): void => {
    if (!normalized || saved.includes(normalized)) return
    const next = [...saved, normalized].slice(-20)
    setSaved(next)
    persistSaved(next)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--text-primary)]">Saved</span>
        <button
          type="button"
          onClick={add}
          className="focus-ring flex items-center gap-1 rounded-[var(--radius-xs)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          <Plus size={11} />
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {saved.map((c) => {
          const active = normalized === c
          return (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => onPick(c)}
              className={cn(
                'h-[18px] w-[18px] rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)] transition-transform hover:scale-110',
                active &&
                  'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-popover)]'
              )}
              style={{ background: c }}
            />
          )
        })}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- eyedropper */

interface EyeDropperResult {
  sRGBHex: string
}
interface EyeDropperAPI {
  open: () => Promise<EyeDropperResult>
}

function EyedropperButton({ onPick }: { onPick: (hex: string) => void }): React.JSX.Element | null {
  const Ctor = (window as unknown as { EyeDropper?: new () => EyeDropperAPI }).EyeDropper
  if (!Ctor) return null
  return (
    <button
      type="button"
      title="Pick color from screen"
      onClick={async () => {
        try {
          const result = await new Ctor().open()
          const n = normalizeHex(result.sRGBHex)
          if (n) onPick(n)
        } catch {
          /* cancelled */
        }
      }}
      className="focus-ring flex h-[var(--h-control)] w-[var(--h-control)] shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
    >
      <Pipette size={13} />
    </button>
  )
}

/* ------------------------------------------------------------- solid editor */

function SolidEditor({
  value,
  onChange
}: {
  value: string
  onChange: (hex: string) => void
}): React.JSX.Element {
  // Keep HSV state so hue survives round-trips through black/white/grey hex values.
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(value))
  const [lastValue, setLastValue] = useState(value)

  // External change (saved swatch, eyedropper, hex field): resync unless it
  // matches what our current HSV already encodes (render-time adjustment).
  if (value !== lastValue) {
    setLastValue(value)
    if (normalizeHex(value) !== hsvToHex(hsv)) setHsv(hexToHsv(value))
  }

  const commit = (next: HSV): void => {
    setHsv(next)
    onChange(hsvToHex(next))
  }

  return (
    <div className="flex flex-col gap-3">
      <SVArea hsv={hsv} onChange={commit} />
      <div className="flex items-center gap-2.5">
        <EyedropperButton onPick={onChange} />
        <HueSlider hue={hsv.h} onChange={(h) => commit({ ...hsv, h })} />
      </div>
      <HexField value={normalizeHex(value) ?? '#FFFFFF'} onChange={onChange} />
    </div>
  )
}

/* ---------------------------------------------------------- gradient editor */

interface GradientValue {
  start: string
  end: string
}

function GradientEditor({
  gradient,
  onChange,
  selected,
  setSelected
}: {
  gradient: GradientValue
  onChange: (g: GradientValue) => void
  selected: 'start' | 'end'
  setSelected: (which: 'start' | 'end') => void
}): React.JSX.Element {
  const selectedColor = normalizeHex(gradient[selected]) ?? '#FFFFFF'

  const setStop = (which: 'start' | 'end', hex: string): void => {
    onChange({ ...gradient, [which]: hex })
  }

  // Vertical to match the actual canvas/export gradient direction.
  const css = `linear-gradient(180deg, ${gradient.start}, ${gradient.end})`

  return (
    <div className="flex flex-col gap-3">
      {/* Preview with diagonal axis */}
      <div
        className="relative h-[110px] w-full rounded-[var(--radius-md)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
        style={{ background: css }}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          <line
            x1="50%"
            y1="14%"
            x2="50%"
            y2="86%"
            stroke="rgba(255,255,255,0.75)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        </svg>
        <button
          type="button"
          title="Start color"
          onClick={() => setSelected('start')}
          className={cn(
            'absolute left-1/2 top-[14%] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)] transition-transform',
            selected === 'start' && 'scale-125'
          )}
          style={{ background: gradient.start }}
        />
        <button
          type="button"
          title="End color"
          onClick={() => setSelected('end')}
          className={cn(
            'absolute left-1/2 top-[86%] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)] transition-transform',
            selected === 'end' && 'scale-125'
          )}
          style={{ background: gradient.end }}
        />
      </div>

      {/* Type row + swap */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-secondary)]">Linear</span>
        <button
          type="button"
          title="Swap colors"
          onClick={() => onChange({ start: gradient.end, end: gradient.start })}
          className="focus-ring flex h-6 w-6 items-center justify-center rounded-[var(--radius-xs)] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeftRight size={13} />
        </button>
      </div>

      {/* Gradient bar with stop knobs */}
      <div
        className="relative h-3 rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
        style={{ background: `linear-gradient(to right, ${gradient.start}, ${gradient.end})` }}
      >
        {(['start', 'end'] as const).map((which) => (
          <button
            key={which}
            type="button"
            onClick={() => setSelected(which)}
            className={cn(
              'absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)] transition-transform',
              selected === which && 'scale-125'
            )}
            style={{
              left: which === 'start' ? '2%' : '98%',
              background: gradient[which]
            }}
          />
        ))}
      </div>

      {/* Stops list */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--text-primary)]">Stops</span>
        {(['start', 'end'] as const).map((which) => {
          const active = selected === which
          return (
            <div key={which} className="flex items-center gap-1.5">
              <span
                className={cn(
                  'flex h-[var(--h-control)] w-12 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border text-[11px] tabular-nums',
                  active
                    ? 'border-[var(--accent)] text-[var(--text-primary)]'
                    : 'border-[var(--border)] text-[var(--text-muted)]'
                )}
              >
                {which === 'start' ? '0%' : '100%'}
              </span>
              <button
                type="button"
                onClick={() => setSelected(which)}
                className={cn(
                  'flex h-[var(--h-control)] min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-sm)] border bg-[var(--bg-input)] px-2 text-left transition-colors',
                  active
                    ? 'border-[var(--accent)]'
                    : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                )}
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]"
                  style={{ background: gradient[which] }}
                />
                <span className="mono truncate uppercase text-[var(--text-primary)]">
                  {normalizeHex(gradient[which]) ?? gradient[which]}
                </span>
              </button>
            </div>
          )
        })}
      </div>

      {/* Editor for the selected stop */}
      <div className="section-divider">
        <SolidEditor value={selectedColor} onChange={(hex) => setStop(selected, hex)} />
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- popover */

export type ColorPickerTab = 'solid' | 'gradient'

interface ColorPickerPopoverProps {
  open: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  onClose: () => void
  tab: ColorPickerTab
  onTabChange: (tab: ColorPickerTab) => void
  solid: string
  onSolidChange: (hex: string) => void
  gradient: GradientValue
  onGradientChange: (g: GradientValue) => void
}

const POPOVER_WIDTH = 268

export function ColorPickerPopover({
  open,
  anchorRef,
  onClose,
  tab,
  onTabChange,
  solid,
  onSolidChange,
  gradient,
  onGradientChange
}: ColorPickerPopoverProps): React.JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: 0, top: 0 })
  const [selectedStop, setSelectedStop] = useState<'start' | 'end'>('start')

  const place = useCallback((): void => {
    const anchor = anchorRef.current
    if (!anchor) return
    const r = anchor.getBoundingClientRect()
    const height = ref.current?.offsetHeight ?? 420
    let left = r.right - POPOVER_WIDTH
    left = Math.max(8, Math.min(left, window.innerWidth - POPOVER_WIDTH - 8))
    let top = r.bottom + 6
    if (top + height > window.innerHeight - 8) {
      top = Math.max(8, r.top - height - 6)
    }
    setPos({ left, top })
  }, [anchorRef])

  useLayoutEffect(() => {
    if (open) place()
  }, [open, tab, place])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent): void => {
      if (
        !ref.current?.contains(e.target as Node) &&
        !anchorRef.current?.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onClose)
    }
  }, [open, anchorRef, onClose])

  const currentForSaved = useMemo(
    () => (tab === 'solid' ? solid : gradient[selectedStop]),
    [tab, solid, gradient, selectedStop]
  )

  if (!open) return null

  return createPortal(
    <div
      ref={ref}
      className="pop-surface pop-animate fixed z-[70] flex max-h-[calc(100vh-16px)] flex-col overflow-y-auto p-3"
      style={{ left: pos.left, top: pos.top, width: POPOVER_WIDTH }}
    >
      {/* Header: tabs + close */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {(['solid', 'gradient'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={cn(
                'focus-ring relative rounded-[var(--radius-xs)] px-2 py-1 text-xs font-medium capitalize transition-colors',
                tab === id
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              {id}
              {tab === id && (
                <span className="absolute inset-x-1.5 -bottom-0.5 h-[2px] rounded-full bg-[var(--accent)]" />
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="focus-ring flex h-6 w-6 items-center justify-center rounded-[var(--radius-xs)] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          <X size={13} />
        </button>
      </div>

      {tab === 'solid' ? (
        <SolidEditor value={solid} onChange={onSolidChange} />
      ) : (
        <GradientEditor
          gradient={gradient}
          onChange={onGradientChange}
          selected={selectedStop}
          setSelected={setSelectedStop}
        />
      )}

      <div className="section-divider mt-3">
        <SavedSwatches
          current={currentForSaved}
          onPick={(hex) => {
            if (tab === 'solid') onSolidChange(hex)
            else onGradientChange({ ...gradient, [selectedStop]: hex })
          }}
        />
      </div>
    </div>,
    document.body
  )
}

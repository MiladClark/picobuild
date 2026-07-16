import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

/* ------------------------------------------------------------------ Button */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'toolbar'
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'bar'
  children: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <button
      className={cn(
        'focus-ring inline-flex select-none items-center justify-center font-medium transition-all duration-150',
        'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
        size === 'icon' && 'h-7 w-7 rounded-[var(--radius-sm)] text-sm',
        size === 'bar' && 'h-7 w-7 shrink-0 rounded-[var(--radius-sm)] text-sm',
        size === 'sm' && 'h-[26px] gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-xs',
        size === 'md' && 'h-[30px] gap-1.5 rounded-[var(--radius-sm)] px-3 text-xs',
        size === 'lg' && 'h-10 gap-2 rounded-[var(--radius-md)] px-4 text-sm',
        variant === 'primary' &&
          'bg-[image:var(--accent-grad)] text-white shadow-[var(--shadow-sm),var(--edge-highlight)] hover:brightness-110',
        variant === 'secondary' &&
          'border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--edge-highlight)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]',
        variant === 'ghost' &&
          'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
        variant === 'danger' &&
          'bg-[var(--danger)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--danger-hover)]',
        variant === 'toolbar' &&
          'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:text-[var(--text-muted)]',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------- Modal */

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer
}: ModalProps): React.JSX.Element | null {
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="overlay-animate absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="modal-animate relative z-10 w-full max-w-md overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-panel)] shadow-[var(--shadow-lg)]">
        <div className="flex items-center justify-between gap-4 px-5 pb-1 pt-4">
          <h2 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="focus-ring -mr-1 flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            <X size={14} />
          </button>
        </div>
        <div className="px-5 py-4 text-sm leading-relaxed text-[var(--text-secondary)]">
          {children}
        </div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-sidebar)]/60 px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

/* ------------------------------------------------------------------- Field */

function FieldLabel({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <span className="text-[10.5px] font-medium tracking-wide text-[var(--text-muted)]">
      {children}
    </span>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  suffix?: string
}

export function Input({ label, suffix, className, ...props }: InputProps): React.JSX.Element {
  return (
    <label className="flex min-w-0 flex-col gap-[var(--space-label)]">
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className="relative flex min-w-0">
        <input
          className={cn(
            'focus-ring h-[var(--h-control)] w-full min-w-0 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-input)] px-2.5 text-xs text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-muted)] hover:border-[var(--border-strong)]',
            props.type === 'number' && 'tabular-nums',
            suffix && 'pr-8',
            className
          )}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[10px] font-medium text-[var(--text-muted)]">
            {suffix}
          </span>
        )}
      </div>
    </label>
  )
}

/* ------------------------------------------------------------------ Select */

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
}

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  className
}: SelectProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{
    left: number
    top: number
    width: number
    drop: 'down' | 'up'
  }>({
    left: 0,
    top: 0,
    width: 0,
    drop: 'down'
  })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const selectedIndex = options.findIndex((o) => o.value === value)
  const [activeIndex, setActiveIndex] = useState(selectedIndex < 0 ? 0 : selectedIndex)
  const selected = options[selectedIndex]

  const place = useCallback((): void => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const estimated = Math.min(options.length * 30 + 8, 280)
    const spaceBelow = window.innerHeight - r.bottom
    const drop = spaceBelow < estimated + 12 && r.top > spaceBelow ? 'up' : 'down'
    setCoords({
      left: r.left,
      top: drop === 'down' ? r.bottom + 4 : r.top - 4,
      width: r.width,
      drop
    })
  }, [options.length])

  useLayoutEffect(() => {
    if (!open) return
    place()
  }, [open, place])

  const toggleOpen = (next: boolean): void => {
    if (next) setActiveIndex(selectedIndex < 0 ? 0 : selectedIndex)
    setOpen(next)
  }

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent): void => {
      if (
        !listRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    const onScroll = (e: Event): void => {
      if (listRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onResize = (): void => setOpen(false)
    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  const commit = (i: number): void => {
    const opt = options[i]
    if (opt) onChange(opt.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        toggleOpen(true)
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(options.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      commit(activeIndex)
    }
  }

  return (
    <label className="flex min-w-0 flex-col gap-[var(--space-label)]">
      {label && <FieldLabel>{label}</FieldLabel>}
      <button
        type="button"
        ref={triggerRef}
        onClick={() => toggleOpen(!open)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'focus-ring flex h-[var(--h-control)] items-center justify-between gap-2 rounded-[var(--radius-sm)] border bg-[var(--bg-input)] px-2.5 text-xs transition-colors',
          open
            ? 'border-[var(--accent)] shadow-[0_0_0_2px_var(--accent-ring)]'
            : 'border-[var(--border)] hover:border-[var(--border-strong)]',
          className
        )}
      >
        <span
          className={cn(
            'truncate',
            selected ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
          )}
        >
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={13}
          className={cn(
            'shrink-0 text-[var(--text-muted)] transition-transform duration-150',
            open && 'rotate-180'
          )}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={listRef}
            role="listbox"
            className="pop-surface pop-animate fixed z-[60] max-h-[280px] overflow-y-auto p-1"
            style={{
              left: coords.left,
              width: coords.width,
              ...(coords.drop === 'down'
                ? { top: coords.top }
                : { top: coords.top, transform: 'translateY(-100%)' })
            }}
          >
            {options.map((opt, i) => {
              const isSelected = opt.value === value
              const isActive = i === activeIndex
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => commit(i)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-[var(--radius-xs)] px-2 py-1.5 text-left text-xs transition-colors',
                    isActive ? 'bg-[var(--bg-hover)]' : 'bg-transparent',
                    isSelected
                      ? 'font-medium text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)]'
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={13} className="shrink-0 text-[var(--accent)]" />}
                </button>
              )
            })}
          </div>,
          document.body
        )}
    </label>
  )
}

/* ------------------------------------------------------------------ Section */

interface SectionProps {
  title: string
  children: ReactNode
  actions?: ReactNode
}

export function Section({ title, children, actions }: SectionProps): React.JSX.Element {
  return (
    <section className="flex flex-col gap-[var(--space-stack)]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="section-title">{title}</h3>
        {actions}
      </div>
      <div className="ui-stack">{children}</div>
    </section>
  )
}

interface SectionDividerProps {
  children: ReactNode
}

export function SectionDivider({ children }: SectionDividerProps): React.JSX.Element {
  return <div className="section-divider ui-stack">{children}</div>
}

interface FieldGridProps {
  children: ReactNode
}

export function FieldGrid({ children }: FieldGridProps): React.JSX.Element {
  return <div className="field-grid">{children}</div>
}

interface ToggleGroupProps {
  children: ReactNode
}

export function ToggleGroup({ children }: ToggleGroupProps): React.JSX.Element {
  return (
    <div className="flex flex-col divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)]/40 px-3">
      {children}
    </div>
  )
}

interface EmptyStateProps {
  children: ReactNode
  icon?: ReactNode
  className?: string
}

export function EmptyState({ children, icon, className }: EmptyStateProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 py-10 text-center text-xs leading-relaxed text-[var(--text-muted)]',
        className
      )}
    >
      {icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)]">
          {icon}
        </div>
      )}
      <p className="max-w-[220px]">{children}</p>
    </div>
  )
}

/* ------------------------------------------------------------------- Toggle */

interface ToggleProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}

export function Toggle({ label, checked, onChange }: ToggleProps): React.JSX.Element {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-0.5">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'focus-ring relative h-[18px] w-[32px] shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-[var(--accent)]' : 'bg-[var(--bg-active)]'
        )}
      >
        <span
          className={cn(
            'absolute left-[2px] top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 [transition-timing-function:var(--ease-spring)]',
            checked && 'translate-x-[14px]'
          )}
        />
      </button>
    </label>
  )
}

/* ------------------------------------------------------------------- Slider */

interface SliderProps {
  label: string
  value: number
  min?: number
  max?: number
  defaultValue?: number
  onChange: (v: number) => void
}

export function Slider({
  label,
  value,
  min = -100,
  max = 100,
  defaultValue = 0,
  onChange
}: SliderProps): React.JSX.Element {
  const fill = ((value - min) / (max - min)) * 100
  const isDefault = value === defaultValue

  return (
    <div className="group flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <span
          className="cursor-default text-xs text-[var(--text-secondary)]"
          title="Double-click to reset"
          onDoubleClick={() => onChange(defaultValue)}
        >
          {label}
        </span>
        <span
          className={cn(
            'min-w-[34px] rounded-[var(--radius-xs)] px-1 py-px text-right text-[11px] tabular-nums transition-colors',
            isDefault ? 'text-[var(--text-muted)]' : 'font-medium text-[var(--text-primary)]'
          )}
        >
          {value > 0 && min < 0 ? `+${value}` : value}
        </span>
      </div>
      <input
        type="range"
        className="ui-range"
        style={{ '--fill': `${fill}%` } as React.CSSProperties}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onDoubleClick={() => onChange(defaultValue)}
      />
    </div>
  )
}

/* ----------------------------------------------------------------- ChipGroup */

interface ChipGroupProps {
  options: Array<{ label: string; value: string }>
  value: string
  onChange: (v: string) => void
}

export function ChipGroup({ options, value, onChange }: ChipGroupProps): React.JSX.Element {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] p-0.5 shadow-[inset_0_0_0_1px_var(--border)]">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'focus-ring truncate rounded-[5px] px-2 py-[5px] text-[11px] font-medium transition-all duration-150',
            value === opt.value
              ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-sm),inset_0_0_0_1px_var(--border-strong)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------- TabBar */

interface TabBarProps {
  tabs: Array<{ id: string; label: string; icon?: ReactNode }>
  active: string
  onChange: (id: string) => void
}

export function TabBar({ tabs, active, onChange }: TabBarProps): React.JSX.Element {
  return (
    <div className="no-scrollbar flex shrink-0 gap-0.5 overflow-x-auto border-b border-[var(--border)] bg-[var(--bg-sidebar)] px-1.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'focus-ring relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-2 text-[11px] font-medium transition-colors',
            active === tab.id
              ? 'text-[var(--text-primary)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          )}
        >
          {tab.icon}
          {tab.label}
          {active === tab.id && (
            <span className="absolute inset-x-1.5 -bottom-px h-[2px] rounded-full bg-[var(--accent)]" />
          )}
        </button>
      ))}
    </div>
  )
}

/* ----------------------------------------------------------------- PageHeader */

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps): React.JSX.Element {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-5 px-[var(--space-page-x)] pb-2 pt-8">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/* --------------------------------------------------------------------- Card */

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className, onClick }: CardProps): React.JSX.Element {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-panel)] p-5 shadow-[var(--edge-highlight)] transition-all duration-150',
        onClick &&
          'focus-ring cursor-pointer text-left hover:-translate-y-px hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] hover:shadow-[var(--shadow-md)]',
        className
      )}
    >
      {children}
    </Tag>
  )
}

/* ------------------------------------------------------------------ ListRow */

interface ListRowProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function ListRow({ children, className, onClick }: ListRowProps): React.JSX.Element {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 shadow-[var(--edge-highlight)] transition-all duration-150',
        onClick &&
          'cursor-pointer hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)]',
        className
      )}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------- ToolbarButton */

interface ToolbarButtonProps {
  active?: boolean
  disabled?: boolean
  title: string
  onClick: () => void
  children: ReactNode
  className?: string
}

export function ToolbarButton({
  active,
  disabled,
  title,
  onClick,
  children,
  className
}: ToolbarButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] transition-all duration-150',
        disabled && 'cursor-not-allowed opacity-35',
        active
          ? 'bg-[var(--accent-muted)] text-[var(--accent-hover)] shadow-[inset_0_0_0_1px_var(--accent-ring)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] active:scale-95',
        className
      )}
    >
      {children}
    </button>
  )
}

export function ToolbarDivider(): React.JSX.Element {
  return <div className="my-1 h-px w-5 bg-[var(--border)]" />
}

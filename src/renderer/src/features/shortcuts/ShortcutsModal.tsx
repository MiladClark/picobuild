import type { ReactNode } from 'react'
import { Modal, Button } from '@renderer/components/ui'

function Key({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <kbd className="flex h-6 min-w-[24px] items-center justify-center rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-1.5 font-mono text-[11px] font-medium text-[var(--text-primary)] shadow-[var(--shadow-sm)]">
      {children}
    </kbd>
  )
}

interface ShortcutRowProps {
  label: string
  keys: string[]
}

function ShortcutRow({ label, keys }: ShortcutRowProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <div className="flex shrink-0 items-center gap-1">
        {keys.map((k, i) => (
          <span key={i} className="flex items-center gap-1">
            <Key>{k}</Key>
            {i < keys.length - 1 && <span className="text-[10px] text-[var(--text-muted)]">+</span>}
          </span>
        ))}
      </div>
    </div>
  )
}

interface ShortcutGroup {
  title: string
  items: Array<{ label: string; keys: string[] }>
}

const GROUPS: ShortcutGroup[] = [
  {
    title: 'Tools',
    items: [
      { label: 'Select tool', keys: ['V'] },
      { label: 'Move tool', keys: ['M'] },
      { label: 'Crop tool', keys: ['C'] }
    ]
  },
  {
    title: 'Zoom & Pan',
    items: [
      { label: 'Zoom in / out (scroll)', keys: ['Ctrl', 'Scroll'] },
      { label: 'Pan around', keys: ['Scroll'] },
      { label: 'Pan horizontally', keys: ['Shift', 'Scroll'] },
      { label: 'Pan (drag)', keys: ['Space', 'Drag'] },
      { label: 'Zoom in / out (keys)', keys: ['+', '/', '-'] },
      { label: 'Zoom to 100%', keys: ['Shift', '1'] },
      { label: 'Zoom to fit', keys: ['Shift', '0'] }
    ]
  },
  {
    title: 'Editing',
    items: [
      { label: 'Undo', keys: ['Ctrl', 'Z'] },
      { label: 'Redo', keys: ['Ctrl', 'Y'] },
      { label: 'Nudge image', keys: ['↑', '↓', '←', '→'] },
      { label: 'Nudge image (10px)', keys: ['Shift', '↑↓←→'] },
      { label: 'Remove selected image', keys: ['Delete'] },
      { label: 'Apply crop', keys: ['Enter'] },
      { label: 'Cancel crop', keys: ['Esc'] }
    ]
  },
  {
    title: 'View & File',
    items: [
      { label: 'Save project', keys: ['Ctrl', 'S'] },
      { label: 'Focus mode', keys: ['F'] },
      { label: 'Exit focus mode', keys: ['Esc'] },
      { label: 'Jump to export', keys: ['E'] },
      { label: 'Show this cheat sheet', keys: ['Shift', '?'] }
    ]
  }
]

export function ShortcutsModal({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}): React.JSX.Element {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Keyboard Shortcuts"
      size="lg"
      footer={
        <Button variant="primary" onClick={onClose}>
          Got it
        </Button>
      }
    >
      <div className="grid max-h-[60vh] gap-5 overflow-y-auto sm:grid-cols-2">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="section-title mb-1">{group.title}</h3>
            <div className="divide-y divide-[var(--border-subtle)]">
              {group.items.map((item) => (
                <ShortcutRow key={item.label} label={item.label} keys={item.keys} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}

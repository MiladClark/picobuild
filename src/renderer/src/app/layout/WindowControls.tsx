import { useEffect, useState } from 'react'
import { Minus, Square, X, Copy } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

export function WindowControls(): React.JSX.Element | null {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    window.api.window
      .isMaximized()
      .then(setMaximized)
      .catch(() => {})
    return window.api.window.onMaximizedChange(setMaximized)
  }, [])

  const isMac = window.electron.process.platform === 'darwin'
  if (isMac) return null

  const btnClass =
    'flex h-7 w-10 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors'

  return (
    <div className="titlebar-no-drag flex shrink-0 items-center gap-0.5 px-1 py-1.5">
      <button
        type="button"
        title="Minimize"
        onClick={() => window.api.window.minimize()}
        className={cn(btnClass, 'hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]')}
      >
        <Minus size={14} />
      </button>
      <button
        type="button"
        title={maximized ? 'Restore' : 'Maximize'}
        onClick={() => window.api.window.toggleMaximize()}
        className={cn(btnClass, 'hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]')}
      >
        {maximized ? <Copy size={12} /> : <Square size={12} />}
      </button>
      <button
        type="button"
        title="Close"
        onClick={() => window.api.window.close()}
        className={cn(btnClass, 'hover:bg-red-600 hover:text-white')}
      >
        <X size={14} />
      </button>
    </div>
  )
}

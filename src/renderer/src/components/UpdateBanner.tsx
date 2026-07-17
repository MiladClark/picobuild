import { Download, X } from 'lucide-react'
import { Button } from '@renderer/components/ui'

export function UpdateBanner({
  version,
  required,
  onUpdate,
  onDismiss
}: {
  version: string
  required?: boolean
  onUpdate: () => void
  onDismiss?: () => void
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--accent)]/25 bg-[var(--accent-muted)] px-4 py-2.5">
      <p className="text-sm text-[var(--text-secondary)]">
        <span className="font-semibold text-[var(--accent)]">Update available</span>
        {' — '}
        Version {version} is ready{required ? ' (required)' : ''}.
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="primary" size="sm" onClick={onUpdate}>
          <Download size={13} />
          Download
        </Button>
        {!required && onDismiss && (
          <Button variant="ghost" size="icon" onClick={onDismiss} aria-label="Dismiss">
            <X size={14} />
          </Button>
        )}
      </div>
    </div>
  )
}

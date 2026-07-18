import { Loader2 } from 'lucide-react'
import { createPortal } from 'react-dom'
import type { UpdateProgress } from '@shared/types/update'
import { Button } from '@renderer/components/ui'
import logoUrl from '@renderer/assets/logo.svg'

const PHASE_LABEL: Record<UpdateProgress['phase'], string> = {
  idle: 'Preparing…',
  downloading: 'Downloading update…',
  verifying: 'Verifying update…',
  applying: 'Applying update…',
  restarting: 'Restarting PicoBuild…',
  error: 'Update failed',
  cancelled: 'Update cancelled'
}

export function UpdateModal({
  progress,
  required,
  canCancel,
  onCancel,
  onRetry,
  onDismiss
}: {
  progress: UpdateProgress
  required?: boolean
  canCancel?: boolean
  onCancel?: () => void
  onRetry?: () => void
  onDismiss?: () => void
}): React.JSX.Element {
  const busy =
    progress.phase !== 'idle' && progress.phase !== 'error' && progress.phase !== 'cancelled'
  const indeterminate =
    progress.phase === 'applying' ||
    progress.phase === 'restarting' ||
    progress.phase === 'verifying' ||
    (progress.phase === 'downloading' && progress.percent === 0 && busy)

  const content = (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-6 bg-[var(--bg-app)] px-6 text-center">
      <img src={logoUrl} alt="" className="h-14 w-14" draggable={false} />

      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          {progress.phase === 'error'
            ? 'Update failed'
            : progress.phase === 'cancelled'
              ? 'Update cancelled'
              : 'Updating PicoBuild'}
        </h2>
        {progress.version && (
          <p className="mt-2 text-sm text-[var(--text-muted)]">Version {progress.version}</p>
        )}
        {required && progress.phase !== 'error' && progress.phase !== 'cancelled' && (
          <p className="mt-2 text-xs text-[var(--danger)]">This update is required to continue.</p>
        )}
      </div>

      <div className="w-full max-w-sm">
        <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-active)]">
          {indeterminate ? (
            <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--accent)]" />
          ) : (
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-150"
              style={{ width: `${Math.max(2, progress.percent)}%` }}
            />
          )}
        </div>
        <p className="mt-3 flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
          {busy && <Loader2 size={14} className="animate-spin text-[var(--accent)]" />}
          {progress.message || PHASE_LABEL[progress.phase]}
        </p>
        {progress.error && (
          <p className="mt-2 text-center text-sm text-[var(--danger)]">{progress.error}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {canCancel && onCancel && (
          <Button variant="secondary" size="md" onClick={onCancel}>
            Cancel download
          </Button>
        )}
        {progress.phase === 'error' && onRetry && (
          <Button variant="secondary" size="md" onClick={onRetry}>
            Retry
          </Button>
        )}
        {(progress.phase === 'error' || progress.phase === 'cancelled') &&
          onDismiss &&
          !required && (
            <Button variant="ghost" size="md" onClick={onDismiss}>
              Continue
            </Button>
          )}
      </div>

      {busy && (
        <p className="max-w-md text-xs text-[var(--text-muted)]">
          Do not close PicoBuild while the update is in progress.
        </p>
      )}
    </div>
  )

  return createPortal(content, document.body)
}

import { useCallback, useEffect, useRef, useState } from 'react'
import type { UpdateAvailablePayload, UpdateProgress } from '@shared/types/update'
import { UpdateBanner } from './UpdateBanner'
import { UpdateModal } from './UpdateModal'

const IDLE: UpdateProgress = { phase: 'idle', percent: 0, message: '' }

export function UpdateRoot(): React.JSX.Element {
  const [available, setAvailable] = useState<UpdateAvailablePayload | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [progress, setProgress] = useState<UpdateProgress>(IDLE)
  const [updating, setUpdating] = useState(false)
  // Ref, not state: the main process can broadcast `updates:available` more than
  // once for the same update (startup timer + a manual "Check for updates"
  // click racing each other) — state updates from the first call haven't
  // committed yet when the second event arrives, so a state-only guard misses
  // the race. Without this, a required update's second start() call hits
  // updater.ts's "already in progress" guard, which used to surface as a false
  // failure with no way to dismiss it (required updates hide Continue).
  const updatingRef = useRef(false)

  const beginUpdate = useCallback(async (version?: string) => {
    if (updatingRef.current) return
    updatingRef.current = true
    setUpdating(true)
    setProgress({ phase: 'downloading', percent: 0, message: 'Starting download…', version })
    const res = await window.api.updates.start(version)
    if (!res.ok) {
      setProgress((p) => ({
        phase: 'error',
        percent: 0,
        message: 'Update failed',
        error: res.error ?? 'Update failed',
        version: p.version ?? version
      }))
      setUpdating(true)
    }
  }, [])

  const cancelDownload = useCallback(async () => {
    await window.api.updates.cancel()
    updatingRef.current = false
    setUpdating(false)
    setProgress(IDLE)
  }, [])

  useEffect(() => {
    const offAvailable = window.api.updates.onAvailable((payload) => {
      setAvailable(payload)
      setBannerDismissed(false)
      if (payload.required) void beginUpdate(payload.version)
    })
    const offProgress = window.api.updates.onProgress((p) => {
      setProgress(p)
      if (p.phase === 'downloading' || p.phase === 'verifying' || p.phase === 'applying' || p.phase === 'restarting') {
        setUpdating(true)
      }
      if (p.phase === 'error' || p.phase === 'cancelled') {
        setUpdating(p.phase === 'error')
        updatingRef.current = p.phase === 'error'
      }
    })
    void window.api.updates.fetchPending()
    return () => {
      offAvailable()
      offProgress()
    }
  }, [beginUpdate])

  const showBanner = available && !bannerDismissed && !updating && !available.required
  // Cancel only while the download itself is in flight and abortable — once
  // verify/apply starts the file is already on disk, so "cancelling" there
  // used to just fake a "cancelled" UI state while the update proceeded (and
  // restarted the app) anyway. Required updates can't be cancelled at all.
  const canCancel = !available?.required && progress.phase === 'downloading'

  return (
    <>
      {showBanner && (
        <UpdateBanner
          version={available.version}
          required={available.required}
          onUpdate={() => void beginUpdate(available.version)}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}
      {updating && (
        <UpdateModal
          progress={progress}
          required={available?.required}
          canCancel={canCancel}
          onCancel={() => void cancelDownload()}
          onRetry={progress.phase === 'error' ? () => void beginUpdate(progress.version) : undefined}
          onDismiss={() => {
            updatingRef.current = false
            setUpdating(false)
            setProgress(IDLE)
          }}
        />
      )}
    </>
  )
}

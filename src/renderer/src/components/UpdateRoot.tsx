import { useCallback, useEffect, useState } from 'react'
import type { UpdateAvailablePayload, UpdateProgress } from '@shared/types/update'
import { UpdateBanner } from './UpdateBanner'
import { UpdateModal } from './UpdateModal'

const IDLE: UpdateProgress = { phase: 'idle', percent: 0, message: '' }

export function UpdateRoot(): React.JSX.Element {
  const [available, setAvailable] = useState<UpdateAvailablePayload | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [progress, setProgress] = useState<UpdateProgress>(IDLE)
  const [updating, setUpdating] = useState(false)

  const beginUpdate = useCallback(async (version?: string) => {
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
      if (
        p.phase === 'downloading' ||
        p.phase === 'verifying' ||
        p.phase === 'applying' ||
        p.phase === 'restarting'
      ) {
        setUpdating(true)
      }
      if (p.phase === 'error' || p.phase === 'cancelled') {
        setUpdating(p.phase === 'error')
      }
    })
    void window.api.updates.fetchPending()
    return () => {
      offAvailable()
      offProgress()
    }
  }, [beginUpdate])

  const showBanner = available && !bannerDismissed && !updating && !available.required
  const canCancel = progress.phase === 'downloading' || progress.phase === 'verifying'

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
          onDismiss={() => {
            setUpdating(false)
            setProgress(IDLE)
          }}
        />
      )}
    </>
  )
}

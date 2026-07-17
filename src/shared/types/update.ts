export type UpdatePhase =
  'idle' | 'downloading' | 'verifying' | 'applying' | 'restarting' | 'error' | 'cancelled'

export interface UpdateProgress {
  phase: UpdatePhase
  percent: number
  message: string
  version?: string
  error?: string
}

export interface PendingUpdateInfo {
  version: string
  downloadUrl: string
  checksum: string | null
}

export interface UpdateAvailablePayload {
  version: string
  required: boolean
  releaseNotes?: string | null
}

export interface UpdateCheckResult {
  ok: boolean
  error?: string
  currentVersion: string
  updateAvailable?: boolean
  required?: boolean
  severity?: string
  latest?: {
    version: string
    downloadUrl?: string | null
    checksum?: string | null
    sizeBytes?: number | null
    releaseNotes?: string | null
    releasedAt?: string
  }
}

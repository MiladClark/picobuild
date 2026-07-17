// DevTune website account/licensing integration — mirrors devflow-app's
// src/shared/types.ts LicenseState/ActivateOptions/LicenseActionResult.

export interface LicenseState {
  activated: boolean
  /** signature + expiry/grace verified */
  valid: boolean
  /** token expired but inside offline grace window */
  inGrace: boolean
  plan?: string
  tier?: string
  email?: string
  userName?: string
  avatarUrl?: string
  signedIn?: boolean
  /** Browse app UI without DevTune sign-in; all features locked until OAuth. */
  guestMode?: boolean
  seatsUsed?: number
  /** masked, e.g. PBD-****-****-****-A1B2 */
  licenseKey?: string
  /** marketing/display key e.g. freeapp2026 */
  displayKey?: string
  expiresAt?: string | null
  tokenExpiresAt?: number
  graceUntil?: number
  lastValidatedAt?: number
  entitlements?: Record<string, string>
  seatLimit?: number
  serverUrl: string
  appVersion: string
  deviceLabel?: string
  /** days remaining for the free-app tier */
  daysRemaining?: number
}

export interface ActivateOptions {
  email?: string
  password?: string
  licenseKey?: string
}

export interface LicenseActionResult {
  ok: boolean
  error?: string
  state?: LicenseState
}

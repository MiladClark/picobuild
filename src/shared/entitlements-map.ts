/** Maps server entitlement keys to enforced client limits. Keep in sync with
 * devtune-website/lib/plan-limits.ts's picobuild_* keys and
 * db/migrations/011_picobuild_product.sql. */

export interface EnforcedEntitlements {
  plan: string
  maxProjects: number
  maxDevices: number
  unlimitedDevices: boolean
  batchExport: boolean
  maxExportBatch: number
  unlimitedExportBatch: boolean
  bgRemovalHQ: boolean
  noWatermark: boolean
  premiumBackgrounds: boolean
  cloudBackup: boolean
  betaChannel: boolean
}

export const FREE_LIMITS: EnforcedEntitlements = {
  plan: 'free',
  maxProjects: 3,
  maxDevices: 1,
  unlimitedDevices: false,
  batchExport: false,
  maxExportBatch: 1,
  unlimitedExportBatch: false,
  bgRemovalHQ: false,
  noWatermark: false,
  premiumBackgrounds: false,
  cloudBackup: false,
  betaChannel: false
}

/** Signed-out browse mode — UI visible, all actions blocked until sign-in. */
export const GUEST_LIMITS: EnforcedEntitlements = {
  plan: 'guest',
  maxProjects: 0,
  maxDevices: 0,
  unlimitedDevices: false,
  batchExport: false,
  maxExportBatch: 0,
  unlimitedExportBatch: false,
  bgRemovalHQ: false,
  noWatermark: false,
  premiumBackgrounds: false,
  cloudBackup: false,
  betaChannel: false
}

function parseCount(raw: string | undefined, fallback: number): { max: number; unlimited: boolean } {
  if (!raw || raw === 'false' || raw === '0') return { max: fallback, unlimited: false }
  if (raw === 'unlimited') return { max: Number.POSITIVE_INFINITY, unlimited: true }
  const n = Number(raw)
  if (Number.isFinite(n) && n > 0) return { max: n, unlimited: false }
  return { max: fallback, unlimited: false }
}

/** All bool entitlements use opt-in semantics (must be exactly 'true'). */
export function mapEntitlements(
  entitlements: Record<string, string> | undefined,
  plan = 'pro'
): EnforcedEntitlements {
  const e = entitlements ?? {}
  const rawProjects = e.max_projects ?? '3'
  const devices = parseCount(e.max_devices, 1)
  const exportBatch = parseCount(e.picobuild_max_export_batch, 1)
  return {
    plan,
    maxProjects:
      rawProjects === 'unlimited' ? Number.POSITIVE_INFINITY : Number(rawProjects) || FREE_LIMITS.maxProjects,
    maxDevices: devices.max,
    unlimitedDevices: devices.unlimited,
    batchExport: e.picobuild_batch_export === 'true',
    maxExportBatch: exportBatch.max,
    unlimitedExportBatch: exportBatch.unlimited,
    bgRemovalHQ: e.picobuild_bg_removal_hq === 'true',
    noWatermark: e.picobuild_no_watermark === 'true',
    premiumBackgrounds: e.picobuild_premium_backgrounds === 'true',
    cloudBackup: e.cloud_backup === 'true',
    betaChannel: e.beta_channel === 'true'
  }
}

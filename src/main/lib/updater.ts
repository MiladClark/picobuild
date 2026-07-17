import { app } from 'electron'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { checkForUpdates } from './updates'
import { getLicenseState } from './licensing'
import { hasActiveExportJobs } from '../services/export.service'
import type { UpdateProgress, PendingUpdateInfo } from '../../shared/types/update'

let pendingUpdate: PendingUpdateInfo | null = null
let onProgress: ((p: UpdateProgress) => void) | null = null
let downloadAbort: AbortController | null = null
let updateActive = false

export function setUpdateProgressHandler(fn: ((p: UpdateProgress) => void) | null): void {
  onProgress = fn
}

function emit(p: UpdateProgress): void {
  onProgress?.(p)
}

/**
 * Where to write the updated build. electron-builder's Windows `portable`
 * target self-extracts to a temp dir at runtime, so `process.execPath` is
 * NOT a stable install location there — it points into the temp extraction.
 * Portable builds instead set PORTABLE_EXECUTABLE_FILE/_DIR to the real,
 * stable location of the launched .exe; fall back to process.execPath only
 * when unset (dev/unpackaged runs).
 */
function getWindowsTarget(): { exePath: string; installDir: string; exeName: string } {
  const exePath = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath
  const installDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(exePath)
  return { exePath, installDir, exeName: path.basename(exePath) }
}

/** macOS has no portable-exe equivalent — derive the .app bundle root by
 * walking up from the executable inside it (Contents/MacOS/<exe>). */
function getMacTarget(): { bundlePath: string; installDir: string; bundleName: string } {
  const bundlePath = path.resolve(path.dirname(process.execPath), '..', '..')
  return { bundlePath, installDir: path.dirname(bundlePath), bundleName: path.basename(bundlePath) }
}

export function getPendingUpdate(): typeof pendingUpdate {
  return pendingUpdate
}

export function isUpdateActive(): boolean {
  return updateActive
}

export async function fetchLatestUpdate(): Promise<
  | {
      ok: true
      result: Awaited<ReturnType<typeof checkForUpdates>>
      pending: NonNullable<typeof pendingUpdate>
    }
  | { ok: false; error: string; result: Awaited<ReturnType<typeof checkForUpdates>> | null }
> {
  if (!app.isPackaged) {
    return { ok: false, error: 'Updates are only available in the packaged app.', result: null }
  }
  const res = await checkForUpdates(getLicenseState().serverUrl)
  if (!res.ok || !res.updateAvailable || !res.latest?.downloadUrl) {
    return { ok: false, error: res.error ?? 'No update available', result: res }
  }
  const downloadUrl = res.latest.downloadUrl
  const expectedExt = process.platform === 'darwin' ? '.zip' : '.exe'
  if (!/^https?:\/\//i.test(downloadUrl) || !downloadUrl.toLowerCase().includes(expectedExt)) {
    return {
      ok: false,
      error: `Invalid update URL from server — expected a ${expectedExt} release for this platform.`,
      result: res
    }
  }
  pendingUpdate = {
    version: res.latest.version,
    downloadUrl,
    checksum: res.latest.checksum ?? null
  }
  return { ok: true, result: res, pending: pendingUpdate }
}

async function downloadUpdate(
  url: string,
  dest: string,
  signal: AbortSignal,
  onPct: (n: number, indeterminate: boolean) => void
): Promise<void> {
  const res = await fetch(url, { signal })
  if (!res.ok || !res.body) throw new Error(`Download failed (HTTP ${res.status})`)

  const total = Number(res.headers.get('content-length') ?? 0)
  let received = 0
  const nodeStream = Readable.fromWeb(res.body as import('stream/web').ReadableStream)

  await pipeline(
    nodeStream,
    async function* (source) {
      for await (const chunk of source) {
        if (signal.aborted) throw new Error('Download cancelled')
        received += chunk.length
        if (total > 0) onPct(Math.min(99, Math.round((received / total) * 100)), false)
        else onPct(0, true)
        yield chunk
      }
    },
    fs.createWriteStream(dest)
  )
  onPct(100, false)
}

async function verifyChecksum(file: string, expected: string): Promise<void> {
  const hash = crypto.createHash('sha256')
  const data = fs.readFileSync(file)
  hash.update(data)
  const got = hash.digest('hex').toLowerCase()
  if (got !== expected.toLowerCase().replace(/^sha256:/i, '')) {
    throw new Error('Checksum mismatch — update file may be corrupted.')
  }
}

/** Windows: the artifact IS the final exe (portable target) — just swap one file, no archive to extract. */
function spawnWindowsApplyScript(
  downloadedExePath: string,
  exePath: string,
  exeName: string
): void {
  const logPath = path.join(os.tmpdir(), 'picobuild-update.log')
  const scriptPath = path.join(os.tmpdir(), `picobuild-apply-${Date.now()}.ps1`)
  const pid = process.pid
  const processBaseName = exeName.replace(/\.exe$/i, '')

  const script = `# PicoBuild auto-update apply script
$ErrorActionPreference = 'Stop'
$log = '${logPath.replace(/'/g, "''")}'
function Log([string]$msg) { Add-Content -Path $log -Value ("$(Get-Date -Format o) " + $msg) }

Log "=== PicoBuild update apply started ==="
$downloaded = '${downloadedExePath.replace(/'/g, "''")}'
$dest = '${exePath.replace(/'/g, "''")}'
$parentPid = ${pid}

Log "downloaded=$downloaded dest=$dest parentPid=$parentPid"

for ($i = 0; $i -lt 120; $i++) {
  if (-not (Get-Process -Id $parentPid -ErrorAction SilentlyContinue)) { break }
  Start-Sleep -Milliseconds 500
}
if (Get-Process -Id $parentPid -ErrorAction SilentlyContinue) {
  Log "WARN parent process $parentPid still running after wait"
}

Get-Process -Name '${processBaseName.replace(/'/g, "''")}' -ErrorAction SilentlyContinue |
  Where-Object { $_.Id -ne $PID } |
  ForEach-Object { Log "Stopping other instance PID $($_.Id)"; Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }

Copy-Item -Path $downloaded -Destination $dest -Force
Log "Copied new build over $dest"

Start-Process -FilePath $dest
Remove-Item $downloaded -Force -ErrorAction SilentlyContinue
Remove-Item $PSCommandPath -Force -ErrorAction SilentlyContinue
Log "=== PicoBuild update apply finished ==="
`
  fs.writeFileSync(scriptPath, script, 'utf-8')
  fs.appendFileSync(logPath, `\n--- apply script ${new Date().toISOString()} ---\n`, 'utf-8')

  const child = spawn(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', scriptPath],
    { detached: true, stdio: 'ignore', windowsHide: true }
  )
  child.unref()
}

/** macOS: download is a .zip of the .app bundle — expand, strip quarantine, swap the bundle. */
function spawnMacApplyScript(zipPath: string, installDir: string, bundleName: string): void {
  const logPath = path.join(os.tmpdir(), 'picobuild-update.log')
  const scriptPath = path.join(os.tmpdir(), `picobuild-apply-${Date.now()}.sh`)
  const pid = process.pid
  const staging = path.join(os.tmpdir(), `picobuild-update-staging-${Date.now()}`)

  const script = `#!/bin/sh
LOG="${logPath}"
log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $1" >> "$LOG"; }

log "=== PicoBuild update apply started ==="
ZIP="${zipPath}"
DEST="${path.join(installDir, bundleName)}"
STAGING="${staging}"
PARENT_PID=${pid}

log "zip=$ZIP dest=$DEST parentPid=$PARENT_PID"

for i in $(seq 1 120); do
  if ! kill -0 "$PARENT_PID" 2>/dev/null; then break; fi
  sleep 0.5
done

rm -rf "$STAGING"
mkdir -p "$STAGING"
ditto -x -k "$ZIP" "$STAGING"
log "Expanded archive to staging"

APP_PATH=$(find "$STAGING" -maxdepth 1 -name "*.app" | head -n 1)
if [ -z "$APP_PATH" ]; then
  log "ERROR no .app bundle found in staging"
  exit 1
fi

xattr -cr "$APP_PATH" 2>/dev/null || true

rm -rf "$DEST"
mv "$APP_PATH" "$DEST"
log "Moved new bundle into place at $DEST"

open "$DEST"
rm -rf "$ZIP" "$STAGING" "$0"
log "=== PicoBuild update apply finished ==="
`
  fs.writeFileSync(scriptPath, script, { mode: 0o755 })
  fs.appendFileSync(logPath, `\n--- apply script ${new Date().toISOString()} ---\n`, 'utf-8')

  const child = spawn('/bin/sh', [scriptPath], { detached: true, stdio: 'ignore' })
  child.unref()
}

export function cancelUpdate(): { ok: boolean; error?: string } {
  if (!updateActive) return { ok: false, error: 'No update in progress' }
  if (downloadAbort) {
    downloadAbort.abort()
    downloadAbort = null
  }
  updateActive = false
  emit({ phase: 'cancelled', percent: 0, message: 'Update cancelled' })
  return { ok: true }
}

export async function startUpdate(version?: string): Promise<{ ok: boolean; error?: string }> {
  if (!app.isPackaged) {
    const err = 'Updates are only available in the packaged app.'
    emit({ phase: 'error', percent: 0, message: 'Update failed', error: err })
    return { ok: false, error: err }
  }

  if (updateActive) {
    return { ok: false, error: 'Update already in progress' }
  }

  if (hasActiveExportJobs()) {
    const err = 'Finish or cancel the current export before updating.'
    emit({ phase: 'error', percent: 0, message: 'Update failed', error: err })
    return { ok: false, error: err }
  }

  if (!pendingUpdate) {
    const fetched = await fetchLatestUpdate()
    if (!fetched.ok) {
      emit({ phase: 'error', percent: 0, message: 'No update', error: fetched.error })
      return { ok: false, error: fetched.error ?? 'No update available' }
    }
  }

  const info = pendingUpdate!
  if (version && info.version !== version) {
    const err = 'Update version mismatch'
    emit({
      phase: 'error',
      percent: 0,
      message: 'Update failed',
      error: err,
      version: info.version
    })
    return { ok: false, error: err }
  }

  const isMac = process.platform === 'darwin'
  const downloadPath = path.join(
    os.tmpdir(),
    `picobuild-update-${info.version}${isMac ? '.zip' : '.exe'}`
  )

  updateActive = true
  downloadAbort = new AbortController()

  try {
    emit({
      phase: 'downloading',
      percent: 0,
      message: 'Downloading update…',
      version: info.version
    })
    await downloadUpdate(
      info.downloadUrl,
      downloadPath,
      downloadAbort.signal,
      (percent, indeterminate) => {
        emit({
          phase: 'downloading',
          percent: indeterminate ? 0 : percent,
          message: 'Downloading update…',
          version: info.version
        })
      }
    )
    downloadAbort = null

    if (!info.checksum) {
      throw new Error('Update rejected: server did not provide a SHA-256 checksum.')
    }
    emit({ phase: 'verifying', percent: 100, message: 'Verifying update…', version: info.version })
    await verifyChecksum(downloadPath, info.checksum)

    emit({ phase: 'applying', percent: 100, message: 'Applying update…', version: info.version })
    if (isMac) {
      const { installDir, bundleName } = getMacTarget()
      spawnMacApplyScript(downloadPath, installDir, bundleName)
    } else {
      const { exePath, exeName } = getWindowsTarget()
      spawnWindowsApplyScript(downloadPath, exePath, exeName)
    }

    emit({
      phase: 'restarting',
      percent: 100,
      message: 'Restarting PicoBuild…',
      version: info.version
    })
    pendingUpdate = null

    setTimeout(() => app.quit(), 400)
    return { ok: true }
  } catch (err) {
    downloadAbort = null
    updateActive = false
    if (
      err instanceof Error &&
      (err.name === 'AbortError' || err.message === 'Download cancelled')
    ) {
      emit({ phase: 'cancelled', percent: 0, message: 'Update cancelled', version: info.version })
      try {
        fs.unlinkSync(downloadPath)
      } catch {
        /* ignore */
      }
      return { ok: false, error: 'Update cancelled' }
    }
    const error = err instanceof Error ? err.message : String(err)
    emit({ phase: 'error', percent: 0, message: 'Update failed', error, version: info.version })
    try {
      fs.unlinkSync(downloadPath)
    } catch {
      /* ignore */
    }
    return { ok: false, error }
  }
}

export function resetUpdateState(): void {
  updateActive = false
  downloadAbort = null
}

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { LogOut, RefreshCw, ShieldCheck, ExternalLink, Download } from 'lucide-react'
import { PageHeader, Card, Section, Button, ListRow } from '@renderer/components/ui'
import type { LicenseState } from '@shared/types/license'
import type { UpdateProgress } from '@shared/types/update'

function UpdateSection(): React.JSX.Element {
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<{ version: string; required: boolean } | null>(null)
  const [progress, setProgress] = useState<UpdateProgress | null>(null)
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    window.api.auth.status().then((s) => setAppVersion(s.appVersion))
    const offAvail = window.api.updates.onAvailable((p) =>
      setAvailable({ version: p.version, required: p.required })
    )
    const offProg = window.api.updates.onProgress(setProgress)
    return () => {
      offAvail()
      offProg()
    }
  }, [])

  async function check(): Promise<void> {
    setChecking(true)
    const res = await window.api.updates.check()
    setChecking(false)
    if (!res.ok) {
      toast.error('Update check failed', { description: res.error })
      return
    }
    if (res.updateAvailable && res.latest) {
      setAvailable({ version: res.latest.version, required: !!res.required })
    } else {
      toast.success('You’re up to date', { description: `v${res.currentVersion}` })
    }
  }

  async function install(): Promise<void> {
    const res = await window.api.updates.start(available?.version)
    if (!res.ok) toast.error('Update failed', { description: res.error })
  }

  const busy = progress != null && !['idle', 'error', 'cancelled'].includes(progress.phase)

  return (
    <Card>
      <Section
        title="Updates"
        actions={
          !available && (
            <Button variant="ghost" size="sm" onClick={check} disabled={checking}>
              <RefreshCw size={13} />
              Check for updates
            </Button>
          )
        }
      >
        <ListRow>
          <span className="text-sm text-[var(--text-secondary)]">Current version</span>
          <span className="text-sm font-medium text-[var(--text-primary)]">{appVersion}</span>
        </ListRow>
        {available && !busy && (
          <ListRow>
            <span className="text-sm text-[var(--text-secondary)]">
              {available.required ? 'Required update' : 'Update available'}: v{available.version}
            </span>
            <Button variant="primary" size="sm" onClick={install}>
              <Download size={13} />
              Install &amp; restart
            </Button>
          </ListRow>
        )}
        {progress && busy && (
          <div className="px-2 py-1.5">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>{progress.message}</span>
              {progress.percent > 0 && <span>{progress.percent}%</span>}
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--bg-active)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-200"
                style={{ width: `${Math.max(4, progress.percent)}%` }}
              />
            </div>
          </div>
        )}
        {progress?.phase === 'error' && (
          <p className="text-sm text-[var(--danger)]">{progress.error}</p>
        )}
      </Section>
    </Card>
  )
}

function planLabel(state: LicenseState): string {
  if (state.guestMode) return 'Guest (free limits)'
  if (!state.signedIn) return 'Not signed in'
  return state.plan ?? state.tier ?? 'Free'
}

export function AccountPage(): React.JSX.Element {
  const [state, setState] = useState<LicenseState | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    window.api.auth.status().then(setState)
    const off = window.api.license.onChanged(setState)
    return off
  }, [])

  async function signIn(): Promise<void> {
    setBusy(true)
    const res = await window.api.auth.start()
    setBusy(false)
    if (res.ok) toast.success('Signed in', { description: res.state?.userName ?? res.state?.email })
    else toast.error('Sign in failed', { description: res.error })
  }

  async function signOut(): Promise<void> {
    setBusy(true)
    const res = await window.api.auth.signOut()
    setBusy(false)
    if (res.ok) toast.success('Signed out')
    else toast.error('Sign out failed', { description: res.error })
  }

  async function refresh(): Promise<void> {
    setBusy(true)
    const res = await window.api.license.refresh()
    setBusy(false)
    if (res.ok) toast.success('License refreshed')
    else toast.error('Refresh failed', { description: res.error })
  }

  if (!state) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <PageHeader title="Account" />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <PageHeader title="Account" subtitle="Your DevTune sign-in, plan, and device." />

      <div className="page-content ui-stack mx-auto w-full max-w-2xl flex-1">
        <Card>
          <Section
            title="Sign-in"
            actions={
              state.signedIn ? (
                <Button variant="secondary" size="sm" onClick={signOut} disabled={busy}>
                  <LogOut size={13} />
                  Sign out
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={signIn} disabled={busy}>
                  Sign in with DevTune
                </Button>
              )
            }
          >
            {state.signedIn ? (
              <ListRow>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {state.userName || state.email}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{state.email}</p>
                </div>
                <ShieldCheck size={16} className="shrink-0 text-[var(--accent)]" />
              </ListRow>
            ) : (
              <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                {state.guestMode
                  ? 'You are browsing with free-tier limits. Sign in to unlock Pro features.'
                  : 'Sign in to activate a license, start a trial, or sync your plan.'}
              </p>
            )}
          </Section>
        </Card>

        <Card>
          <Section title="Plan">
            <ListRow>
              <span className="text-sm text-[var(--text-secondary)]">Current plan</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {planLabel(state)}
              </span>
            </ListRow>
            {state.seatLimit != null && (
              <ListRow>
                <span className="text-sm text-[var(--text-secondary)]">Device seats</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {state.seatsUsed ?? 0} / {state.seatLimit}
                </span>
              </ListRow>
            )}
            {state.daysRemaining != null && (
              <ListRow>
                <span className="text-sm text-[var(--text-secondary)]">Days left</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {state.daysRemaining}
                </span>
              </ListRow>
            )}
          </Section>
        </Card>

        <UpdateSection />

        {state.signedIn && (
          <Card>
            <Section
              title="Devices"
              actions={
                <Button variant="ghost" size="sm" onClick={refresh} disabled={busy}>
                  <RefreshCw size={13} />
                  Revalidate
                </Button>
              }
            >
              <button
                type="button"
                onClick={() => window.api.system.openExternal(`${state.serverUrl}/account/devices`)}
                className="flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline"
              >
                Manage devices on Devtune
                <ExternalLink size={13} />
              </button>
            </Section>
          </Card>
        )}
      </div>
    </div>
  )
}

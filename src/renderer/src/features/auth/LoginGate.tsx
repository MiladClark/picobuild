import { useEffect, useState, type ReactNode } from 'react'
import { Loader2, LogIn } from 'lucide-react'
import { Button } from '@renderer/components/ui'
import logoUrl from '@renderer/assets/logo.svg'
import type { LicenseState } from '@shared/types/license'

function hasAppAccess(state: LicenseState): boolean {
  return !!state.signedIn || !!state.guestMode
}

export function LoginGate({ children }: { children: ReactNode }): React.JSX.Element {
  const [access, setAccess] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    window.api.auth.status().then((st) => setAccess(hasAppAccess(st)))
    const off = window.api.license.onChanged((st) => setAccess(hasAppAccess(st)))
    return off
  }, [])

  async function signIn(): Promise<void> {
    setBusy(true)
    setError('')
    const res = await window.api.auth.start()
    setBusy(false)
    if (res.ok && res.state) {
      setAccess(hasAppAccess(res.state))
    } else {
      setError(res.error ?? 'Sign in failed')
    }
  }

  async function continueAsGuest(): Promise<void> {
    setBusy(true)
    setError('')
    const st = await window.api.auth.enterGuest()
    setBusy(false)
    setAccess(hasAppAccess(st))
  }

  if (access === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-app)]">
        <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
      </div>
    )
  }

  if (!access) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-6 bg-[var(--bg-app)] px-6 text-center">
        <img src={logoUrl} alt="PicoBuild" className="h-16 w-16" draggable={false} />
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">PicoBuild</h1>
          <p className="mt-2 max-w-md text-sm text-[var(--text-muted)]">
            Sign in with your DevTune account to activate this device, start your one-time Pro
            trial, or continue with free limits.
          </p>
        </div>
        {error && <p className="max-w-md text-sm text-[var(--danger)]">{error}</p>}
        <Button variant="primary" size="lg" onClick={signIn} disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
          Sign in with DevTune
        </Button>
        <p className="text-xs text-[var(--text-muted)]">
          Your browser will open to authorize this device.
        </p>
        <button
          type="button"
          onClick={continueAsGuest}
          disabled={busy}
          className="text-sm text-[var(--text-muted)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors hover:text-[var(--text-secondary)]"
        >
          Continue without signing in
        </button>
        <p className="max-w-sm text-[11px] leading-relaxed text-[var(--text-muted)]">
          Guest mode applies free-tier limits. Choose Account from the menu at any time to sign in.
        </p>
      </div>
    )
  }

  return <>{children}</>
}

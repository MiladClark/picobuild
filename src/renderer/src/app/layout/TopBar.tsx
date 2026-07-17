import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  FolderOpen,
  Image,
  Settings,
  User,
  Save,
  Upload,
  Minimize2,
  Moon,
  Sun,
  Undo2,
  Redo2
} from 'lucide-react'
import { useProjectStore } from '@renderer/stores/project-store'
import { useAppStore } from '@renderer/stores/app-store'
import { useThemeStore } from '@renderer/stores/theme-store'
import { Button, ToolbarButton } from '@renderer/components/ui'
import { cn } from '@renderer/lib/utils'
import { useProjectSave } from '@renderer/hooks/use-project-save'
import { useImportAssets } from '@renderer/hooks/use-import-assets'
import { useApplyHistory } from '@renderer/hooks/use-apply-history'
import { WindowControls } from './WindowControls'
import logoUrl from '@renderer/assets/logo.svg'

const barBtn = 'h-7 w-7'

function BarDivider(): React.JSX.Element {
  return <div className="mx-1 h-4 w-px shrink-0 bg-[var(--border)]" />
}

function DocumentTitle(): React.JSX.Element | null {
  const project = useProjectStore((s) => s.project)
  const isDirty = useProjectStore((s) => s.isDirty)
  if (!project) return null
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1">
      <span className="max-w-[220px] truncate text-xs font-medium text-[var(--text-primary)]">
        {project.name}
      </span>
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-300',
          isDirty ? 'bg-[var(--warning)]' : 'scale-0 bg-transparent'
        )}
        title={isDirty ? 'Unsaved changes' : undefined}
      />
    </div>
  )
}

function BuilderActions({ showImport = true }: { showImport?: boolean }): React.JSX.Element {
  const handleSave = useProjectSave()
  const { pickAndImport } = useImportAssets()
  const { undo, redo, canUndo, canRedo } = useApplyHistory()

  return (
    <div className="flex items-center gap-0.5">
      <ToolbarButton disabled={!canUndo()} title="Undo (Ctrl+Z)" onClick={undo} className={barBtn}>
        <Undo2 size={14} />
      </ToolbarButton>
      <ToolbarButton disabled={!canRedo()} title="Redo (Ctrl+Y)" onClick={redo} className={barBtn}>
        <Redo2 size={14} />
      </ToolbarButton>
      <Button size="bar" variant="ghost" onClick={handleSave} title="Save (Ctrl+S)">
        <Save size={14} />
      </Button>
      {showImport && (
        <Button
          size="sm"
          variant="primary"
          className="ml-1"
          onClick={pickAndImport}
          title="Import images"
        >
          <Upload size={13} />
          Import
        </Button>
      )}
    </div>
  )
}

function Logo(): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="flex shrink-0 items-center gap-2">
      <img src={logoUrl} alt="" className="h-[22px] w-[22px] shrink-0" />
      <span className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)]">
        {t('app.name')}
      </span>
    </div>
  )
}

export function TopBar(): React.JSX.Element {
  const { t } = useTranslation()
  const location = useLocation()
  const project = useProjectStore((s) => s.project)
  const { focusMode, setFocusMode } = useAppStore()
  const { theme, toggleTheme } = useThemeStore()

  const isBuilder = location.pathname === '/builder'
  // macOS renders its own floating traffic lights over the leftmost region
  // (see trafficLightPosition in main/index.ts) instead of WindowControls —
  // reserve room so the logo/nav/back button don't sit underneath them.
  const isMac = window.electron.process.platform === 'darwin'

  if (focusMode && isBuilder) {
    return (
      <header className="flex h-[var(--bar-height)] shrink-0 border-b border-[var(--border)] bg-[var(--bg-topbar)]">
        <div className={cn('titlebar-drag topbar-section bar-x min-w-0 flex-1', isMac && 'pl-20')}>
          <Button
            size="bar"
            variant="secondary"
            className="titlebar-no-drag"
            onClick={() => setFocusMode(false)}
            title="Exit focus mode (Esc)"
          >
            <Minimize2 size={14} />
          </Button>
        </div>

        <div className="titlebar-no-drag topbar-section bar-x">
          {project && (
            <>
              <DocumentTitle />
              <BarDivider />
              <BuilderActions showImport={false} />
            </>
          )}
          <BarDivider />
          <Button size="bar" variant="ghost" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </Button>
        </div>
        <WindowControls />
      </header>
    )
  }

  const navLinks = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/projects', label: t('nav.projects'), icon: FolderOpen },
    { to: '/builder', label: t('nav.imageBuilder'), icon: Image }
  ]

  return (
    <header className="flex h-[var(--bar-height)] shrink-0 border-b border-[var(--border)] bg-[var(--bg-topbar)]">
      <div className={cn('titlebar-drag topbar-section bar-x min-w-0 flex-1', isMac && 'pl-20')}>
        <Logo />

        <BarDivider />

        <nav className="titlebar-no-drag flex min-w-0 items-center gap-0.5 rounded-[var(--radius-md)] bg-[var(--bg-input)]/60 p-0.5">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex h-[26px] items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-xs font-medium transition-all duration-150',
                  isActive
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-sm),inset_0_0_0_1px_var(--border-strong)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                )
              }
              title={label}
            >
              <Icon size={13} />
              <span className="hidden lg:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="titlebar-no-drag topbar-section bar-x shrink-0">
        {isBuilder && project && (
          <>
            <DocumentTitle />
            <BarDivider />
            <BuilderActions />
            <BarDivider />
          </>
        )}

        <NavLink
          to="/account"
          className={({ isActive }) =>
            cn(
              'flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] transition-colors',
              isActive
                ? 'bg-[var(--accent-muted)] text-[var(--accent-hover)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
            )
          }
          title="Account"
        >
          <User size={14} />
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] transition-colors',
              isActive
                ? 'bg-[var(--accent-muted)] text-[var(--accent-hover)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
            )
          }
          title={t('nav.settings')}
        >
          <Settings size={14} />
        </NavLink>

        <Button size="bar" variant="ghost" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </Button>
      </div>

      <WindowControls />
    </header>
  )
}

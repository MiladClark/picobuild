import { Outlet, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { TopBar } from './TopBar'
import { BottomBar } from './BottomBar'
import { BuilderLeftPanel } from './BuilderLeftPanel'
import { BuilderRightPanel } from './BuilderRightPanel'
import { UpdateRoot } from '../../components/UpdateRoot'

export function AppShell(): React.JSX.Element {
  const location = useLocation()
  const isBuilder = location.pathname === '/builder'

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--bg-app)]">
      <UpdateRoot />
      <TopBar />
      <div className="flex min-h-0 flex-1">
        {isBuilder && <BuilderLeftPanel />}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
        {isBuilder && <BuilderRightPanel />}
      </div>
      {isBuilder && <BottomBar />}
      <Toaster position="bottom-right" theme="system" richColors closeButton />
    </div>
  )
}

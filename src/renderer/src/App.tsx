import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './app/layout/AppShell'
import { DashboardPage } from './app/pages/DashboardPage'
import { ProjectsPage } from './app/pages/ProjectsPage'
import { ImageBuilderPage } from './app/pages/ImageBuilderPage'
import { AssetsPage } from './app/pages/AssetsPage'
import { ExportsPage } from './app/pages/ExportsPage'
import { SettingsPage } from './app/pages/SettingsPage'
import { AccountPage } from './app/pages/AccountPage'
import { LoginGate } from './features/auth/LoginGate'

function App(): React.JSX.Element {
  return (
    <LoginGate>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/builder" element={<ImageBuilderPage />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/exports" element={<ExportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </LoginGate>
  )
}

export default App

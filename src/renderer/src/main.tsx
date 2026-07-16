import './assets/main.css'
import './dev-mock'
import './i18n'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { useThemeStore } from './stores/theme-store'

// Apply theme before render
const theme = useThemeStore.getState().theme
document.documentElement.setAttribute('data-theme', theme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

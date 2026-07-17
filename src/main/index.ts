import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerIpcHandlers } from './ipc/handlers'
import { registerLicensingIpc, attachLicenseFocusHandler } from './ipc/licensing'
import { registerUpdateIpc, notifyUpdateAvailable } from './ipc/updates'
import { checkForUpdates } from './lib/updates'
import { getLicenseState } from './lib/licensing'

function createWindow(): BrowserWindow {
  const isMac = process.platform === 'darwin'

  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#111113',
    // macOS keeps its native traffic-light buttons (hidden title bar, no
    // frame text) since the custom WindowControls renders nothing there;
    // Windows/Linux go fully frameless and rely on WindowControls instead.
    ...(isMac
      ? { titleBarStyle: 'hidden' as const, trafficLightPosition: { x: 16, y: 15 } }
      : { frame: false, autoHideMenuBar: true }),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  const sendMaximized = (): void => {
    mainWindow.webContents.send('window:maximized-change', mainWindow.isMaximized())
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    sendMaximized()
  })

  mainWindow.on('maximize', sendMaximized)
  mainWindow.on('unmaximize', sendMaximized)

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  attachLicenseFocusHandler(mainWindow)
  return mainWindow
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.picobuild')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()
  registerLicensingIpc()
  registerUpdateIpc()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // Required-update gate shortly after launch (optional updates surface via
  // the Account page's manual/periodic check instead of an interruptive prompt).
  setTimeout(async () => {
    const res = await checkForUpdates(getLicenseState().serverUrl)
    if (res.ok && res.updateAvailable && res.required && res.latest) {
      notifyUpdateAvailable({
        version: res.latest.version,
        required: true,
        releaseNotes: res.latest.releaseNotes
      })
    }
  }, 5000)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

import { app, BrowserWindow, ipcMain, session, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDB, getSetting, setSetting, closeDB } from './db/database'
import { registerIpcHandlers } from './ipc/handlers'
import { startScheduler, stopScheduler } from './sync/scheduler'
import { setupAutoUpdater, stopAutoUpdater } from './updater'

let mainWindow: BrowserWindow | null = null

function getIconPath(): string {
  if (is.dev) {
    return join(__dirname, '../renderer/public/images/app_icon.ico')
  }
  return join(process.resourcesPath, 'images/app_icon.ico')
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 650,
    show: false,
    frame: false,
    transparent: true,
    autoHideMenuBar: true,
    backgroundColor: '#00000000',
    roundedCorners: true,
    icon: getIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('br.com.dpi.mimaki-tracker')

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (is.dev) {
      const headers = { ...details.responseHeaders }
      delete headers['content-security-policy']
      delete headers['Content-Security-Policy']
      callback({ responseHeaders: headers })
    } else {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://github.com;"
          ]
        }
      })
    }
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  try {
    initDB()
  } catch (err: any) {
    console.error('[App] Falha ao inicializar banco:', err.message)
    app.quit()
    return
  }

  // Auto-migração: corrige path antigo que terminava com \Elm ou /Elm
  const currentPath = getSetting('rasterlink_data_path')
  if (currentPath && (currentPath.endsWith('\\Elm') || currentPath.endsWith('/Elm'))) {
    const fixedPath = currentPath.replace(/[\\\/]Elm$/, '')
    setSetting('rasterlink_data_path', fixedPath)
    setSetting('last_sync_folder_timestamp', '')
  }

  if (!getSetting('rasterlink_data_path')) {
    setSetting('rasterlink_data_path', 'd:\\www\\2026\\felipe-neneu-portfolio\\dpi-tinta-mimaki\\mock_rasterlink_data\\MijSuite\\Jobs\\RL01\\Mf')
  }

  registerIpcHandlers(ipcMain)

  createWindow()

  startScheduler()

  globalShortcut.register('Shift+T', () => {
    mainWindow?.webContents.send('dev:toggle-terminal')
  })

  if (!is.dev && mainWindow) {
    setupAutoUpdater(mainWindow)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
    }
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('before-quit', () => {
  globalShortcut.unregisterAll()
  stopScheduler()
  stopAutoUpdater()
  closeDB()
})

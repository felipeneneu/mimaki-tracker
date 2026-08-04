import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDB, getSetting, setSetting } from './db/database'
import { registerIpcHandlers } from './ipc/handlers'
import { startScheduler, stopScheduler } from './sync/scheduler'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

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
    frame: true,
    backgroundColor: '#0d0b14',
    titleBarStyle: 'default',
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

  // Minimiza para bandeja em vez de fechar
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createTray(): void {
  const icon = nativeImage.createFromPath(getIconPath())
  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir DPI Mimaki Tracker',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      }
    },
    { type: 'separator' },
    {
      label: 'Sincronizar Agora',
      click: () => {
        mainWindow?.webContents.send('tray:sync-requested')
      }
    },
    { type: 'separator' },
    {
      label: 'Sair',
      click: () => {
        app.isQuitting = true
        stopScheduler()
        app.quit()
      }
    }
  ])

  tray.setToolTip('DPI Mimaki Tracker')
  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}

// Augmenta o tipo de app para permitir isQuitting
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Electron {
    interface App {
      isQuitting: boolean
    }
  }
}

app.isQuitting = false

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('br.com.dpi.mimaki-tracker')

  // CSP customizado ANTES de criar janela — permite Google Fonts
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:;"
        ]
      }
    })
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Inicializa banco de dados
  initDB()

  // Auto-salva path padrão do RasterLink se não existir
  if (!getSetting('rasterlink_data_path')) {
    setSetting('rasterlink_data_path', 'd:\\www\\2026\\felipe-neneu-portfolio\\dpi-tinta-mimaki\\mock_rasterlink_data\\MijSuite\\Jobs\\RL01\\Mf\\Elm')
  }

  // Registra todos os handlers IPC
  registerIpcHandlers(ipcMain, dialog)

  createWindow()
  createTray()

  // Inicia o agendador de sincronização
  startScheduler()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
    }
  })
})

app.on('window-all-closed', () => {
  // No Windows/Linux, manter rodando na bandeja
  if (process.platform === 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  app.isQuitting = true
  stopScheduler()
})

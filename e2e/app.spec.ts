import { test, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { join } from 'path'

let electronApp: ElectronApplication
let window: Page

test.beforeAll(async () => {
  electronApp = await electron.launch({
    args: [join(__dirname, '../out/main/index.js')],
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  })
  window = await electronApp.firstWindow()
})

test.afterAll(async () => {
  await electronApp?.close()
})

test.describe('App Startup', () => {
  test('launches and shows main window', async () => {
    const title = await window.title()
    expect(title).toContain('DPI')
  })

  test('renders sidebar navigation', async () => {
    const sidebar = await window.locator('aside').first()
    await expect(sidebar).toBeVisible()
  })

  test('sidebar has DPI Mimaki branding', async () => {
    await expect(window.locator('text=DPI Mimaki')).toBeVisible()
    await expect(window.locator('text=Tracker')).toBeVisible()
  })
})

test.describe('Navigation', () => {
  test('navigates to Dashboard by default', async () => {
    await expect(window.locator('text=Dashboard')).toBeVisible()
  })

  test('navigates to Jobs List', async () => {
    await window.locator('text=Histórico de Jobs').click()
    await expect(window.locator('h2:has-text("Histórico de Jobs")')).toBeVisible()
  })

  test('navigates to Settings', async () => {
    await window.locator('text=Configurações').click()
    await expect(window.locator('h2:has-text("Configurações")')).toBeVisible()
  })

  test('navigates back to Dashboard', async () => {
    await window.locator('a:has-text("Dashboard")').click()
    await expect(window.locator('h2:has-text("Dashboard")')).toBeVisible()
  })
})

test.describe('Dashboard', () => {
  test('shows stat cards', async () => {
    await window.locator('a:has-text("Dashboard")').click()
    const cards = window.locator('[class*="bg-bg-surface"]')
    await expect(cards.first()).toBeVisible()
  })
})

test.describe('Sync Button', () => {
  test('Sincronizar Agora button is visible in TopBar', async () => {
    const syncBtn = window.locator('button:has-text("Sincronizar Agora")')
    await expect(syncBtn).toBeVisible()
  })

  test('button has consistent height', async () => {
    const syncBtn = window.locator('button:has-text("Sincronizar Agora")')
    const box = await syncBtn.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(32)
    expect(box?.height).toBeLessThanOrEqual(40)
  })
})

test.describe('Settings Page', () => {
  test('shows data path input', async () => {
    await window.locator('text=Configurações').click()
    const pathInput = window.locator('input[placeholder*="Mf"]')
    await expect(pathInput).toBeVisible()
  })

  test('shows cost inputs', async () => {
    await expect(window.locator('text=Custos de Produção')).toBeVisible()
  })

  test('shows API integration section', async () => {
    await expect(window.locator('text=Integração ERP')).toBeVisible()
  })

  test('shows database backup section', async () => {
    await expect(window.locator('text=Banco de Dados')).toBeVisible()
  })

  test('backup button is visible', async () => {
    const backupBtn = window.locator('button:has-text("Fazer Backup")')
    await expect(backupBtn).toBeVisible()
  })

  test('import button is visible', async () => {
    const importBtn = window.locator('button:has-text("Importar Backup")')
    await expect(importBtn).toBeVisible()
  })

  test('save button is visible', async () => {
    const saveBtn = window.locator('button:has-text("Salvar Configurações")')
    await expect(saveBtn).toBeVisible()
  })
})

test.describe('Dev Terminal', () => {
  test('opens with Shift+T shortcut', async () => {
    await window.keyboard.press('Shift+T')
    await window.waitForTimeout(500)
    const terminal = window.locator('text=Terminal de Desenvolvimento')
    await expect(terminal).toBeVisible()
  })

  test('shows password prompt in production mode', async () => {
    const passwordInput = window.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible()
  })

  test('closes with Escape key', async () => {
    await window.keyboard.press('Escape')
    await window.waitForTimeout(300)
    const terminal = window.locator('text=Terminal de Desenvolvimento')
    await expect(terminal).not.toBeVisible()
  })
})

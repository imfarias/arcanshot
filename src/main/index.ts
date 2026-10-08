import { BrowserWindow, Menu, Notification, Tray, app, globalShortcut, nativeImage } from 'electron'
import { join } from 'node:path'
import type { AppSettings, CaptureMode } from '@shared/types'
import { SettingsStore } from './settingsStore'
import { DisplayCacheStore } from './displayCacheStore'
import { CaptureSession } from './captureSession'
import { registerIpcHandlers } from './ipc'
import { setDisplayCacheStore, startCapture } from './overlay'
import { openGalleryWindow } from './gallery'

if (process.env['ARCANSHOT_USER_DATA']) {
  app.setPath('userData', process.env['ARCANSHOT_USER_DATA'])
}

app.setAppUserModelId('com.fariasbrz.arcanshot')

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

let tray: Tray | null = null
let settingsWindow: BrowserWindow | null = null
let store: SettingsStore

function iconPath(): string {
  // dev: resources/ na raiz; empacotado: resources/ dentro de app.asar (files do builder)
  return app.isPackaged
    ? join(process.resourcesPath, 'app.asar', 'resources', 'icon.png')
    : join(app.getAppPath(), 'resources', 'icon.png')
}

function triggerCapture(mode: CaptureMode): void {
  // Não acionar captura enquanto a janela de configurações estiver em foco —
  // permite que o HotkeyInput capture teclas como PrintScreen sem abrir o overlay.
  const focused = BrowserWindow.getFocusedWindow()
  if (focused && settingsWindow && focused === settingsWindow) return

  void startCapture(mode, store.load()).catch((err: unknown) => {
    if (Notification.isSupported()) {
      new Notification({
        title: 'ArcanShot',
        body: `Falha ao capturar: ${err instanceof Error ? err.message : String(err)}`
      }).show()
    }
  })
}

function openSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return
  }
  settingsWindow = new BrowserWindow({
    width: 720,
    height: 680,
    title: 'ArcanShot — Configurações',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })
  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    void settingsWindow.loadURL(`${devUrl}/settings/index.html`)
  } else {
    void settingsWindow.loadFile(join(__dirname, '../renderer/settings/index.html'))
  }
}

function registerHotkeys(settings: AppSettings): void {
  globalShortcut.unregisterAll()
  const bindings: { accelerator: string; mode: CaptureMode; label: string }[] = [
    { accelerator: settings.hotkeyArea, mode: 'area', label: 'capturar área' },
    { accelerator: settings.hotkeyFull, mode: 'full', label: 'capturar tela atual' },
    { accelerator: settings.hotkeyAll, mode: 'all', label: 'capturar todos os monitores' }
  ]
  const failures: string[] = []
  for (const { accelerator, mode, label } of bindings) {
    let registered = false
    try {
      registered = globalShortcut.register(accelerator, () => triggerCapture(mode))
    } catch {
      registered = false
    }
    if (!registered) failures.push(`${accelerator} (${label})`)
  }
  if (failures.length > 0 && settings.showNotifications && Notification.isSupported()) {
    new Notification({
      title: 'ArcanShot — atalho indisponível',
      body: `Não foi possível registrar: ${failures.join(', ')}. Troque o atalho nas Configurações.`
    }).show()
  }
}

function applySettings(settings: AppSettings): void {
  registerHotkeys(settings)
  // setLoginItemSettings só faz sentido no app empacotado — em dev registraria
  // o binário do electron em node_modules como item de inicialização do Windows.
  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: settings.launchOnStartup })
  }
}

function createTray(): void {
  const icon = nativeImage.createFromPath(iconPath())
  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('ArcanShot — captura de tela')
  const menu = Menu.buildFromTemplate([
    { label: 'Capturar área', click: () => triggerCapture('area') },
    { label: 'Capturar tela atual', click: () => triggerCapture('full') },
    { label: 'Capturar todos os monitores', click: () => triggerCapture('all') },
    { type: 'separator' },
    { label: 'Configurações…', click: () => openSettingsWindow() },
    { type: 'separator' },
    { label: 'Sair', click: () => app.quit() }
  ])
  tray.setContextMenu(menu)
  tray.on('double-click', () => triggerCapture('area'))
}

app.on('second-instance', () => {
  openSettingsWindow()
})

app.whenReady().then(() => {
  store = new SettingsStore(app.getPath('userData'), app.getPath('pictures'))
  setDisplayCacheStore(new DisplayCacheStore(app.getPath('userData')))
  const session = new CaptureSession(
    () => store.load().sequenceTimeoutSec * 1000,
    (items) => openGalleryWindow(items, store.load())
  )
  registerIpcHandlers({ store, applySettings, openSettingsWindow, session })
  createTray()
  applySettings(store.load())

  if (process.env['ARCANSHOT_OPEN_SETTINGS'] === '1') {
    openSettingsWindow()
  }
})

// App residente na bandeja: não sai quando todas as janelas fecham.
app.on('window-all-closed', () => {
  /* mantém vivo */
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

import { BrowserWindow, screen } from 'electron'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { AppSettings, GalleryInitData, GalleryItem, OverlayInitData } from '@shared/types'
import { dataUrlToBuffer } from './saveImage'
import { loadOverlayPage, registerOverlayEntry } from './overlay'

let galleryWin: BrowserWindow | null = null
let galleryInitData: GalleryInitData | null = null
let tempDir: string | null = null
let tempFiles: string[] = []

// --- redit context -----------------------------------------------------------

let reditContext: { galleryIndex: number } | null = null

export function setReditContext(galleryIndex: number): void {
  reditContext = { galleryIndex }
}

export function getReditContext(): { galleryIndex: number } | null {
  return reditContext
}

export function clearReditContext(): void {
  reditContext = null
}

// --- gallery window helpers --------------------------------------------------

function loadGalleryPage(win: BrowserWindow): void {
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    void win.loadURL(`${devUrl}/gallery/index.html`)
  } else {
    void win.loadFile(join(__dirname, '../renderer/gallery/index.html'))
  }
}

function cleanupTemp(): void {
  if (tempDir) {
    try {
      rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // best-effort
    }
    tempDir = null
    tempFiles = []
  }
}

export function openGalleryWindow(items: GalleryItem[], settings: AppSettings): void {
  if (galleryWin && !galleryWin.isDestroyed()) {
    galleryWin.focus()
    return
  }

  // Pré-escreve arquivos temporários para drag-and-drop nativo
  try {
    tempDir = mkdtempSync(join(tmpdir(), 'arcanshot-'))
    tempFiles = items.map((item) => {
      const ext = item.dataUrl.startsWith('data:image/png') ? 'png' : 'jpg'
      const filePath = join(tempDir!, `capture-${String(item.index).padStart(3, '0')}.${ext}`)
      writeFileSync(filePath, dataUrlToBuffer(item.dataUrl))
      return filePath
    })
  } catch {
    tempDir = null
    tempFiles = []
  }

  galleryInitData = { items, settings }

  const win = new BrowserWindow({
    width: 900,
    height: 640,
    minWidth: 600,
    minHeight: 400,
    title: `ArcanShot — ${items.length} capturas na sequência`,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })

  win.once('ready-to-show', () => {
    win.show()
    win.focus()
  })

  win.on('closed', () => {
    galleryWin = null
    galleryInitData = null
    cleanupTemp()
  })

  galleryWin = win
  loadGalleryPage(win)
}

export function hideGalleryForEdit(): void {
  if (galleryWin && !galleryWin.isDestroyed()) {
    galleryWin.hide()
  }
}

export function showGallery(): void {
  if (galleryWin && !galleryWin.isDestroyed()) {
    galleryWin.show()
    galleryWin.focus()
    galleryWin.webContents.send('gallery:refresh')
  }
}

export function updateGalleryItem(galleryIndex: number, newDataUrl: string): void {
  if (galleryInitData) {
    const item = galleryInitData.items.find((i) => i.index === galleryIndex)
    if (item) {
      item.dataUrl = newDataUrl
      // Sobrescreve temp file para que drag-and-drop use a versão re-editada
      const tempPath = tempFiles[galleryIndex - 1]
      if (tempPath) {
        try {
          writeFileSync(tempPath, dataUrlToBuffer(newDataUrl))
        } catch {
          // best-effort
        }
      }
    }
  }
  showGallery()
}

export function getGalleryInitData(): GalleryInitData | null {
  return galleryInitData
}

export function getTempFilePath(index: number): string | null {
  const path = tempFiles[index - 1]
  return path ?? null
}

export function closeGallery(): void {
  if (galleryWin && !galleryWin.isDestroyed()) {
    galleryWin.destroy()
  }
  galleryWin = null
  galleryInitData = null
  cleanupTemp()
}

// --- redit overlay -----------------------------------------------------------

export function startGalleryEdit(
  galleryIndex: number,
  dataUrl: string,
  settings: AppSettings
): void {
  hideGalleryForEdit()
  setReditContext(galleryIndex)

  const primary = screen.getPrimaryDisplay()
  const w = Math.round(primary.bounds.width * 0.85)
  const h = Math.round(primary.bounds.height * 0.85)
  const x = primary.bounds.x + Math.round((primary.bounds.width - w) / 2)
  const y = primary.bounds.y + Math.round((primary.bounds.height - h) / 2)

  const win = new BrowserWindow({
    x,
    y,
    width: w,
    height: h,
    title: 'ArcanShot — Editar captura',
    frame: true,
    show: false,
    resizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })
  win.setAlwaysOnTop(true, 'floating')

  const initData: OverlayInitData = {
    mode: 'redit',
    displays: [
      {
        displayId: galleryIndex,
        bounds: { x: 0, y: 0, width: w, height: h },
        scaleFactor: 1,
        dataUrl
      }
    ],
    settings
  }

  // Registra na infra de overlays: overlay:init o encontrará; closeAllOverlays o fechará.
  registerOverlayEntry(win, initData)

  // Quando a janela fechar sem que o context tenha sido consumido (save/copy),
  // é porque o usuário cancelou — restaura a galeria.
  win.once('closed', () => {
    const ctx = getReditContext()
    if (ctx) {
      clearReditContext()
      showGallery()
    }
  })

  win.once('ready-to-show', () => {
    win.show()
    win.focus()
  })

  loadOverlayPage(win)
}

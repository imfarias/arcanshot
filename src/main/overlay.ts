import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import type { AppSettings, CaptureMode, OverlayInitData } from '@shared/types'
import { captureAllDisplays } from './capture'

const overlayWindows = new Set<BrowserWindow>()
const initDataByWebContents = new Map<number, OverlayInitData>()

export function isCapturing(): boolean {
  return overlayWindows.size > 0
}

export function getInitData(webContentsId: number): OverlayInitData | undefined {
  return initDataByWebContents.get(webContentsId)
}

export function closeAllOverlays(): void {
  for (const win of overlayWindows) {
    if (!win.isDestroyed()) win.destroy()
  }
  overlayWindows.clear()
  initDataByWebContents.clear()
}

/** Fecha os overlays dos outros displays quando um deles entra em edição. */
export function closeOtherOverlays(keepWebContentsId: number): void {
  for (const win of overlayWindows) {
    if (!win.isDestroyed() && win.webContents.id !== keepWebContentsId) {
      initDataByWebContents.delete(win.webContents.id)
      win.destroy()
      overlayWindows.delete(win)
    }
  }
}

function loadOverlayPage(win: BrowserWindow): void {
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    void win.loadURL(`${devUrl}/overlay/index.html`)
  } else {
    void win.loadFile(join(__dirname, '../renderer/overlay/index.html'))
  }
}

function createOverlayWindow(
  bounds: { x: number; y: number; width: number; height: number },
  initData: OverlayInitData
): BrowserWindow {
  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    show: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    hasShadow: false,
    enableLargerThanScreen: true,
    backgroundColor: '#000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setBounds(bounds)
  win.once('ready-to-show', () => {
    win.show()
    win.focus()
  })
  win.on('closed', () => {
    overlayWindows.delete(win)
  })
  overlayWindows.add(win)
  initDataByWebContents.set(win.webContents.id, initData)
  loadOverlayPage(win)
  return win
}

export async function startCapture(mode: CaptureMode, settings: AppSettings): Promise<void> {
  if (isCapturing()) return
  const captures = await captureAllDisplays()

  if (mode === 'area') {
    for (const capture of captures) {
      createOverlayWindow(capture.bounds, { mode, displays: [capture], settings })
    }
    return
  }

  if (mode === 'full') {
    const cursor = screen.getCursorScreenPoint()
    const display = screen.getDisplayNearestPoint(cursor)
    const capture = captures.find((c) => c.displayId === display.id) ?? captures[0]
    createOverlayWindow(capture.bounds, { mode, displays: [capture], settings })
    return
  }

  // mode === 'all': janela única no display primário com todas as capturas
  const primary = screen.getPrimaryDisplay()
  createOverlayWindow(primary.bounds, { mode, displays: captures, settings })
}

import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import type { AppSettings, CaptureMode, DisplayInfo, OverlayInitData } from '@shared/types'
import { captureAllDisplays } from './capture'
import type { DisplayCacheStore } from './displayCacheStore'
import { pickCapturesForWindow, planOverlayWindows } from './overlayLayout'

const overlayWindows = new Set<BrowserWindow>()
const initDataByWebContents = new Map<number, OverlayInitData>()
let _cacheStore: DisplayCacheStore | null = null

export function setDisplayCacheStore(store: DisplayCacheStore): void {
  _cacheStore = store
}

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

export function closeOtherOverlays(keepWebContentsId: number): void {
  for (const win of overlayWindows) {
    if (!win.isDestroyed() && win.webContents.id !== keepWebContentsId) {
      initDataByWebContents.delete(win.webContents.id)
      win.destroy()
      overlayWindows.delete(win)
    }
  }
}

export function loadOverlayPage(win: BrowserWindow): void {
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    void win.loadURL(`${devUrl}/overlay/index.html`)
  } else {
    void win.loadFile(join(__dirname, '../renderer/overlay/index.html'))
  }
}

/**
 * Registra uma janela de overlay externa (ex: janela de re-edição da galeria)
 * nas estruturas internas — `overlayWindows` e `initDataByWebContents` —
 * de modo que `closeAllOverlays` e `overlay:init` a encontrem normalmente.
 */
export function registerOverlayEntry(win: BrowserWindow, initData: OverlayInitData): void {
  initDataByWebContents.set(win.webContents.id, initData)
  win.on('closed', () => {
    overlayWindows.delete(win)
    initDataByWebContents.delete(win.webContents.id)
  })
  overlayWindows.add(win)
}

/**
 * Cria uma janela de overlay e já começa a carregar a página.
 * Retorna a janela e uma promise que resolve quando `ready-to-show` disparar.
 * A janela é mostrada externamente após os dados de init estarem prontos.
 */
function createOverlayWindowAndLoad(bounds: {
  x: number
  y: number
  width: number
  height: number
}): { win: BrowserWindow; readyPromise: Promise<void> } {
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
  win.on('closed', () => {
    overlayWindows.delete(win)
  })
  overlayWindows.add(win)

  const readyPromise = new Promise<void>((resolve) => {
    win.once('ready-to-show', resolve)
  })

  loadOverlayPage(win)
  return { win, readyPromise }
}

function getAllDisplayInfos(): DisplayInfo[] {
  return screen.getAllDisplays().map((d) => ({
    id: d.id,
    bounds: d.bounds,
    scaleFactor: d.scaleFactor
  }))
}

export async function startCapture(mode: CaptureMode, settings: AppSettings): Promise<void> {
  if (isCapturing()) return

  // Usa displays do cache se disponíveis; caso contrário consulta o SO.
  // O cache é de sessões anteriores — bounds podem estar ligeiramente desatualizados,
  // mas captureAllDisplays() sempre usa screen.getAllDisplays() internamente para garantir
  // conteúdo visual correto.
  const displayInfos: DisplayInfo[] = _cacheStore?.load() ?? getAllDisplayInfos()

  type WinEntry = { win: BrowserWindow; readyPromise: Promise<void>; displayId: number | null }

  // Consultas ao SO sob demanda: o modo `area` (caminho quente do atalho principal)
  // não paga nenhuma chamada a `screen` além da lista de displays, que vem do cache.
  const plans = planOverlayWindows(mode, displayInfos, {
    cursorDisplayId:
      mode === 'full' ? screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).id : null,
    primaryDisplayId: mode === 'all' ? screen.getPrimaryDisplay().id : null
  })

  const windowEntries: WinEntry[] = plans.map(({ bounds, displayId }) => ({
    ...createOverlayWindowAndLoad(bounds),
    displayId
  }))

  try {
    // Captura e carregamento das janelas correm em paralelo.
    // As janelas são mostradas assim que carregam (feedback imediato ao usuário);
    // a captura chega via polling IPC (overlay:init) logo em seguida.
    const capturePromise = captureAllDisplays()

    await Promise.all(
      windowEntries.map(async ({ win, readyPromise }) => {
        await readyPromise
        win.show()
        win.focus()
      })
    )

    const captures = await capturePromise

    for (const { win, displayId } of windowEntries) {
      const initData: OverlayInitData = {
        mode,
        displays: pickCapturesForWindow(captures, displayId),
        settings
      }
      initDataByWebContents.set(win.webContents.id, initData)
    }

    // Atualiza cache em background com layout atual vindo da captura
    if (_cacheStore) {
      const store = _cacheStore
      const freshInfos: DisplayInfo[] = captures.map((c) => ({
        id: c.displayId,
        bounds: c.bounds,
        scaleFactor: c.scaleFactor
      }))
      setImmediate(() => store.save(freshInfos))
    }
  } catch (err) {
    closeAllOverlays()
    throw err
  }
}

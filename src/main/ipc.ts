import {
  BrowserWindow,
  Notification,
  app,
  clipboard,
  dialog,
  ipcMain,
  nativeImage
} from 'electron'
import { mkdirSync, writeFileSync } from 'node:fs'
import type { CaptureMode, AppSettings } from '@shared/types'
import { validateSettings } from '@shared/settings'
import { pageBackground } from '@shared/beautify'
import { formatFilename } from '@shared/filenamePattern'
import { SettingsStore } from './settingsStore'
import { dataUrlToBuffer, saveCapture, saveToPath, uniquePath } from './saveImage'
import { buildPdf } from './pdfBuilder'
import { closeAllOverlays, closeOtherOverlays, getInitData, startCapture } from './overlay'
import {
  clearReditContext,
  closeGallery,
  getGalleryInitData,
  getReditContext,
  getTempFilePath,
  startGalleryEdit,
  updateGalleryItem
} from './gallery'
import type { CaptureSession } from './captureSession'

export interface IpcContext {
  store: SettingsStore
  /** Reaplica efeitos colaterais (hotkeys, autostart) após salvar settings. */
  applySettings: (settings: AppSettings) => void
  openSettingsWindow: () => void
  /** Opcional: ausente em testes que não precisam de sessão. */
  session?: CaptureSession
}

function notify(settings: AppSettings, title: string, body: string): void {
  if (!settings.showNotifications) return
  if (Notification.isSupported()) {
    new Notification({ title, body }).show()
  }
}

export function registerIpcHandlers(ctx: IpcContext): void {
  ipcMain.handle('settings:get', () => ctx.store.load())

  ipcMain.handle('settings:save', (_event, partial: Partial<AppSettings>) => {
    const fieldErrors = validateSettings(partial)
    if (Object.keys(fieldErrors).length > 0) {
      return { ok: false, fieldErrors }
    }
    try {
      const settings = ctx.store.save(partial)
      ctx.applySettings(settings)
      return { ok: true, settings }
    } catch (err) {
      return { ok: false, fieldErrors: { saveDir: err instanceof Error ? err.message : String(err) } }
    }
  })

  ipcMain.handle('settings:pick-dir', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win ?? new BrowserWindow({ show: false }), {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Escolher pasta padrão para salvar capturas'
    })
    if (result.canceled || result.filePaths.length === 0) return { ok: true }
    return { ok: true, path: result.filePaths[0] }
  })

  ipcMain.handle('capture:start', async (_event, mode: CaptureMode) => {
    try {
      await startCapture(mode, ctx.store.load())
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('overlay:init', async (event) => {
    const id = event.sender.id
    // Aguarda até 8 s: a janela pode ter carregado antes da captura terminar.
    for (let i = 0; i < 160; i++) {
      const data = getInitData(id)
      if (data) return data
      await new Promise<void>((r) => setTimeout(r, 50))
    }
    return null
  })

  ipcMain.handle('overlay:begin-edit', (event) => {
    closeOtherOverlays(event.sender.id)
    return { ok: true }
  })

  ipcMain.handle('overlay:cancel', () => {
    closeAllOverlays()
    return { ok: true }
  })

  ipcMain.handle('editor:copy', (_event, dataUrl: string, background?: unknown) => {
    try {
      const image = nativeImage.createFromDataURL(dataUrl)
      clipboard.writeImage(image)
      const settings = ctx.store.load()
      const reditCtx = getReditContext()
      if (reditCtx) {
        // Consome ANTES de closeAllOverlays para que o closed event não chame showGallery.
        clearReditContext()
        closeAllOverlays()
        updateGalleryItem(reditCtx.galleryIndex, dataUrl)
      } else {
        closeAllOverlays()
        ctx.session?.addCapture(dataUrl, pageBackground(background)?.id)
      }
      notify(settings, 'ArcanShot', 'Captura copiada para o clipboard')
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  // Diferente de `editor:copy`, NÃO fecha o overlay — o usuário segue anotando (RN-04).
  ipcMain.handle('editor:copy-color', (_event, hex: string) => {
    if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
      return { ok: false, error: 'Cor inválida' }
    }
    const value = hex.toUpperCase()
    try {
      clipboard.writeText(value)
      notify(ctx.store.load(), 'ArcanShot', `Cor ${value} copiada`)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('editor:save', (_event, dataUrl: string, background?: unknown) => {
    const settings = ctx.store.load()
    let buffer: Buffer
    try {
      buffer = dataUrlToBuffer(dataUrl)
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
    const result = saveCapture(buffer, {
      saveDir: settings.saveDir,
      filenamePattern: settings.filenamePattern,
      imageFormat: settings.imageFormat
    })
    if (!result.ok) {
      notify(settings, 'ArcanShot', `Não foi possível salvar: ${result.error}`)
      return result  // overlay fica aberto; reditContext não consumido
    }
    if (settings.copyOnSave) {
      clipboard.writeImage(nativeImage.createFromDataURL(dataUrl))
    }
    const reditCtx = getReditContext()
    if (reditCtx) {
      clearReditContext()
      closeAllOverlays()
      updateGalleryItem(reditCtx.galleryIndex, dataUrl)
    } else {
      closeAllOverlays()
      ctx.session?.addCapture(dataUrl, pageBackground(background)?.id)
    }
    notify(settings, 'ArcanShot', `Salvo em ${result.filePath}`)
    return result
  })

  ipcMain.handle('editor:save-as', async (event, dataUrl: string, background?: unknown) => {
    const settings = ctx.store.load()
    const win = BrowserWindow.fromWebContents(event.sender)
    const defaultName = `${formatFilename(settings.filenamePattern, new Date())}.${settings.imageFormat}`
    const dialogResult = await dialog.showSaveDialog(win!, {
      title: 'Salvar captura como',
      defaultPath: defaultName,
      filters: [
        { name: 'Imagem PNG', extensions: ['png'] },
        { name: 'Imagem JPG', extensions: ['jpg'] }
      ]
    })
    if (dialogResult.canceled || !dialogResult.filePath) return { ok: true }
    let buffer: Buffer
    try {
      buffer = dataUrlToBuffer(dataUrl)
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
    const result = saveToPath(buffer, dialogResult.filePath)
    if (result.ok) {
      if (settings.copyOnSave) {
        clipboard.writeImage(nativeImage.createFromDataURL(dataUrl))
      }
      const reditCtx = getReditContext()
      if (reditCtx) {
        clearReditContext()
        closeAllOverlays()
        updateGalleryItem(reditCtx.galleryIndex, dataUrl)
      } else {
        closeAllOverlays()
        ctx.session?.addCapture(dataUrl, pageBackground(background)?.id)
      }
      notify(settings, 'ArcanShot', `Salvo em ${result.filePath}`)
    } else {
      notify(settings, 'ArcanShot', `Não foi possível salvar: ${result.error}`)
    }
    return result
  })

  ipcMain.handle('app:version', () => app.getVersion())

  // --- Gallery handlers ---

  ipcMain.handle('gallery:init', async () => {
    for (let i = 0; i < 160; i++) {
      const data = getGalleryInitData()
      if (data) return data
      await new Promise<void>((r) => setTimeout(r, 50))
    }
    return null
  })

  ipcMain.handle('gallery:save-all', async () => {
    const data = getGalleryInitData()
    if (!data) return { ok: false, error: 'Galeria sem dados' }

    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Escolher pasta para salvar todas as capturas'
    })
    if (result.canceled || result.filePaths.length === 0) return { ok: true }

    const folder = result.filePaths[0]
    const settings = ctx.store.load()
    const baseName = formatFilename(settings.filenamePattern, new Date())
    try {
      mkdirSync(folder, { recursive: true })
      for (const item of data.items) {
        const suffix = `_${String(item.index).padStart(3, '0')}`
        const ext = settings.imageFormat
        const filePath = uniquePath(folder, `${baseName}${suffix}`, ext)
        writeFileSync(filePath, dataUrlToBuffer(item.dataUrl))
      }
      return { ok: true, folder }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('gallery:export-pdf', async (_event, options?: { uniformSize?: unknown }) => {
    const data = getGalleryInitData()
    if (!data) return { ok: false, error: 'Galeria sem dados' }

    const settings = ctx.store.load()
    const defaultName = `${formatFilename(settings.filenamePattern, new Date())}.pdf`
    const dialogResult = await dialog.showSaveDialog({
      title: 'Salvar PDF',
      defaultPath: defaultName,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (dialogResult.canceled || !dialogResult.filePath) return { ok: true }

    try {
      // A galeria manda o que está marcado na tela (vale mesmo se a preferência não chegou a
      // ser gravada); qualquer outra coisa vinda do renderer cai no valor salvo.
      const uniformSize =
        typeof options?.uniformSize === 'boolean' ? options.uniformSize : settings.pdfUniformSize
      const pdfBuffer = await buildPdf(
        data.items.map((i) => ({ dataUrl: i.dataUrl, background: i.background })),
        { uniformSize }
      )
      writeFileSync(dialogResult.filePath, pdfBuffer)
      return { ok: true, filePath: dialogResult.filePath }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  // Drag síncrono: sendSync bloqueia o renderer durante o gesto de drag,
  // garantindo que startDrag seja chamado enquanto o evento nativo ainda está ativo.
  ipcMain.on('gallery:drag-items-sync', (event, indices: number[]) => {
    const files = (indices as number[])
      .map((i) => getTempFilePath(i))
      .filter((p): p is string => p !== null)
    if (files.length > 0) {
      try {
        event.sender.startDrag({ file: files[0], files, icon: nativeImage.createEmpty() })
      } catch {
        // best-effort — startDrag pode falhar se o gesto já terminou
      }
    }
    event.returnValue = { ok: files.length > 0 }
  })

  ipcMain.handle('gallery:edit-item', (_event, index: number) => {
    const data = getGalleryInitData()
    if (!data) return { ok: false }
    const item = data.items.find((i) => i.index === index)
    if (!item) return { ok: false }
    startGalleryEdit(index, item.dataUrl, data.settings)
    return { ok: true }
  })

  ipcMain.handle('gallery:close', () => {
    closeGallery()
  })
}

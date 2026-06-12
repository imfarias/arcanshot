import { BrowserWindow, Notification, app, clipboard, dialog, ipcMain, nativeImage } from 'electron'
import type { CaptureMode, AppSettings } from '@shared/types'
import { validateSettings } from '@shared/settings'
import { formatFilename } from '@shared/filenamePattern'
import { SettingsStore } from './settingsStore'
import { dataUrlToBuffer, saveCapture, saveToPath } from './saveImage'
import { closeAllOverlays, closeOtherOverlays, getInitData, startCapture } from './overlay'

export interface IpcContext {
  store: SettingsStore
  /** Reaplica efeitos colaterais (hotkeys, autostart) após salvar settings. */
  applySettings: (settings: AppSettings) => void
  openSettingsWindow: () => void
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

  ipcMain.handle('overlay:init', (event) => {
    return getInitData(event.sender.id) ?? null
  })

  ipcMain.handle('overlay:begin-edit', (event) => {
    closeOtherOverlays(event.sender.id)
    return { ok: true }
  })

  ipcMain.handle('overlay:cancel', () => {
    closeAllOverlays()
    return { ok: true }
  })

  ipcMain.handle('editor:copy', (_event, dataUrl: string) => {
    try {
      const image = nativeImage.createFromDataURL(dataUrl)
      clipboard.writeImage(image)
      const settings = ctx.store.load()
      closeAllOverlays()
      notify(settings, 'ArcanShot', 'Captura copiada para o clipboard')
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('editor:save', (_event, dataUrl: string) => {
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
      // 5g: overlay permanece aberto; usuário pode tentar "Salvar como"
      notify(settings, 'ArcanShot', `Não foi possível salvar: ${result.error}`)
      return result
    }
    if (settings.copyOnSave) {
      clipboard.writeImage(nativeImage.createFromDataURL(dataUrl))
    }
    closeAllOverlays()
    notify(settings, 'ArcanShot', `Salvo em ${result.filePath}`)
    return result
  })

  ipcMain.handle('editor:save-as', async (event, dataUrl: string) => {
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
      closeAllOverlays()
      notify(settings, 'ArcanShot', `Salvo em ${result.filePath}`)
    } else {
      notify(settings, 'ArcanShot', `Não foi possível salvar: ${result.error}`)
    }
    return result
  })

  ipcMain.handle('app:version', () => app.getVersion())
}

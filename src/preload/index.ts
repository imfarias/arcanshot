import { contextBridge, ipcRenderer } from 'electron'
import type { AppSettings, ArcanshotApi, CaptureMode } from '@shared/types'

const api: ArcanshotApi = {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (partial: Partial<AppSettings>) => ipcRenderer.invoke('settings:save', partial),
  pickDirectory: () => ipcRenderer.invoke('settings:pick-dir'),
  startCapture: (mode: CaptureMode) => ipcRenderer.invoke('capture:start', mode),
  overlayInit: () => ipcRenderer.invoke('overlay:init'),
  beginEdit: () => ipcRenderer.invoke('overlay:begin-edit'),
  cancelOverlay: () => ipcRenderer.invoke('overlay:cancel'),
  copyImage: (dataUrl: string) => ipcRenderer.invoke('editor:copy', dataUrl),
  copyColor: (hex: string) => ipcRenderer.invoke('editor:copy-color', hex),
  saveImage: (dataUrl: string) => ipcRenderer.invoke('editor:save', dataUrl),
  saveImageAs: (dataUrl: string) => ipcRenderer.invoke('editor:save-as', dataUrl),
  getVersion: () => ipcRenderer.invoke('app:version'),
  galleryInit: () => ipcRenderer.invoke('gallery:init'),
  gallerySaveAll: () => ipcRenderer.invoke('gallery:save-all'),
  galleryExportPdf: () => ipcRenderer.invoke('gallery:export-pdf'),
  // sendSync garante que startDrag é chamado durante o gesto de drag (sincrono)
  galleryDragItems: (indices: number[]) =>
    ipcRenderer.sendSync('gallery:drag-items-sync', indices) as { ok: boolean },
  galleryEditItem: (index: number) => ipcRenderer.invoke('gallery:edit-item', index),
  galleryClose: () => ipcRenderer.invoke('gallery:close'),
  onGalleryRefresh: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('gallery:refresh', listener)
    return () => {
      ipcRenderer.removeListener('gallery:refresh', listener)
    }
  }
}

contextBridge.exposeInMainWorld('arcanshot', api)

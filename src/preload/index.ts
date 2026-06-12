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
  saveImage: (dataUrl: string) => ipcRenderer.invoke('editor:save', dataUrl),
  saveImageAs: (dataUrl: string) => ipcRenderer.invoke('editor:save-as', dataUrl),
  getVersion: () => ipcRenderer.invoke('app:version')
}

contextBridge.exposeInMainWorld('arcanshot', api)

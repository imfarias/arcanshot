export type CaptureMode = 'area' | 'full' | 'all'

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface AppSettings {
  saveDir: string
  filenamePattern: string
  imageFormat: 'png' | 'jpg'
  jpgQuality: number
  hotkeyArea: string
  hotkeyFull: string
  hotkeyAll: string
  launchOnStartup: boolean
  copyOnSave: boolean
  showNotifications: boolean
}

export interface DisplayCapture {
  displayId: number
  /** bounds em DIP (coordenadas do Electron) */
  bounds: Rect
  scaleFactor: number
  /** PNG em resolução física */
  dataUrl: string
}

export interface OverlayInitData {
  mode: CaptureMode
  displays: DisplayCapture[]
  settings: AppSettings
}

export type ToolId =
  | 'select'
  | 'rect'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'highlight'
  | 'blur'
  | 'text'
  | 'step'

export type ShapeTool = 'rect' | 'ellipse' | 'arrow' | 'line' | 'highlight'

export type Annotation =
  | { kind: 'shape'; tool: ShapeTool; start: Point; end: Point; color: string; strokeWidth: number }
  | { kind: 'blur'; rect: Rect }
  | { kind: 'text'; x: number; y: number; text: string; color: string; fontSize: number }
  | { kind: 'step'; x: number; y: number; n: number; color: string }

export type FieldErrors = Partial<Record<keyof AppSettings, string>>

export interface SaveResult {
  ok: boolean
  filePath?: string
  error?: string
}

export interface ArcanshotApi {
  getSettings(): Promise<AppSettings>
  saveSettings(
    partial: Partial<AppSettings>
  ): Promise<{ ok: true; settings: AppSettings } | { ok: false; fieldErrors: FieldErrors }>
  pickDirectory(): Promise<{ ok: boolean; path?: string }>
  startCapture(mode: CaptureMode): Promise<{ ok: boolean }>
  overlayInit(): Promise<OverlayInitData>
  beginEdit(): Promise<{ ok: boolean }>
  cancelOverlay(): Promise<{ ok: boolean }>
  copyImage(dataUrl: string): Promise<{ ok: boolean }>
  saveImage(dataUrl: string): Promise<SaveResult>
  saveImageAs(dataUrl: string): Promise<SaveResult>
  getVersion(): Promise<string>
}

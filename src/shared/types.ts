export type CaptureMode = 'area' | 'full' | 'all' | 'redit'

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
  sequenceTimeoutSec: number
  /** Acabamento aplicado na exportação (feature 0008). Nasce desligado — RN-22. */
  beautifyEnabled: boolean
  /** Id de preset em `shared/beautify.ts`. */
  beautifyBackground: string
  /** Margem em % da menor dimensão da captura (0–20) — proporcional, RN-17. */
  beautifyPadding: number
  beautifyRounded: boolean
  beautifyShadow: boolean
  /** Ao iniciar (e a cada 24 h), confere as Releases do GitHub e avisa se há versão nova. */
  updateCheckOnStartup: boolean
  /** Baixa a versão nova em segundo plano e instala ao sair do app. */
  updateAutoInstall: boolean
}

export interface DisplayInfo {
  id: number
  /** bounds em DIP (coordenadas do Electron) */
  bounds: Rect
  scaleFactor: number
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

export interface GalleryItem {
  index: number
  dataUrl: string
}

export interface GalleryInitData {
  items: GalleryItem[]
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
  | 'redact'
  | 'pencil'
  | 'text'
  | 'step'
  | 'eyedropper'

export type ShapeTool = 'rect' | 'ellipse' | 'arrow' | 'line' | 'highlight'

export type Annotation =
  | { kind: 'shape'; tool: ShapeTool; start: Point; end: Point; color: string; strokeWidth: number }
  | { kind: 'blur'; rect: Rect }
  /** Tarja opaca: cobre a região de forma irreversível na imagem exportada (RN-11). */
  | { kind: 'redact'; rect: Rect; color: string }
  /** Traço à mão livre: sequência de pontos suavizada no render (RN-08). */
  | { kind: 'freehand'; points: Point[]; color: string; strokeWidth: number }
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
  /** Copia uma cor `#RRGGBB` como texto. Não fecha o overlay. */
  copyColor(hex: string): Promise<{ ok: boolean; error?: string }>
  saveImage(dataUrl: string): Promise<SaveResult>
  saveImageAs(dataUrl: string): Promise<SaveResult>
  getVersion(): Promise<string>
  galleryInit(): Promise<GalleryInitData>
  gallerySaveAll(): Promise<{ ok: boolean; folder?: string; error?: string }>
  galleryExportPdf(): Promise<{ ok: boolean; filePath?: string; error?: string }>
  galleryDragItems(indices: number[]): { ok: boolean }
  galleryEditItem(index: number): Promise<{ ok: boolean }>
  galleryClose(): Promise<void>
  onGalleryRefresh(callback: () => void): () => void
}

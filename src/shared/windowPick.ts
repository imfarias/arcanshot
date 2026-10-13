import type { Point, Rect, WindowInfo } from './types'

// Captura de janela por Ctrl+clique (0011). Tudo aqui é puro: a lista bruta vem do Windows
// (src/main/windowList.ts) e o hit-test roda no editor.

/** Janela como o Windows a descreve: retângulo em pixels físicos da tela virtual. */
export interface RawWindow {
  handle: number
  title: string
  className: string
  /** Estilos estendidos (`GWL_EXSTYLE`), sem sinal. */
  exStyle: number
  rect: Rect
}

const WS_EX_TRANSPARENT = 0x00000020
const WS_EX_TOOLWINDOW = 0x00000080
const WS_EX_LAYERED = 0x00080000
const WS_EX_NOACTIVATE = 0x08000000

/** Classes que não são "um aplicativo": área de trabalho e barras de tarefas. */
const SHELL_CLASSES = new Set(['Progman', 'WorkerW', 'Shell_TrayWnd', 'Shell_SecondaryTrayWnd'])

/** Janela menor que isso (px físicos) não é alvo de captura: é ruído (ícone de bandeja, helper). */
export const MIN_WINDOW_PX = 40

function intersect(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  const r = Math.min(a.x + a.width, b.x + b.width)
  const bt = Math.min(a.y + a.height, b.y + b.height)
  return r > x && bt > y ? { x, y, width: r - x, height: bt - y } : null
}

/**
 * Janelas que valem como alvo, na ordem recebida (de cima para baixo no empilhamento).
 * Fica de fora: as do próprio overlay, sem título, área de trabalho/barra de tarefas, janelas
 * de ferramenta, que não ativam (dicas, overlays de jogos) ou que deixam o clique passar.
 * O retângulo é recortado ao que está na tela: uma janela maximizada sai 8 px das bordas.
 */
export function selectCaptureWindows(
  raw: RawWindow[],
  opts: { excludeHandles: ReadonlySet<number>; screens: Rect[] }
): RawWindow[] {
  const out: RawWindow[] = []
  for (const w of raw) {
    if (opts.excludeHandles.has(w.handle)) continue
    if (w.title.trim() === '') continue
    if (SHELL_CLASSES.has(w.className)) continue
    if (w.exStyle & (WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE)) continue
    if (w.exStyle & WS_EX_LAYERED && w.exStyle & WS_EX_TRANSPARENT) continue

    // recorta à tela: pode cruzar monitores, então junta o que cai em cada um
    const parts = opts.screens
      .map((s) => intersect(w.rect, s))
      .filter((r): r is Rect => r !== null)
    if (parts.length === 0) continue
    const left = Math.min(...parts.map((r) => r.x))
    const top = Math.min(...parts.map((r) => r.y))
    const right = Math.max(...parts.map((r) => r.x + r.width))
    const bottom = Math.max(...parts.map((r) => r.y + r.height))
    const rect = { x: left, y: top, width: right - left, height: bottom - top }
    if (rect.width < MIN_WINDOW_PX || rect.height < MIN_WINDOW_PX) continue

    out.push({ ...w, rect })
  }
  return out
}

/** Primeira janela (a de cima) que contém o ponto, ou null. `windows` já vem em ordem de empilhamento. */
export function pickWindowAt<T extends Rect>(windows: readonly T[], p: Point): T | null {
  return (
    windows.find(
      (w) => p.x >= w.x && p.x < w.x + w.width && p.y >= w.y && p.y < w.y + w.height
    ) ?? null
  )
}

/** Janela em DIP (coordenadas do desktop) → retângulo na imagem da captura, em px inteiros. */
export function windowToImageRect(w: Rect, origin: Point, scale: number): Rect {
  const x = Math.round((w.x - origin.x) * scale)
  const y = Math.round((w.y - origin.y) * scale)
  const r = Math.round((w.x + w.width - origin.x) * scale)
  const b = Math.round((w.y + w.height - origin.y) * scale)
  return { x, y, width: r - x, height: b - y }
}

/** Janela do editor: o retângulo já em px da imagem e o título. */
export type ImageWindow = Rect & { title: string }

export function toImageWindows(
  windows: readonly WindowInfo[],
  origin: Point,
  scale: number
): ImageWindow[] {
  return windows.map((w) => ({ ...windowToImageRect(w, origin, scale), title: w.title }))
}

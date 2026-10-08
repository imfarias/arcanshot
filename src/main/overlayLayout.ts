import type { CaptureMode, DisplayCapture, DisplayInfo, Rect } from '@shared/types'
import { unionRect } from '@shared/geometry'

export interface OverlayWindowPlan {
  bounds: Rect
  /** `null` = a janela recebe TODAS as capturas e as compõe num canvas único. */
  displayId: number | null
}

export interface OverlayPlanContext {
  /** Display sob o cursor — relevante apenas no modo `full`. */
  cursorDisplayId: number | null
  /** Display primário — relevante apenas no modo `all`. */
  primaryDisplayId: number | null
}

/**
 * Decide a geometria das janelas de overlay para cada modo de captura.
 *
 * Módulo puro (sem `electron`) de propósito: `overlay.ts` depende de `BrowserWindow`
 * e por isso é excluído da cobertura — a regra de geometria fica aqui, testável.
 *
 * No modo `area` a janela é uma só, cobrindo a união de todos os displays: um gesto de
 * mouse pertence a uma única janela, então essa é a condição para que a seleção
 * atravesse monitores (decisão #8 do ARCHITECTURE.md).
 */
export function planOverlayWindows(
  mode: CaptureMode,
  displays: DisplayInfo[],
  ctx: OverlayPlanContext
): OverlayWindowPlan[] {
  if (displays.length === 0) return []

  if (mode === 'area') {
    return [{ bounds: unionRect(displays.map((d) => d.bounds)), displayId: null }]
  }

  if (mode === 'full') {
    const target = displays.find((d) => d.id === ctx.cursorDisplayId) ?? displays[0]
    return [{ bounds: target.bounds, displayId: target.id }]
  }

  if (mode === 'all') {
    const target = displays.find((d) => d.id === ctx.primaryDisplayId) ?? displays[0]
    return [{ bounds: target.bounds, displayId: null }]
  }

  // mode === 'redit': a janela é criada pela galeria, não por startCapture.
  return []
}

/**
 * Capturas que uma janela de overlay deve receber.
 * `displayId === null` significa composição (todas as capturas, na ordem dos displays).
 * O fallback para a primeira captura cobre cache de displays desatualizado (feature 0004).
 */
export function pickCapturesForWindow(
  captures: DisplayCapture[],
  displayId: number | null
): DisplayCapture[] {
  if (displayId === null) return captures
  const match = captures.find((c) => c.displayId === displayId) ?? captures[0]
  return match ? [match] : []
}

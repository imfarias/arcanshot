import type { Point, Rect } from './types'

/** Retângulo normalizado a partir de dois pontos de arrasto (qualquer direção). */
export function normalizeRect(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y)
  }
}

export function clampRectToBounds(r: Rect, bounds: Rect): Rect {
  const x = Math.max(bounds.x, Math.min(r.x, bounds.x + bounds.width))
  const y = Math.max(bounds.y, Math.min(r.y, bounds.y + bounds.height))
  const right = Math.max(x, Math.min(r.x + r.width, bounds.x + bounds.width))
  const bottom = Math.max(y, Math.min(r.y + r.height, bounds.y + bounds.height))
  return { x, y, width: right - x, height: bottom - y }
}

export function scaleRect(r: Rect, factor: number): Rect {
  return {
    x: Math.round(r.x * factor),
    y: Math.round(r.y * factor),
    width: Math.round(r.width * factor),
    height: Math.round(r.height * factor)
  }
}

export function rectContains(r: Rect, p: Point): boolean {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height
}

export function rectIsMinSize(r: Rect, min: number): boolean {
  return r.width >= min && r.height >= min
}

/** União dos bounds de vários retângulos. */
export function unionRect(rects: Rect[]): Rect {
  if (rects.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
  const x = Math.min(...rects.map((r) => r.x))
  const y = Math.min(...rects.map((r) => r.y))
  const right = Math.max(...rects.map((r) => r.x + r.width))
  const bottom = Math.max(...rects.map((r) => r.y + r.height))
  return { x, y, width: right - x, height: bottom - y }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

/**
 * RN-05: escala do canvas composto — a maior entre os displays envolvidos.
 * Preserva a nitidez do monitor de maior DPI; os demais são ampliados.
 */
export function pickCompositeScale(scaleFactors: number[]): number {
  if (scaleFactors.length === 0) return 1
  return Math.max(...scaleFactors)
}

/**
 * RN-03: retângulo de destino de um display dentro do canvas composto,
 * em pixels de imagem, com origem no canto superior esquerdo da união.
 */
export function displayDestRect(bounds: Rect, union: Rect, scale: number): Rect {
  return {
    x: Math.round((bounds.x - union.x) * scale),
    y: Math.round((bounds.y - union.y) * scale),
    width: Math.round(bounds.width * scale),
    height: Math.round(bounds.height * scale)
  }
}

/**
 * Converte um retângulo em DIP (coordenadas do Electron) para o espaço CSS do
 * overlay, cuja origem é o canto superior esquerdo da união dos displays.
 */
export function dipRectToOverlayCss(bounds: Rect, union: Rect, cssPerDip: number): Rect {
  return {
    x: (bounds.x - union.x) * cssPerDip,
    y: (bounds.y - union.y) * cssPerDip,
    width: bounds.width * cssPerDip,
    height: bounds.height * cssPerDip
  }
}

export function rectIntersectionArea(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  if (w <= 0 || h <= 0) return 0
  return w * h
}

/**
 * RN-10: viewport (monitor) de maior interseção com o retângulo.
 * Sem interseção com nenhum — seleção inteiramente em região vazia — cai no primeiro.
 */
export function findViewportFor(rect: Rect, viewports: Rect[]): Rect {
  let best = viewports[0]
  let bestArea = -1
  for (const vp of viewports) {
    const area = rectIntersectionArea(rect, vp)
    if (area > bestArea) {
      bestArea = area
      best = vp
    }
  }
  return best
}

/**
 * RN-03 (0008): posiciona um painel flutuante junto ao cursor sem sair da área visível
 * e sem cobrir o próprio cursor. Tenta abaixo-à-direita; espelha o eixo que estourar.
 */
export function placeNearCursor(
  cursor: Point,
  size: { width: number; height: number },
  offset: number,
  viewport: { width: number; height: number }
): Point {
  let x = cursor.x + offset
  let y = cursor.y + offset
  if (x + size.width > viewport.width) x = cursor.x - offset - size.width
  if (y + size.height > viewport.height) y = cursor.y - offset - size.height
  return {
    x: clamp(x, 0, Math.max(0, viewport.width - size.width)),
    y: clamp(y, 0, Math.max(0, viewport.height - size.height))
  }
}

/**
 * RN-10: canto superior esquerdo da toolbar, sempre inteiramente dentro de um
 * monitor real. Preferência: abaixo da seleção, senão acima, senão dentro dela.
 * Quando o monitor é menor que a toolbar, degrada para a borda do monitor.
 */
export function placeToolbar(
  selection: Rect,
  size: { width: number; height: number },
  viewports: Rect[],
  gap: number
): Point {
  const vp = findViewportFor(selection, viewports)
  if (!vp) return { x: selection.x, y: selection.y }

  const maxTop = Math.max(vp.y, vp.y + vp.height - size.height)
  const below = selection.y + selection.height + gap
  const above = selection.y - gap - size.height

  let top: number
  if (below + size.height <= vp.y + vp.height) {
    top = below
  } else if (above >= vp.y) {
    top = above
  } else {
    top = clamp(selection.y + gap, vp.y, maxTop)
  }

  const maxLeft = Math.max(vp.x, vp.x + vp.width - size.width)
  return { x: clamp(selection.x, vp.x, maxLeft), y: clamp(top, vp.y, maxTop) }
}

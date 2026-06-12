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

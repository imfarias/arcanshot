import { describe, expect, it } from 'vitest'
import {
  clampRectToBounds,
  normalizeRect,
  rectContains,
  rectIsMinSize,
  scaleRect,
  unionRect
} from '@shared/geometry'

describe('normalizeRect (CT-UN-04)', () => {
  it.each([
    ['SE', { x: 10, y: 10 }, { x: 50, y: 40 }],
    ['NE', { x: 10, y: 40 }, { x: 50, y: 10 }],
    ['SW', { x: 50, y: 10 }, { x: 10, y: 40 }],
    ['NW', { x: 50, y: 40 }, { x: 10, y: 10 }]
  ])('arrasto na direção %s normaliza', (_dir, a, b) => {
    expect(normalizeRect(a, b)).toEqual({ x: 10, y: 10, width: 40, height: 30 })
  })

  it('pontos iguais geram retângulo zero', () => {
    expect(normalizeRect({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual({
      x: 5,
      y: 5,
      width: 0,
      height: 0
    })
  })
})

describe('clampRectToBounds e scaleRect (CT-UN-05)', () => {
  const bounds = { x: 0, y: 0, width: 100, height: 100 }

  it('recorta retângulo que extrapola os limites', () => {
    expect(clampRectToBounds({ x: -10, y: 50, width: 30, height: 100 }, bounds)).toEqual({
      x: 0,
      y: 50,
      width: 20,
      height: 50
    })
  })

  it('retângulo interno fica intacto', () => {
    const r = { x: 10, y: 10, width: 20, height: 20 }
    expect(clampRectToBounds(r, bounds)).toEqual(r)
  })

  it.each([1, 1.5, 2])('conversão DIP↔físico com scale %s', (scale) => {
    const r = { x: 10, y: 20, width: 100, height: 50 }
    const scaled = scaleRect(r, scale)
    expect(scaled).toEqual({
      x: Math.round(10 * scale),
      y: Math.round(20 * scale),
      width: Math.round(100 * scale),
      height: Math.round(50 * scale)
    })
  })
})

describe('rectContains / rectIsMinSize / unionRect', () => {
  it('rectContains inclui as bordas', () => {
    const r = { x: 0, y: 0, width: 10, height: 10 }
    expect(rectContains(r, { x: 0, y: 0 })).toBe(true)
    expect(rectContains(r, { x: 10, y: 10 })).toBe(true)
    expect(rectContains(r, { x: 11, y: 5 })).toBe(false)
  })

  it('rectIsMinSize exige ambos os lados (RN9)', () => {
    expect(rectIsMinSize({ x: 0, y: 0, width: 4, height: 4 }, 4)).toBe(true)
    expect(rectIsMinSize({ x: 0, y: 0, width: 3, height: 10 }, 4)).toBe(false)
  })

  it('unionRect cobre disposições com offset negativo (multi-monitor)', () => {
    const union = unionRect([
      { x: -1920, y: 0, width: 1920, height: 1080 },
      { x: 0, y: 0, width: 2560, height: 1440 }
    ])
    expect(union).toEqual({ x: -1920, y: 0, width: 4480, height: 1440 })
  })
})

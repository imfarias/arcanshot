import { describe, expect, it } from 'vitest'
import {
  clampRectToBounds,
  dipRectToOverlayCss,
  displayDestRect,
  findViewportFor,
  normalizeRect,
  pickCompositeScale,
  placeNearCursor,
  placeToolbar,
  rectContains,
  rectIntersectionArea,
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

// ---------------------------------------------------------------------------
// Feature 0007 — seleção de área atravessando múltiplos monitores
// ---------------------------------------------------------------------------

describe('pickCompositeScale (CT-UN-20, CT-UN-21)', () => {
  it('CT-UN-20: retorna a maior escala entre os displays (RN-05)', () => {
    expect(pickCompositeScale([1, 1.5, 1.25])).toBe(1.5)
    expect(pickCompositeScale([2])).toBe(2)
  })

  it('CT-UN-21: lista vazia retorna 1', () => {
    expect(pickCompositeScale([])).toBe(1)
  })
})

describe('displayDestRect (CT-UN-22 a CT-UN-24)', () => {
  const union = { x: 0, y: 0, width: 3840, height: 1080 }

  it('CT-UN-22: display na origem da união fica na origem do canvas', () => {
    expect(displayDestRect({ x: 0, y: 0, width: 1920, height: 1080 }, union, 1)).toEqual({
      x: 0,
      y: 0,
      width: 1920,
      height: 1080
    })
  })

  it('CT-UN-23: display secundário é deslocado pela distância real vezes a escala (RN-03)', () => {
    const bigUnion = { x: 0, y: 0, width: 3840, height: 1440 }
    expect(displayDestRect({ x: 1920, y: 0, width: 1920, height: 1080 }, bigUnion, 1.5)).toEqual({
      x: 2880,
      y: 0,
      width: 2880,
      height: 1620
    })
  })

  it('CT-UN-24: união com origem negativa gera coordenadas não-negativas', () => {
    const negUnion = { x: -1920, y: -200, width: 3840, height: 1280 }
    expect(displayDestRect({ x: -1920, y: -200, width: 1920, height: 1080 }, negUnion, 1)).toEqual({
      x: 0,
      y: 0,
      width: 1920,
      height: 1080
    })
    expect(displayDestRect({ x: 0, y: 0, width: 1920, height: 1080 }, negUnion, 1)).toEqual({
      x: 1920,
      y: 200,
      width: 1920,
      height: 1080
    })
  })
})

describe('dipRectToOverlayCss (CT-UN-25)', () => {
  it('CT-UN-25: converte bounds em DIP para CSS relativo à origem da união', () => {
    const union = { x: -1920, y: 0, width: 3840, height: 1080 }
    // overlay com 1024 CSS px de largura para 3840 DIP → 0.2666...
    const cssPerDip = 1024 / 3840
    expect(dipRectToOverlayCss({ x: 0, y: 0, width: 1920, height: 1080 }, union, cssPerDip)).toEqual(
      { x: 512, y: 0, width: 512, height: 288 }
    )
  })
})

describe('rectIntersectionArea / findViewportFor (CT-UN-26 a CT-UN-28)', () => {
  const left = { x: 0, y: 0, width: 100, height: 100 }
  const right = { x: 100, y: 0, width: 100, height: 100 }

  it('CT-UN-26: área zero para disjuntos, área correta para sobrepostos', () => {
    expect(rectIntersectionArea(left, { x: 300, y: 300, width: 10, height: 10 })).toBe(0)
    // encostados sem sobreposição real
    expect(rectIntersectionArea(left, right)).toBe(0)
    expect(rectIntersectionArea(left, { x: 50, y: 0, width: 100, height: 40 })).toBe(50 * 40)
  })

  it('CT-UN-27: escolhe o monitor de maior interseção quando a seleção cruza dois', () => {
    // 30 px no monitor esquerdo, 70 px no direito
    const selection = { x: 70, y: 10, width: 100, height: 50 }
    expect(findViewportFor(selection, [left, right])).toBe(right)
  })

  it('CT-UN-28: sem interseção com nenhum monitor cai no primeiro (região vazia, RN-04)', () => {
    const selection = { x: 0, y: 500, width: 40, height: 40 }
    expect(findViewportFor(selection, [left, right])).toBe(left)
  })
})

describe('placeToolbar (CT-UN-29 a CT-UN-35)', () => {
  const size = { width: 760, height: 54 }
  const gap = 10
  const monitor1 = { x: 0, y: 0, width: 1024, height: 600 }
  const monitor2 = { x: 1024, y: 0, width: 1024, height: 600 }
  const both = [monitor1, monitor2]

  it('CT-UN-29: posiciona abaixo da seleção quando há espaço (RN-10)', () => {
    const sel = { x: 100, y: 100, width: 200, height: 200 }
    expect(placeToolbar(sel, size, [monitor1], gap)).toEqual({ x: 100, y: 310 })
  })

  it('CT-UN-30: posiciona acima quando não cabe abaixo dentro do monitor', () => {
    const sel = { x: 100, y: 200, width: 200, height: 380 } // termina em y=580
    expect(placeToolbar(sel, size, [monitor1], gap)).toEqual({ x: 100, y: 136 })
  })

  it('CT-UN-31: posiciona dentro da seleção quando não cabe nem acima nem abaixo', () => {
    const sel = { x: 50, y: 10, width: 900, height: 580 } // ocupa quase todo o monitor
    const pos = placeToolbar(sel, size, [monitor1], gap)
    expect(pos.y).toBe(20)
    expect(pos.y).toBeGreaterThanOrEqual(monitor1.y)
    expect(pos.y + size.height).toBeLessThanOrEqual(monitor1.y + monitor1.height)
  })

  it('CT-UN-32: nunca ultrapassa a borda direita do monitor', () => {
    const sel = { x: 900, y: 100, width: 100, height: 100 }
    const pos = placeToolbar(sel, size, [monitor1], gap)
    expect(pos.x + size.width).toBeLessThanOrEqual(monitor1.x + monitor1.width)
    expect(pos.x).toBe(1024 - 760)
  })

  it('CT-UN-33: nunca ultrapassa a borda esquerda do monitor', () => {
    const sel = { x: -50, y: 100, width: 100, height: 100 }
    expect(placeToolbar(sel, size, [monitor1], gap).x).toBe(0)
  })

  it('CT-UN-34: seleção no monitor 2 posiciona a toolbar dentro do monitor 2', () => {
    const sel = { x: 1500, y: 100, width: 300, height: 100 }
    const pos = placeToolbar(sel, size, both, gap)
    expect(pos.x).toBeGreaterThanOrEqual(monitor2.x)
    expect(pos.x + size.width).toBeLessThanOrEqual(monitor2.x + monitor2.width)
    // x=1500 + 760 estouraria a borda direita (2048) → clampa em 2048-760
    expect(pos).toEqual({ x: 1288, y: 210 })
  })

  it('CT-UN-35: seleção cruzando os dois monitores mantém a toolbar inteira dentro de um', () => {
    const sel = { x: 800, y: 100, width: 800, height: 100 } // 224 no m1, 576 no m2
    const pos = placeToolbar(sel, size, both, gap)
    const host = both.find(
      (m) => pos.x >= m.x && pos.x + size.width <= m.x + m.width
    )
    expect(host).toBe(monitor2)
    expect(pos.y + size.height).toBeLessThanOrEqual(monitor2.y + monitor2.height)
  })

  it('degrada para a borda do monitor quando o monitor é menor que a toolbar', () => {
    const tiny = { x: 0, y: 0, width: 300, height: 40 }
    const sel = { x: 10, y: 10, width: 50, height: 20 }
    const pos = placeToolbar(sel, size, [tiny], gap)
    expect(Number.isFinite(pos.x)).toBe(true)
    expect(pos).toEqual({ x: 0, y: 0 })
  })

  it('lista de viewports vazia não quebra (init ainda não concluído)', () => {
    const sel = { x: 12, y: 34, width: 50, height: 50 }
    expect(placeToolbar(sel, size, [], gap)).toEqual({ x: 12, y: 34 })
  })
})

// ---------------------------------------------------------------------------
// Feature 0008 — posicionamento da lupa
// ---------------------------------------------------------------------------

describe('placeNearCursor (CT-UN-45 a CT-UN-49)', () => {
  const size = { width: 132, height: 166 }
  const offset = 24
  const viewport = { width: 1000, height: 800 }

  it('CT-UN-45: posiciona abaixo-à-direita quando há espaço', () => {
    expect(placeNearCursor({ x: 100, y: 100 }, size, offset, viewport)).toEqual({ x: 124, y: 124 })
  })

  it('CT-UN-46: espelha para a esquerda ao encostar na borda direita', () => {
    const pos = placeNearCursor({ x: 950, y: 100 }, size, offset, viewport)
    expect(pos.x).toBe(950 - offset - size.width)
    expect(pos.x + size.width).toBeLessThanOrEqual(viewport.width)
  })

  it('CT-UN-47: espelha para cima ao encostar na borda inferior', () => {
    const pos = placeNearCursor({ x: 100, y: 760 }, size, offset, viewport)
    expect(pos.y).toBe(760 - offset - size.height)
    expect(pos.y + size.height).toBeLessThanOrEqual(viewport.height)
  })

  it('CT-UN-48: espelha nos dois eixos no canto inferior direito', () => {
    const pos = placeNearCursor({ x: 980, y: 780 }, size, offset, viewport)
    expect(pos.x + size.width).toBeLessThanOrEqual(viewport.width)
    expect(pos.y + size.height).toBeLessThanOrEqual(viewport.height)
  })

  it('CT-UN-49: nunca sobrepõe o cursor', () => {
    const cursors = [
      { x: 0, y: 0 },
      { x: 500, y: 400 },
      { x: 999, y: 799 },
      { x: 950, y: 60 }
    ]
    for (const cursor of cursors) {
      const pos = placeNearCursor(cursor, size, offset, viewport)
      const covers =
        cursor.x >= pos.x &&
        cursor.x <= pos.x + size.width &&
        cursor.y >= pos.y &&
        cursor.y <= pos.y + size.height
      expect(covers).toBe(false)
    }
  })

  it('viewport menor que a lupa degrada para a origem sem NaN', () => {
    const pos = placeNearCursor({ x: 10, y: 10 }, size, offset, { width: 50, height: 50 })
    expect(Number.isFinite(pos.x)).toBe(true)
    expect(pos).toEqual({ x: 0, y: 0 })
  })
})

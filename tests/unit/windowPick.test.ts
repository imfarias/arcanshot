import { describe, expect, it } from 'vitest'
import {
  MIN_WINDOW_PX,
  pickWindowAt,
  selectCaptureWindows,
  toImageWindows,
  windowToImageRect
} from '@shared/windowPick'
import type { RawWindow } from '@shared/windowPick'

const SCREEN = { x: 0, y: 0, width: 2560, height: 1440 }

function win(overrides: Partial<RawWindow> = {}): RawWindow {
  return {
    handle: 100,
    title: 'Planilha — Excel',
    className: 'XLMAIN',
    exStyle: 0,
    rect: { x: 100, y: 100, width: 800, height: 600 },
    ...overrides
  }
}

const select = (raw: RawWindow[], exclude: number[] = [], screens = [SCREEN]): RawWindow[] =>
  selectCaptureWindows(raw, { excludeHandles: new Set(exclude), screens })

describe('selectCaptureWindows (0011)', () => {
  it('CT-WP-01: mantém janelas comuns na ordem de empilhamento', () => {
    const out = select([win({ handle: 1, title: 'A' }), win({ handle: 2, title: 'B' })])
    expect(out.map((w) => w.title)).toEqual(['A', 'B'])
  })

  it('CT-WP-02: descarta as janelas excluídas, sem título e as do shell', () => {
    const out = select(
      [
        win({ handle: 1 }),
        win({ handle: 2 }),
        win({ handle: 3, title: '   ' }),
        win({ handle: 4, className: 'Progman', title: 'Program Manager' }),
        win({ handle: 5, className: 'WorkerW', title: 'x' }),
        win({ handle: 6, className: 'Shell_TrayWnd', title: 'x' })
      ],
      [2]
    )
    expect(out.map((w) => w.handle)).toEqual([1])
  })

  it('CT-WP-03: descarta janelas de ferramenta, sem ativação e as que deixam o clique passar', () => {
    const out = select([
      win({ handle: 1 }),
      win({ handle: 2, exStyle: 0x80 }), // WS_EX_TOOLWINDOW
      win({ handle: 3, exStyle: 0x08000000 }), // WS_EX_NOACTIVATE
      win({ handle: 4, exStyle: 0x80000 | 0x20 }), // LAYERED + TRANSPARENT
      win({ handle: 5, exStyle: 0x80000 }) // só LAYERED: janela normal (ex.: apps translúcidos)
    ])
    expect(out.map((w) => w.handle)).toEqual([1, 5])
  })

  it('CT-WP-04: recorta ao que está na tela (janela maximizada sai das bordas)', () => {
    const [w] = select([win({ rect: { x: -8, y: -8, width: 2576, height: 1456 } })])
    expect(w.rect).toEqual(SCREEN)
  })

  it('CT-WP-05: janela inteira fora da tela e janela minúscula são descartadas', () => {
    const out = select([
      win({ handle: 1, rect: { x: 20000, y: 20000, width: 14, height: 14 } }),
      win({ handle: 2, rect: { x: 5000, y: 100, width: 800, height: 600 } }),
      win({ handle: 3, rect: { x: 10, y: 10, width: MIN_WINDOW_PX - 1, height: 200 } }),
      win({ handle: 4, rect: { x: 10, y: 10, width: MIN_WINDOW_PX, height: MIN_WINDOW_PX } })
    ])
    expect(out.map((w) => w.handle)).toEqual([4])
  })

  it('CT-WP-06: janela que cruza dois monitores fica inteira dentro da união', () => {
    const screens = [SCREEN, { x: 2560, y: 0, width: 1920, height: 1080 }]
    const [w] = select([win({ rect: { x: 2000, y: 100, width: 1200, height: 500 } })], [], screens)
    expect(w.rect).toEqual({ x: 2000, y: 100, width: 1200, height: 500 })
  })

  it('CT-WP-07: janela que invade a faixa vazia entre monitores é recortada às telas', () => {
    // segundo monitor mais baixo: abaixo de y=1080 nele não há tela
    const screens = [
      { x: 0, y: 0, width: 1000, height: 1000 },
      { x: 1000, y: 0, width: 1000, height: 500 }
    ]
    const [w] = select([win({ rect: { x: 900, y: 400, width: 400, height: 900 } })], [], screens)
    expect(w.rect.y).toBe(400)
    expect(w.rect.x).toBe(900)
    expect(w.rect.x + w.rect.width).toBeLessThanOrEqual(1300)
    expect(w.rect.y + w.rect.height).toBeLessThanOrEqual(1000)
  })

  it('CT-WP-08: lista vazia ou sem telas devolve vazio', () => {
    expect(select([])).toEqual([])
    expect(select([win()], [], [])).toEqual([])
  })

  it('não altera as janelas recebidas', () => {
    const original = win({ rect: { x: -8, y: -8, width: 2576, height: 1456 } })
    const copy = structuredClone(original)
    select([original])
    expect(original).toEqual(copy)
  })
})

describe('pickWindowAt (0011)', () => {
  const windows = [
    { x: 100, y: 100, width: 200, height: 100, title: 'Cima' },
    { x: 0, y: 0, width: 1000, height: 1000, title: 'Baixo' }
  ]

  it('CT-WP-10: devolve a primeira (a de cima) que contém o ponto', () => {
    expect(pickWindowAt(windows, { x: 150, y: 150 })?.title).toBe('Cima')
    expect(pickWindowAt(windows, { x: 500, y: 500 })?.title).toBe('Baixo')
  })

  it('CT-WP-11: borda esquerda/superior pertence à janela; direita/inferior não', () => {
    expect(pickWindowAt(windows, { x: 100, y: 100 })?.title).toBe('Cima')
    expect(pickWindowAt(windows, { x: 300, y: 150 })?.title).toBe('Baixo')
    expect(pickWindowAt(windows, { x: 150, y: 200 })?.title).toBe('Baixo')
  })

  it('CT-WP-12: ponto fora de todas devolve null; lista vazia também', () => {
    expect(pickWindowAt(windows, { x: 1500, y: 1500 })).toBeNull()
    expect(pickWindowAt([], { x: 0, y: 0 })).toBeNull()
  })
})

describe('windowToImageRect / toImageWindows (0011)', () => {
  it('CT-WP-20: converte DIP do desktop em px da imagem (origem e escala)', () => {
    expect(windowToImageRect({ x: 1000, y: 200, width: 400, height: 300 }, { x: 0, y: 0 }, 2)).toEqual({
      x: 2000,
      y: 400,
      width: 800,
      height: 600
    })
  })

  it('CT-WP-21: respeita a origem da união com monitor à esquerda (x negativo)', () => {
    const r = windowToImageRect({ x: -1500, y: 0, width: 500, height: 400 }, { x: -1920, y: 0 }, 1)
    expect(r).toEqual({ x: 420, y: 0, width: 500, height: 400 })
  })

  it('CT-WP-22: escala fracionária arredonda as bordas, sem acumular erro na largura', () => {
    const r = windowToImageRect({ x: 10, y: 10, width: 101, height: 101 }, { x: 0, y: 0 }, 1.25)
    expect(r).toEqual({ x: 13, y: 13, width: 126, height: 126 })
  })

  it('CT-WP-23: toImageWindows preserva título e ordem', () => {
    const out = toImageWindows(
      [
        { x: 0, y: 0, width: 100, height: 100, title: 'A' },
        { x: 100, y: 0, width: 100, height: 100, title: 'B' }
      ],
      { x: 0, y: 0 },
      2
    )
    expect(out.map((w) => w.title)).toEqual(['A', 'B'])
    expect(out[1]).toMatchObject({ x: 200, width: 200 })
  })
})

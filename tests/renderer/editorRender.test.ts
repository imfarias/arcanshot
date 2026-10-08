// @vitest-environment jsdom
// Render das anotações novas e exportação com acabamento (feature 0008).
// jsdom não implementa canvas 2D: o stub registra as chamadas para que se possa
// afirmar O QUE foi desenhado, não apenas que nada quebrou.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { BeautifyOptions } from '@shared/beautify'
import { exportSelection, renderAnnotations } from '../../src/renderer/overlay/lib/editor'
import { applyBeautify, roundRectPath } from '../../src/renderer/overlay/lib/beautify'
import { annotationFactory } from '../factories/annotationFactory'

interface CtxCall {
  canvas: HTMLCanvasElement
  method: string
  args: unknown[]
  /** Estado das propriedades no momento da chamada. */
  state: Record<string, unknown>
}

let calls: CtxCall[] = []

const TRACKED = [
  'fillStyle',
  'strokeStyle',
  'lineWidth',
  'lineCap',
  'lineJoin',
  'globalAlpha',
  'imageSmoothingEnabled',
  'shadowColor',
  'shadowBlur',
  'shadowOffsetY'
] as const

function makeCtxStub(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const state: Record<string, unknown> = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    imageSmoothingEnabled: true,
    shadowColor: 'rgba(0, 0, 0, 0)',
    shadowBlur: 0,
    shadowOffsetY: 0
  }
  const record =
    (method: string) =>
    (...args: unknown[]): void => {
      calls.push({ canvas, method, args, state: { ...state } })
    }

  const ctx: Record<string, unknown> = {
    canvas,
    save: record('save'),
    restore: record('restore'),
    fillRect: record('fillRect'),
    strokeRect: record('strokeRect'),
    clearRect: record('clearRect'),
    drawImage: record('drawImage'),
    beginPath: record('beginPath'),
    closePath: record('closePath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    quadraticCurveTo: record('quadraticCurveTo'),
    arcTo: record('arcTo'),
    arc: record('arc'),
    ellipse: record('ellipse'),
    stroke: record('stroke'),
    fill: record('fill'),
    clip: record('clip'),
    setLineDash: record('setLineDash'),
    fillText: record('fillText'),
    measureText: () => ({ width: 10 }),
    createLinearGradient: () => ({ addColorStop: (): void => {} })
  }
  for (const prop of TRACKED) {
    Object.defineProperty(ctx, prop, {
      get: () => state[prop],
      set: (v) => {
        state[prop] = v
      }
    })
  }
  return ctx as unknown as CanvasRenderingContext2D
}

const originalGetContext = HTMLCanvasElement.prototype.getContext
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL

function canvasOf(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  return c
}

beforeEach(() => {
  calls = []
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    return makeCtxStub(this)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  HTMLCanvasElement.prototype.toDataURL = function (this: HTMLCanvasElement, type?: string) {
    // codifica dimensões no dataUrl para que os testes possam afirmar o tamanho final
    return `data:${type ?? 'image/png'};w=${this.width};h=${this.height}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
})

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext
  HTMLCanvasElement.prototype.toDataURL = originalToDataURL
})

// ---------------------------------------------------------------------------

describe('renderAnnotations — tarja sólida (CT-RN-01, CT-RN-02)', () => {
  it('CT-RN-01: desenha fillRect com a cor e o retângulo da anotação (RN-11, RN-12)', () => {
    const base = canvasOf(100, 100)
    const ctx = base.getContext('2d')!
    const tarja = annotationFactory.redact({
      rect: { x: 10, y: 20, width: 30, height: 40 },
      color: '#111111'
    })

    renderAnnotations(ctx, base, [tarja])

    const fill = calls.find((c) => c.method === 'fillRect')
    expect(fill).toBeDefined()
    expect(fill!.args).toEqual([10, 20, 30, 40])
    expect(fill!.state.fillStyle).toBe('#111111')
  })

  it('CT-RN-02: não reduz a opacidade — a cobertura é irreversível (RN-11)', () => {
    const base = canvasOf(100, 100)
    const ctx = base.getContext('2d')!

    renderAnnotations(ctx, base, [annotationFactory.redact()])

    const fill = calls.find((c) => c.method === 'fillRect')!
    expect(fill.state.globalAlpha).toBe(1)
  })

  it('contraste com o desfoque: o desfoque redesenha a imagem, a tarja não', () => {
    const base = canvasOf(100, 100)
    const ctx = base.getContext('2d')!

    renderAnnotations(ctx, base, [annotationFactory.redact()])
    const drawsAfterRedact = calls.filter((c) => c.method === 'drawImage').length

    calls = []
    renderAnnotations(ctx, base, [annotationFactory.blur()])
    const drawsAfterBlur = calls.filter((c) => c.method === 'drawImage').length

    expect(drawsAfterRedact).toBe(0)
    expect(drawsAfterBlur).toBeGreaterThan(0)
  })
})

describe('renderAnnotations — traço livre (CT-RN-03, CT-RN-04)', () => {
  it('CT-RN-03: desenha um traço contínuo passando pelos pontos (RN-08)', () => {
    const base = canvasOf(200, 200)
    const ctx = base.getContext('2d')!
    const traco = annotationFactory.freehand({
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 0 },
        { x: 30, y: 10 }
      ]
    })

    renderAnnotations(ctx, base, [traco])

    expect(calls.find((c) => c.method === 'moveTo')!.args).toEqual([0, 0])
    // suavização: curvas quadráticas entre os pontos intermediários
    expect(calls.filter((c) => c.method === 'quadraticCurveTo').length).toBeGreaterThan(0)
    expect(calls.filter((c) => c.method === 'stroke').length).toBe(1)
  })

  it('CT-RN-04: usa espessura da anotação e juntas arredondadas (RN-07)', () => {
    const base = canvasOf(200, 200)
    const ctx = base.getContext('2d')!
    const traco = annotationFactory.freehand({ color: '#ff0000', strokeWidth: 7 })

    renderAnnotations(ctx, base, [traco])

    const stroke = calls.find((c) => c.method === 'stroke')!
    expect(stroke.state.strokeStyle).toBe('#ff0000')
    expect(stroke.state.lineWidth).toBe(7)
    expect(stroke.state.lineCap).toBe('round')
    expect(stroke.state.lineJoin).toBe('round')
  })

  it('traço de um ponto só vira um ponto, sem quebrar', () => {
    const base = canvasOf(200, 200)
    const ctx = base.getContext('2d')!

    expect(() =>
      renderAnnotations(ctx, base, [annotationFactory.freehand({ points: [{ x: 5, y: 5 }] })])
    ).not.toThrow()
    expect(calls.filter((c) => c.method === 'stroke').length).toBe(1)
  })

  it('traço sem pontos não desenha nada', () => {
    const base = canvasOf(200, 200)
    const ctx = base.getContext('2d')!

    renderAnnotations(ctx, base, [annotationFactory.freehand({ points: [] })])
    expect(calls.filter((c) => c.method === 'stroke').length).toBe(0)
  })
})

describe('roundRectPath', () => {
  it('constrói o caminho com arcTo nos quatro cantos', () => {
    const ctx = canvasOf(10, 10).getContext('2d')!
    roundRectPath(ctx, 0, 0, 100, 80, 10)
    expect(calls.filter((c) => c.method === 'arcTo').length).toBe(4)
  })

  it('raio 0 ainda fecha um retângulo válido', () => {
    const ctx = canvasOf(10, 10).getContext('2d')!
    expect(() => roundRectPath(ctx, 0, 0, 100, 80, 0)).not.toThrow()
    expect(calls.some((c) => c.method === 'closePath')).toBe(true)
  })

  it('raio maior que metade do lado é limitado', () => {
    const ctx = canvasOf(10, 10).getContext('2d')!
    roundRectPath(ctx, 0, 0, 20, 20, 999)
    const arc = calls.find((c) => c.method === 'arcTo')!
    // raio limitado a 10 (metade de 20)
    expect(arc.args[4]).toBe(10)
  })
})

describe('applyBeautify (CT-RN-09 a CT-RN-11)', () => {
  const opts: BeautifyOptions = {
    enabled: true,
    background: 'graphite',
    padding: 10,
    rounded: true,
    shadow: true
  }

  it('CT-RN-09: pinta o fundo antes de desenhar a imagem (RN-15)', () => {
    const source = canvasOf(200, 200)
    calls = []

    applyBeautify(source, opts)

    const fillIndex = calls.findIndex((c) => c.method === 'fillRect')
    const drawIndex = calls.findIndex((c) => c.method === 'drawImage')
    expect(fillIndex).toBeGreaterThanOrEqual(0)
    expect(fillIndex).toBeLessThan(drawIndex)
  })

  it('CT-RN-10: fundo `none` não pinta fundo algum (RN-18)', () => {
    const source = canvasOf(200, 200)
    calls = []

    applyBeautify(source, { ...opts, background: 'none' })

    // nenhum fillRect de fundo cobrindo o canvas inteiro
    expect(calls.some((c) => c.method === 'fillRect')).toBe(false)
  })

  it('CT-RN-11: desenha a imagem deslocada pela margem (RN-15)', () => {
    const source = canvasOf(200, 200)
    calls = []

    const out = applyBeautify(source, opts)

    // margem = 10% de 200 = 20
    expect(out.width).toBe(240)
    expect(out.height).toBe(240)
    const draw = calls.find((c) => c.method === 'drawImage')!
    expect(draw.args.slice(1)).toEqual([20, 20])
  })

  it('recorta a imagem pelos cantos arredondados', () => {
    const source = canvasOf(200, 200)
    calls = []
    applyBeautify(source, opts)
    expect(calls.some((c) => c.method === 'clip')).toBe(true)
  })

  it('sombra ligada projeta o caminho antes da imagem', () => {
    const source = canvasOf(200, 200)
    calls = []
    applyBeautify(source, opts)

    const shadowFill = calls.find((c) => c.method === 'fill')
    expect(shadowFill).toBeDefined()
    expect(shadowFill!.state.shadowBlur).toBeGreaterThan(0)
  })

  it('sombra desligada não configura blur', () => {
    const source = canvasOf(200, 200)
    calls = []
    applyBeautify(source, { ...opts, shadow: false })

    expect(calls.every((c) => c.state.shadowBlur === 0)).toBe(true)
  })

  it('fundo em gradiente usa createLinearGradient', () => {
    const source = canvasOf(200, 200)
    calls = []
    const out = applyBeautify(source, { ...opts, background: 'ocean' })
    expect(out.width).toBe(240)
    expect(calls.some((c) => c.method === 'fillRect')).toBe(true)
  })

  it('nunca altera o canvas de origem', () => {
    const source = canvasOf(200, 200)
    const out = applyBeautify(source, opts)
    expect(source.width).toBe(200)
    expect(source.height).toBe(200)
    expect(out).not.toBe(source)
  })
})

describe('exportSelection com acabamento (CT-RN-05 a CT-RN-08)', () => {
  const selection = { x: 0, y: 0, width: 200, height: 200 }

  function base(): HTMLCanvasElement {
    return canvasOf(400, 400)
  }

  it('CT-RN-05: sem o parâmetro produz exatamente o resultado de antes (RN-22)', () => {
    const url = exportSelection(base(), [], selection, 'png', 90)
    expect(url).toBe('data:image/png;w=200;h=200')
  })

  it('CT-RN-06: com acabamento desligado produz o mesmo resultado (RN-22)', () => {
    const off: BeautifyOptions = {
      enabled: false,
      background: 'graphite',
      padding: 10,
      rounded: true,
      shadow: true
    }
    const semParametro = exportSelection(base(), [], selection, 'png', 90)
    const desligado = exportSelection(base(), [], selection, 'png', 90, off)
    expect(desligado).toBe(semParametro)
  })

  it('CT-RN-07: com acabamento ligado o resultado é maior que o recorte (RN-15)', () => {
    const on: BeautifyOptions = {
      enabled: true,
      background: 'graphite',
      padding: 10,
      rounded: true,
      shadow: true
    }
    const url = exportSelection(base(), [], selection, 'png', 90, on)
    expect(url).toBe('data:image/png;w=240;h=240')
  })

  it('CT-RN-08: fundo transparente exporta PNG mesmo com formato jpg (RN-18)', () => {
    const transparente: BeautifyOptions = {
      enabled: true,
      background: 'none',
      padding: 5,
      rounded: true,
      shadow: false
    }
    const url = exportSelection(base(), [], selection, 'jpg', 90, transparente)
    expect(url.startsWith('data:image/png')).toBe(true)
  })

  it('fundo opaco respeita o formato jpg escolhido', () => {
    const opaco: BeautifyOptions = {
      enabled: true,
      background: 'graphite',
      padding: 5,
      rounded: true,
      shadow: false
    }
    const url = exportSelection(base(), [], selection, 'jpg', 90, opaco)
    expect(url.startsWith('data:image/jpeg')).toBe(true)
  })

  it('anotações continuam sendo compostas antes do acabamento', () => {
    const on: BeautifyOptions = {
      enabled: true,
      background: 'graphite',
      padding: 10,
      rounded: false,
      shadow: false
    }
    calls = []
    exportSelection(base(), [annotationFactory.redact()], selection, 'png', 90, on)
    // a tarja é desenhada (fillRect da anotação) e depois vem o acabamento
    expect(calls.filter((c) => c.method === 'fillRect').length).toBeGreaterThanOrEqual(2)
  })
})

// @vitest-environment jsdom
// Lupa + leitura de cor (feature 0008).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Magnifier, MAGNIFIER_SIZE } from '../../src/renderer/overlay/components/Magnifier'

interface CtxCall {
  canvas: HTMLCanvasElement
  method: string
  args: unknown[]
  smoothing: boolean
}

let calls: CtxCall[] = []
/** Cor devolvida por getImageData — cada teste define a sua. */
let pixel = [0, 0, 0, 255]
/** Canvases em que getImageData foi chamado — prova o RNF-02. */
let readCanvases: HTMLCanvasElement[] = []

function makeCtxStub(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const state = { imageSmoothingEnabled: true }
  const record =
    (method: string) =>
    (...args: unknown[]): void => {
      calls.push({ canvas, method, args, smoothing: state.imageSmoothingEnabled })
    }
  const ctx: Record<string, unknown> = {
    canvas,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    drawImage: record('drawImage'),
    clearRect: record('clearRect'),
    strokeRect: record('strokeRect'),
    fillRect: record('fillRect'),
    getImageData: (..._args: unknown[]) => {
      readCanvases.push(canvas)
      return { data: Uint8ClampedArray.from(pixel) }
    }
  }
  Object.defineProperty(ctx, 'imageSmoothingEnabled', {
    get: () => state.imageSmoothingEnabled,
    set: (v: boolean) => {
      state.imageSmoothingEnabled = v
    }
  })
  return ctx as unknown as CanvasRenderingContext2D
}

const originalGetContext = HTMLCanvasElement.prototype.getContext

function sourceCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 1920
  c.height = 1080
  return c
}

const VIEWPORT = { width: 1024, height: 768 }

beforeEach(() => {
  calls = []
  readCanvases = []
  pixel = [0, 0, 0, 255]
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    return makeCtxStub(this)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
})

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext
})

describe('Magnifier (CT-MG-01 a CT-MG-07)', () => {
  it('CT-MG-01: amplia com suavização desligada (RN-02)', () => {
    render(
      <Magnifier
        source={sourceCanvas()}
        point={{ x: 100, y: 100 }}
        cssPerImage={0.5}
        viewport={VIEWPORT}
      />
    )

    const draw = calls.find((c) => c.method === 'drawImage')
    expect(draw).toBeDefined()
    expect(draw!.smoothing).toBe(false)
    // região de origem = tamanho / zoom, centrada no ponto
    expect(draw!.args.slice(5)).toEqual([0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE])
  })

  it('CT-MG-02: exibe as coordenadas do ponto em px de imagem (RN-02)', () => {
    render(
      <Magnifier
        source={sourceCanvas()}
        point={{ x: 640, y: 360 }}
        cssPerImage={0.5}
        viewport={VIEWPORT}
      />
    )
    expect(screen.getByTestId('editor-magnifier-coords').textContent).toBe('640, 360')
  })

  it('CT-MG-03: exibe a cor em #RRGGBB maiúsculo (RN-02)', () => {
    pixel = [0x3b, 0x82, 0xf6, 255]
    render(
      <Magnifier
        source={sourceCanvas()}
        point={{ x: 10, y: 10 }}
        cssPerImage={1}
        viewport={VIEWPORT}
      />
    )
    expect(screen.getByTestId('editor-magnifier-hex').textContent).toBe('#3B82F6')
  })

  it('preenche com zero à esquerda em componentes de um dígito', () => {
    pixel = [1, 2, 3, 255]
    render(
      <Magnifier
        source={sourceCanvas()}
        point={{ x: 10, y: 10 }}
        cssPerImage={1}
        viewport={VIEWPORT}
      />
    )
    expect(screen.getByTestId('editor-magnifier-hex').textContent).toBe('#010203')
  })

  it('CT-MG-04: reporta a cor lida via onColorRead (RN-04)', () => {
    pixel = [0xff, 0x00, 0x00, 255]
    const onColorRead = vi.fn()
    render(
      <Magnifier
        source={sourceCanvas()}
        point={{ x: 10, y: 10 }}
        cssPerImage={1}
        viewport={VIEWPORT}
        onColorRead={onColorRead}
      />
    )
    expect(onColorRead).toHaveBeenCalledWith('#FF0000')
  })

  it('CT-MG-05: lê o pixel do canvas da lupa, nunca do canvas base (RNF-02)', () => {
    const source = sourceCanvas()
    render(
      <Magnifier source={source} point={{ x: 10, y: 10 }} cssPerImage={1} viewport={VIEWPORT} />
    )

    expect(readCanvases.length).toBeGreaterThan(0)
    for (const canvas of readCanvases) {
      expect(canvas).not.toBe(source)
      expect(canvas.width).toBe(MAGNIFIER_SIZE)
    }
  })

  it('CT-MG-06: reposiciona-se ao encostar na borda direita (RN-03)', () => {
    // ponto colado na direita: 1000 px de imagem × 1 = 1000 CSS, viewport 1024
    render(
      <Magnifier
        source={sourceCanvas()}
        point={{ x: 1000, y: 100 }}
        cssPerImage={1}
        viewport={VIEWPORT}
      />
    )
    const el = screen.getByTestId('editor-magnifier')
    const left = Number.parseFloat(el.style.left)
    expect(left + MAGNIFIER_SIZE).toBeLessThanOrEqual(VIEWPORT.width)
    expect(left).toBeLessThan(1000)
  })

  it('CT-MG-07: é decorativa para leitores de tela', () => {
    render(
      <Magnifier source={sourceCanvas()} point={{ x: 10, y: 10 }} cssPerImage={1} viewport={VIEWPORT} />
    )
    expect(screen.getByTestId('editor-magnifier')).toHaveAttribute('aria-hidden', 'true')
  })

  it('sem canvas de origem não quebra', () => {
    expect(() =>
      render(<Magnifier source={null} point={{ x: 10, y: 10 }} cssPerImage={1} viewport={VIEWPORT} />)
    ).not.toThrow()
    expect(screen.getByTestId('editor-magnifier')).toBeInTheDocument()
  })

  it('getImageData que lança não derruba a lupa', () => {
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
      const ctx = makeCtxStub(this) as unknown as Record<string, unknown>
      ctx.getImageData = () => {
        throw new Error('canvas sujo')
      }
      return ctx
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any

    expect(() =>
      render(
        <Magnifier source={sourceCanvas()} point={{ x: 10, y: 10 }} cssPerImage={1} viewport={VIEWPORT} />
      )
    ).not.toThrow()
    expect(screen.getByTestId('editor-magnifier-hex').textContent).toBe('#000000')
  })
})

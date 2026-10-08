// @vitest-environment jsdom
// Componente do overlay de captura — feature 0007 (seleção atravessando monitores).
// jsdom não implementa canvas 2D nem PointerEvent: ambos são stubados na fronteira
// do browser (nunca módulos internos do projeto).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { axe } from 'jest-axe'
import type { DisplayCapture, OverlayInitData } from '@shared/types'
import { Overlay } from '../../src/renderer/overlay/Overlay'
import { settingsFactory } from '../factories/settingsFactory'
import { displayCaptureFactory } from '../factories/displayCaptureFactory'
import { displayInfoFactory } from '../factories/displayInfoFactory'

// ---------------------------------------------------------------------------
// Stubs de fronteira do browser
// ---------------------------------------------------------------------------

interface CtxCall {
  canvas: HTMLCanvasElement
  method: string
  args: unknown[]
}

let ctxCalls: CtxCall[] = []
/** Cor RGBA devolvida por getImageData — define o que a lupa "lê" (feature 0008). */
let pixelColor = [0, 0, 0, 255]

function makeCtxStub(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const record =
    (method: string) =>
    (...args: unknown[]): void => {
      ctxCalls.push({ canvas, method, args })
    }
  return {
    canvas,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
    imageSmoothingEnabled: true,
    fillRect: record('fillRect'),
    strokeRect: record('strokeRect'),
    clearRect: record('clearRect'),
    drawImage: record('drawImage'),
    save: record('save'),
    restore: record('restore'),
    setLineDash: record('setLineDash'),
    beginPath: record('beginPath'),
    closePath: record('closePath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    stroke: record('stroke'),
    fill: record('fill'),
    clip: record('clip'),
    arc: record('arc'),
    arcTo: record('arcTo'),
    ellipse: record('ellipse'),
    quadraticCurveTo: record('quadraticCurveTo'),
    fillText: record('fillText'),
    measureText: () => ({ width: 10 }),
    createLinearGradient: () => ({ addColorStop: (): void => {} }),
    // Cor devolvida à lupa; `pixelColor` é ajustável por teste.
    getImageData: () => ({ data: Uint8ClampedArray.from(pixelColor) })
  } as unknown as CanvasRenderingContext2D
}

function installCanvasStub(): void {
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    return makeCtxStub(this)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

/** Tamanho natural declarado por dataUrl — `Image` do jsdom não decodifica nada. */
const imageSizes = new Map<string, { width: number; height: number }>()

function installImageStub(): void {
  class FakeImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    naturalWidth = 0
    naturalHeight = 0
    private _src = ''
    set src(value: string) {
      this._src = value
      const size = imageSizes.get(value) ?? { width: 1920, height: 1080 }
      this.naturalWidth = size.width
      this.naturalHeight = size.height
      queueMicrotask(() => this.onload?.())
    }
    get src(): string {
      return this._src
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).Image = FakeImage
}

/** jsdom não implementa PointerEvent; MouseEvent carrega clientX/clientY igual. */
function installPointerEventStub(): void {
  const w = window as unknown as Record<string, unknown>
  if (!w.PointerEvent) w.PointerEvent = window.MouseEvent
}

function fakePreload(data: OverlayInitData | null) {
  const api = {
    overlayInit: vi.fn().mockResolvedValue(data),
    beginEdit: vi.fn().mockResolvedValue({ ok: true }),
    cancelOverlay: vi.fn().mockResolvedValue({ ok: true }),
    copyImage: vi.fn().mockResolvedValue({ ok: true }),
    copyColor: vi.fn().mockResolvedValue({ ok: true }),
    saveImage: vi.fn().mockResolvedValue({ ok: true }),
    saveImageAs: vi.fn().mockResolvedValue({ ok: true }),
    getSettings: vi.fn(),
    saveSettings: vi.fn().mockResolvedValue({ ok: true, settings: null }),
    pickDirectory: vi.fn(),
    startCapture: vi.fn(),
    getVersion: vi.fn(),
    galleryInit: vi.fn(),
    gallerySaveAll: vi.fn(),
    galleryExportPdf: vi.fn(),
    galleryDragItems: vi.fn(),
    galleryEditItem: vi.fn(),
    galleryClose: vi.fn(),
    onGalleryRefresh: vi.fn().mockReturnValue(() => {})
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  window.arcanshot = api as any
  return api
}

/** Dois monitores 1920×1080 lado a lado: união 3840×1080, escala 1. */
function dualAreaInit(): { data: OverlayInitData; captures: DisplayCapture[] } {
  const [a, b] = displayInfoFactory.sideBySide()
  const captures = [
    displayCaptureFactory.fromDisplay(a, { dataUrl: 'data:image/png;base64,AAA' }),
    displayCaptureFactory.fromDisplay(b, { dataUrl: 'data:image/png;base64,BBB' })
  ]
  imageSizes.set('data:image/png;base64,AAA', { width: 1920, height: 1080 })
  imageSizes.set('data:image/png;base64,BBB', { width: 1920, height: 1080 })
  return { data: { mode: 'area', displays: captures, settings: settingsFactory() }, captures }
}

/**
 * Aguarda o fim do init assíncrono. A largura inline do canvas só é definida depois
 * que o canvas base existe — condição válida em todos os modos (em `redit` o cursor
 * já nasce 'default', então a classe do cursor não serve como sinal).
 */
async function renderOverlay(data: OverlayInitData) {
  const api = fakePreload(data)
  const view = render(<Overlay />)
  await waitFor(() => {
    const canvas = document.querySelector('.overlay-canvas') as HTMLCanvasElement | null
    expect(canvas?.style.width).toBeTruthy()
  })
  return { api, ...view }
}

/** Chamadas de contexto do canvas base (o primeiro a receber um contexto). */
function baseCalls(): CtxCall[] {
  const baseCanvas = ctxCalls[0]?.canvas
  return ctxCalls.filter((c) => c.canvas === baseCanvas)
}

function drag(from: { x: number; y: number }, to: { x: number; y: number }): void {
  const root = screen.getByTestId('editor-overlay')
  fireEvent.pointerDown(root, { clientX: from.x, clientY: from.y })
  fireEvent.pointerMove(root, { clientX: to.x, clientY: to.y })
  fireEvent.pointerUp(root, { clientX: to.x, clientY: to.y })
}

const originalGetContext = HTMLCanvasElement.prototype.getContext
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL

beforeEach(() => {
  ctxCalls = []
  pixelColor = [0, 0, 0, 255]
  imageSizes.clear()
  installCanvasStub()
  installImageStub()
  installPointerEventStub()
  // jsdom não implementa toDataURL: sem stub, a exportação devolveria vazio e as
  // ações de copiar/salvar nunca seriam disparadas.
  HTMLCanvasElement.prototype.toDataURL = function (this: HTMLCanvasElement, type?: string) {
    return `data:${type ?? 'image/png'};w=${this.width};h=${this.height}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
})

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext
  HTMLCanvasElement.prototype.toDataURL = originalToDataURL
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------

describe('Overlay — composição multi-monitor no modo área', () => {
  it('CT-FC-20: canvas base tem as dimensões da união dos monitores (RN-02, RN-05)', async () => {
    const { data } = dualAreaInit()
    await renderOverlay(data)

    const fill = baseCalls().find((c) => c.method === 'fillRect')
    expect(fill?.args).toEqual([0, 0, 3840, 1080])
  })

  it('CT-FC-20b: DPI misto usa a maior escala entre os monitores (RN-05)', async () => {
    const [a, b] = displayInfoFactory.mixedDpi() // 2560×1440@1.5 + 1920×1080@1
    const captures = [
      displayCaptureFactory.fromDisplay(a, { dataUrl: 'data:image/png;base64,AAA' }),
      displayCaptureFactory.fromDisplay(b, { dataUrl: 'data:image/png;base64,BBB' })
    ]
    await renderOverlay({ mode: 'area', displays: captures, settings: settingsFactory() })

    // união = 4480×1440 DIP; escala 1.5 → 6720×2160
    const fill = baseCalls().find((c) => c.method === 'fillRect')
    expect(fill?.args).toEqual([0, 0, 6720, 2160])
  })

  it('CT-FC-21: preenche o canvas de preto antes de desenhar os displays (RN-04)', async () => {
    const { data } = dualAreaInit()
    await renderOverlay(data)

    const calls = baseCalls()
    const fillIndex = calls.findIndex((c) => c.method === 'fillRect')
    const firstDraw = calls.findIndex((c) => c.method === 'drawImage')
    expect(fillIndex).toBeGreaterThanOrEqual(0)
    expect(fillIndex).toBeLessThan(firstDraw)
  })

  it('CT-FC-22: cada captura é desenhada na posição relativa correta (RN-03)', async () => {
    const { data } = dualAreaInit()
    await renderOverlay(data)

    const draws = baseCalls().filter((c) => c.method === 'drawImage')
    expect(draws).toHaveLength(2)
    expect(draws[0].args.slice(1)).toEqual([0, 0, 1920, 1080])
    expect(draws[1].args.slice(1)).toEqual([1920, 0, 1920, 1080])
  })

  it('CT-FC-29: com uma única captura não há composição (FA-3)', async () => {
    const display = displayInfoFactory({
      bounds: { x: 0, y: 0, width: 2560, height: 1440 },
      scaleFactor: 1
    })
    imageSizes.set('data:image/png;base64,SOLO', { width: 2560, height: 1440 })
    const capture = displayCaptureFactory.fromDisplay(display, {
      dataUrl: 'data:image/png;base64,SOLO'
    })
    await renderOverlay({ mode: 'area', displays: [capture], settings: settingsFactory() })

    const calls = baseCalls()
    const draws = calls.filter((c) => c.method === 'drawImage')
    expect(draws).toHaveLength(1)
    // caminho de captura única: drawImage(img, 0, 0) sem retângulo de destino
    expect(draws[0].args.slice(1)).toEqual([0, 0])
  })
})

describe('Overlay — seleção atravessando monitores', () => {
  it('CT-FC-23: arrasto do monitor 1 ao 2 gera seleção maior que um monitor (RN-01)', async () => {
    const { data } = dualAreaInit()
    await renderOverlay(data)

    // overlay tem 1024 CSS px para 3840 px de imagem → 1 CSS px = 3.75 px de imagem.
    // x=100 → 375 (monitor 1) ; x=900 → 3375 (monitor 2) ; y=50→250 → 187,5→937,5
    drag({ x: 100, y: 50 }, { x: 900, y: 250 })

    const badge = await screen.findByTestId('editor-size-badge')
    expect(badge.textContent).toBe('3000 × 750')
    // 3000 px de largura ultrapassa a largura de um monitor isolado (1920)
    expect(Number(badge.textContent!.split(' × ')[0])).toBeGreaterThan(1920)
  })

  it('CT-FC-24 / CT-FC-25: soltar entra em edição e mostra a toolbar (RN-01)', async () => {
    const { data } = dualAreaInit()
    const { api } = await renderOverlay(data)

    drag({ x: 100, y: 50 }, { x: 900, y: 250 })

    expect(await screen.findByRole('toolbar')).toBeInTheDocument()
    expect(api.beginEdit).toHaveBeenCalledTimes(1)
  })

  it('CT-FC-26: arrasto contido em um monitor continua funcionando (RN-06)', async () => {
    const { data } = dualAreaInit()
    await renderOverlay(data)

    // x de 100 a 300 CSS → 375 a 1125 de imagem: tudo dentro do monitor 1 (largura 1920)
    drag({ x: 100, y: 50 }, { x: 300, y: 250 })

    const badge = await screen.findByTestId('editor-size-badge')
    expect(badge.textContent).toBe('750 × 750')
    expect(await screen.findByRole('toolbar')).toBeInTheDocument()
  })

  it('CT-FC-27: arrasto menor que o mínimo é descartado (FA-5)', async () => {
    const { data } = dualAreaInit()
    const { api } = await renderOverlay(data)

    drag({ x: 100, y: 100 }, { x: 100.2, y: 100.2 })

    expect(api.beginEdit).not.toHaveBeenCalled()
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
  })

  it('CT-FC-28: Esc durante a seleção cancela o overlay (RN-09)', async () => {
    const { data } = dualAreaInit()
    const { api } = await renderOverlay(data)

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(api.cancelOverlay).toHaveBeenCalledTimes(1)
  })
})

describe('Overlay — acessibilidade', () => {
  it('CT-FC-30: sem violações sérias/críticas no modo de edição', async () => {
    const { data } = dualAreaInit()
    const { container } = await renderOverlay(data)

    drag({ x: 100, y: 100 }, { x: 900, y: 400 })
    await screen.findByRole('toolbar')

    expect(await axe(container)).toHaveNoViolations()
  })
})

// ---------------------------------------------------------------------------
// Feature 0008 — lupa, conta-gotas, traço livre, tarja e embelezar
// ---------------------------------------------------------------------------

/** Entra em modo de edição fazendo uma seleção válida. */
async function enterEditMode(): Promise<void> {
  drag({ x: 100, y: 50 }, { x: 500, y: 250 })
  await screen.findByRole('toolbar')
}

function pickTool(id: string): void {
  fireEvent.click(screen.getByTestId(`editor-tool-${id}`))
}

function move(x: number, y: number): void {
  fireEvent.pointerMove(screen.getByTestId('editor-overlay'), { clientX: x, clientY: y })
}

describe('Overlay — lupa e conta-gotas', () => {
  it('CT-FC-40: a lupa aparece durante a seleção de área (RN-01)', async () => {
    const { data } = dualAreaInit()
    await renderOverlay(data)

    expect(screen.queryByTestId('editor-magnifier')).not.toBeInTheDocument()
    move(200, 120)
    expect(await screen.findByTestId('editor-magnifier')).toBeInTheDocument()
  })

  it('CT-FC-41: a lupa some ao entrar em edição (RN-01)', async () => {
    const { data } = dualAreaInit()
    await renderOverlay(data)

    move(200, 120)
    expect(screen.getByTestId('editor-magnifier')).toBeInTheDocument()

    await enterEditMode()
    expect(screen.queryByTestId('editor-magnifier')).not.toBeInTheDocument()
  })

  it('CT-FC-42: a lupa reaparece ao ativar o conta-gotas (RN-01)', async () => {
    const { data } = dualAreaInit()
    await renderOverlay(data)
    await enterEditMode()

    pickTool('eyedropper')
    move(220, 130)

    expect(await screen.findByTestId('editor-magnifier')).toBeInTheDocument()
  })

  it('CT-FC-43: clicar com o conta-gotas copia o hexadecimal lido (RN-04)', async () => {
    const { data } = dualAreaInit()
    const { api } = await renderOverlay(data)
    await enterEditMode()

    pixelColor = [0x3b, 0x82, 0xf6, 255]
    pickTool('eyedropper')
    move(220, 130)
    await screen.findByTestId('editor-magnifier')

    fireEvent.pointerDown(screen.getByTestId('editor-overlay'), { clientX: 220, clientY: 130 })

    expect(api.copyColor).toHaveBeenCalledWith('#3B82F6')
  })

  it('CT-FC-44: o conta-gotas não cria anotação (RN-05)', async () => {
    const { data } = dualAreaInit()
    await renderOverlay(data)
    await enterEditMode()

    pickTool('eyedropper')
    move(220, 130)
    await screen.findByTestId('editor-magnifier')

    const root = screen.getByTestId('editor-overlay')
    fireEvent.pointerDown(root, { clientX: 220, clientY: 130 })
    fireEvent.pointerMove(root, { clientX: 300, clientY: 200 })
    fireEvent.pointerUp(root, { clientX: 300, clientY: 200 })

    // nada a desfazer ⇒ nenhuma anotação foi criada
    expect(screen.getByTestId('editor-undo')).toBeDisabled()
  })

  it('CT-FC-45: a cor lida passa a ser a cor ativa das anotações (RN-04)', async () => {
    const { data } = dualAreaInit()
    await renderOverlay(data)
    await enterEditMode()

    pixelColor = [0xff, 0x00, 0x00, 255]
    pickTool('eyedropper')
    move(220, 130)
    await screen.findByTestId('editor-magnifier')
    fireEvent.pointerDown(screen.getByTestId('editor-overlay'), { clientX: 220, clientY: 130 })

    const custom = screen.getByTestId('editor-color-custom') as HTMLInputElement
    expect(custom.value).toBe('#ff0000')
  })
})

describe('Overlay — traço livre e tarja sólida', () => {
  it('CT-FC-46: arrastar com traço livre cria uma anotação de vários pontos (RN-07)', async () => {
    const { data } = dualAreaInit()
    await renderOverlay(data)
    await enterEditMode()

    pickTool('pencil')
    const root = screen.getByTestId('editor-overlay')
    fireEvent.pointerDown(root, { clientX: 150, clientY: 100 })
    fireEvent.pointerMove(root, { clientX: 200, clientY: 130 })
    fireEvent.pointerMove(root, { clientX: 250, clientY: 160 })
    fireEvent.pointerMove(root, { clientX: 300, clientY: 190 })
    fireEvent.pointerUp(root, { clientX: 300, clientY: 190 })

    await waitFor(() => expect(screen.getByTestId('editor-undo')).not.toBeDisabled())
    // traço suavizado ⇒ curvas quadráticas no render
    await waitFor(() => expect(ctxCalls.some((c) => c.method === 'quadraticCurveTo')).toBe(true))
  })

  it('CT-FC-47: clique sem arrasto com traço livre não cria anotação (RN-09, FA-6)', async () => {
    const { data } = dualAreaInit()
    await renderOverlay(data)
    await enterEditMode()

    pickTool('pencil')
    const root = screen.getByTestId('editor-overlay')
    fireEvent.pointerDown(root, { clientX: 150, clientY: 100 })
    fireEvent.pointerUp(root, { clientX: 150, clientY: 100 })

    expect(screen.getByTestId('editor-undo')).toBeDisabled()
  })

  it('CT-FC-48: arrastar com tarja cria anotação opaca (RN-11)', async () => {
    const { data } = dualAreaInit()
    await renderOverlay(data)
    await enterEditMode()

    pickTool('redact')
    drag({ x: 150, y: 100 }, { x: 300, y: 200 })

    await waitFor(() => expect(screen.getByTestId('editor-undo')).not.toBeDisabled())
  })

  it('CT-FC-49: tarja menor que o mínimo é descartada (RN-13)', async () => {
    const { data } = dualAreaInit()
    await renderOverlay(data)
    await enterEditMode()

    pickTool('redact')
    drag({ x: 150, y: 100 }, { x: 150.1, y: 100.1 })

    expect(screen.getByTestId('editor-undo')).toBeDisabled()
  })

  it('CT-FC-50: tarja é desfeita por Ctrl+Z (RN-10, RN-14)', async () => {
    const { data } = dualAreaInit()
    await renderOverlay(data)
    await enterEditMode()

    pickTool('redact')
    drag({ x: 150, y: 100 }, { x: 300, y: 200 })
    await waitFor(() => expect(screen.getByTestId('editor-undo')).not.toBeDisabled())

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })

    await waitFor(() => expect(screen.getByTestId('editor-undo')).toBeDisabled())
    expect(screen.getByTestId('editor-redo')).not.toBeDisabled()
  })

  it('CT-FC-56: sem regressão — as ferramentas antigas seguem criando anotações', async () => {
    const { data } = dualAreaInit()
    await renderOverlay(data)
    await enterEditMode()

    pickTool('rect')
    drag({ x: 150, y: 100 }, { x: 300, y: 200 })

    await waitFor(() => expect(screen.getByTestId('editor-undo')).not.toBeDisabled())
  })
})

describe('Overlay — embelezar', () => {
  it('CT-FC-51: o botão abre e fecha o painel (RN-15)', async () => {
    const { data } = dualAreaInit()
    await renderOverlay(data)
    await enterEditMode()

    expect(screen.queryByTestId('editor-beautify-panel')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('editor-beautify-toggle'))
    expect(await screen.findByTestId('editor-beautify-panel')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('editor-beautify-toggle'))
    await waitFor(() =>
      expect(screen.queryByTestId('editor-beautify-panel')).not.toBeInTheDocument()
    )
  })

  it('CT-FC-52: ajuste no painel é persistido via saveSettings (RN-19)', async () => {
    const { data } = dualAreaInit()
    const { api } = await renderOverlay(data)
    await enterEditMode()

    fireEvent.click(screen.getByTestId('editor-beautify-toggle'))
    await screen.findByTestId('editor-beautify-panel')

    fireEvent.click(screen.getByTestId('editor-beautify-bg-ocean'))

    // debounce: a gravação só acontece depois da pausa
    await waitFor(
      () =>
        expect(api.saveSettings).toHaveBeenCalledWith(
          expect.objectContaining({ beautifyBackground: 'ocean' })
        ),
      { timeout: 2000 }
    )
  })

  it('CT-FC-53: falha ao persistir não quebra a tela (RN-20, FA-5)', async () => {
    const { data } = dualAreaInit()
    const { api } = await renderOverlay(data)
    api.saveSettings.mockRejectedValue(new Error('disco cheio'))
    await enterEditMode()

    fireEvent.click(screen.getByTestId('editor-beautify-toggle'))
    await screen.findByTestId('editor-beautify-panel')
    fireEvent.click(screen.getByTestId('editor-beautify-bg-forest'))

    await waitFor(() => expect(api.saveSettings).toHaveBeenCalled(), { timeout: 2000 })

    // o painel continua de pé e o ajuste vale para a captura atual
    expect(screen.getByTestId('editor-beautify-panel')).toBeInTheDocument()
    expect(screen.getByTestId('editor-beautify-bg-forest')).toHaveAttribute('aria-pressed', 'true')
  })

  it('CT-FC-54: copiar com acabamento ligado envia a imagem embelezada (RN-15)', async () => {
    const [a, b] = displayInfoFactory.sideBySide()
    const captures = [
      displayCaptureFactory.fromDisplay(a, { dataUrl: 'data:image/png;base64,AAA' }),
      displayCaptureFactory.fromDisplay(b, { dataUrl: 'data:image/png;base64,BBB' })
    ]
    imageSizes.set('data:image/png;base64,AAA', { width: 1920, height: 1080 })
    imageSizes.set('data:image/png;base64,BBB', { width: 1920, height: 1080 })

    const { api } = await renderOverlay({
      mode: 'area',
      displays: captures,
      settings: settingsFactory.beautified()
    })
    await enterEditMode()

    ctxCalls = []
    fireEvent.click(screen.getByTestId('editor-copy'))

    expect(api.copyImage).toHaveBeenCalledTimes(1)
    // o acabamento recorta a imagem pelos cantos arredondados antes de exportar
    expect(ctxCalls.some((c) => c.method === 'clip')).toBe(true)
  })

  it('CT-FC-55: em modo redit o botão de embelezar não aparece (RN-21)', async () => {
    imageSizes.set('data:image/png;base64,RED', { width: 800, height: 600 })
    const capture = displayCaptureFactory({ dataUrl: 'data:image/png;base64,RED' })

    await renderOverlay({
      mode: 'redit',
      displays: [capture],
      settings: settingsFactory.beautified()
    })
    await screen.findByRole('toolbar')

    expect(screen.queryByTestId('editor-beautify-toggle')).not.toBeInTheDocument()
  })

  it('em modo redit o acabamento não é aplicado na exportação (RN-21)', async () => {
    imageSizes.set('data:image/png;base64,RED', { width: 800, height: 600 })
    const capture = displayCaptureFactory({ dataUrl: 'data:image/png;base64,RED' })

    const { api } = await renderOverlay({
      mode: 'redit',
      displays: [capture],
      settings: settingsFactory.beautified()
    })
    await screen.findByRole('toolbar')

    ctxCalls = []
    fireEvent.click(screen.getByTestId('editor-copy'))

    expect(api.copyImage).toHaveBeenCalledTimes(1)
    // sem acabamento ⇒ sem recorte de cantos arredondados
    expect(ctxCalls.some((c) => c.method === 'clip')).toBe(false)
  })
})

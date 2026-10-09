import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import type { Annotation, OverlayInitData, Point, Rect, ToolId } from '@shared/types'
import type { BeautifyOptions } from '@shared/beautify'
import { beautifyFromSettings, pageBackground } from '@shared/beautify'
import {
  clampRectToBounds,
  dipRectToOverlayCss,
  displayDestRect,
  normalizeRect,
  pickCompositeScale,
  placeToolbar,
  rectContains,
  rectIsMinSize,
  unionRect
} from '@shared/geometry'
import {
  EditorState,
  addAnnotation,
  canRedo,
  canUndo,
  createEditorState,
  exportSelection,
  nextStepNumber,
  redo,
  renderAnnotations,
  undo
} from './lib/editor'
import { Toolbar, TOOLBAR_COLORS } from './components/Toolbar'
import type { StrokeKey } from './components/Toolbar'
import { TextInputLayer } from './components/TextInputLayer'
import { Magnifier } from './components/Magnifier'
import { BeautifyPanel } from './components/BeautifyPanel'
import { applyBeautify } from './lib/beautify'

const MIN_SELECTION_DIP = 4
const STROKE_CSS: Record<StrokeKey, number> = { s: 2, m: 4, l: 7 }
const FONT_CSS: Record<StrokeKey, number> = { s: 16, m: 22, l: 30 }
/**
 * Tamanho de reserva da toolbar em CSS px. A medida real vem do ResizeObserver;
 * estes valores só valem enquanto a medição não chega (e em jsdom, que devolve 0).
 */
const TOOLBAR_FALLBACK_SIZE_CSS = { width: 760, height: 54 }
const TOOLBAR_GAP_CSS = 10
/** Largura máxima do preview do painel de embelezamento (RNF-03). */
const PREVIEW_MAX_WIDTH = 260
/** Distância mínima entre pontos de um traço livre, em px de imagem. */
const FREEHAND_MIN_STEP = 2
/** Atraso da persistência das preferências de embelezamento. */
const BEAUTIFY_SAVE_DEBOUNCE_MS = 400

type Phase = 'loading' | 'select' | 'edit'

type DragState =
  | { type: 'create-selection'; start: Point }
  | { type: 'move-selection'; start: Point; original: Rect }
  | { type: 'resize-selection'; handle: string; original: Rect }
  | { type: 'draft-shape'; start: Point }
  | { type: 'draft-freehand' }
  | null

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Falha ao carregar imagem da captura'))
    img.src = dataUrl
  })
}

export function Overlay(): ReactNode {
  const [phase, setPhase] = useState<Phase>('loading')
  const [init, setInit] = useState<OverlayInitData | null>(null)
  const [selection, setSelection] = useState<Rect | null>(null)
  const [editor, setEditor] = useState<EditorState>(createEditorState())
  const [tool, setTool] = useState<ToolId>('select')
  const [color, setColor] = useState(TOOLBAR_COLORS[0])
  const [stroke, setStroke] = useState<StrokeKey>('m')
  const [draft, setDraft] = useState<Annotation | null>(null)
  const [textPos, setTextPos] = useState<Point | null>(null)
  /** Cursor em px de imagem — alimenta a lupa (RN-01). */
  const [cursorImg, setCursorImg] = useState<Point | null>(null)
  /** Última cor lida pela lupa, consumida pelo conta-gotas (RN-04). */
  const [hoverColor, setHoverColor] = useState('#000000')
  const [beautify, setBeautify] = useState<BeautifyOptions | null>(null)
  const [beautifyOpen, setBeautifyOpen] = useState(false)
  const [toolbarSize, setToolbarSize] = useState(TOOLBAR_FALLBACK_SIZE_CSS)

  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<DragState>(null)
  // CSS px por image px (1/scaleFactor em area/full; fitScale em all)
  const cssPerImageRef = useRef(1)
  // RN-10: retângulos dos monitores reais em CSS px do overlay. Fora do modo `area`
  // multi-monitor é um único retângulo — a própria janela.
  const viewportsCssRef = useRef<Rect[]>([])
  const toolbarWrapperRef = useRef<HTMLDivElement>(null)
  const beautifySaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cssPerImage = cssPerImageRef.current
  const pxScale = 1 / cssPerImage
  const strokeWidth = STROKE_CSS[stroke] * pxScale
  const fontSize = FONT_CSS[stroke] * pxScale

  // ---------- inicialização ----------
  useEffect(() => {
    let alive = true
    void (async () => {
      const data = await window.arcanshot.overlayInit()
      if (!data || !alive) return
      const images = await Promise.all(data.displays.map((d) => loadImage(d.dataUrl)))
      if (!alive) return

      const base = document.createElement('canvas')
      const ctx2 = (c: HTMLCanvasElement): CanvasRenderingContext2D => c.getContext('2d')!

      // Composição: `all` sempre; `area` quando há mais de um monitor (feature 0007).
      // `full` e `redit` trazem sempre uma única captura.
      if (data.displays.length > 1) {
        const canvasScale = pickCompositeScale(data.displays.map((d) => d.scaleFactor))
        const union = unionRect(data.displays.map((d) => d.bounds))
        base.width = Math.round(union.width * canvasScale)
        base.height = Math.round(union.height * canvasScale)
        const ctx = ctx2(base)
        ctx.fillStyle = '#000000' // RN-04: regiões sem display ficam pretas
        ctx.fillRect(0, 0, base.width, base.height)
        data.displays.forEach((d, i) => {
          const dest = displayDestRect(d.bounds, union, canvasScale)
          ctx.drawImage(images[i], dest.x, dest.y, dest.width, dest.height)
        })

        if (data.mode === 'all') {
          // Janela = 1 display, canvas = união ⇒ precisa caber inteiro (fit).
          cssPerImageRef.current = Math.min(
            window.innerWidth / base.width,
            window.innerHeight / base.height,
            1
          )
          viewportsCssRef.current = [
            { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }
          ]
        } else {
          // `area`: a janela cobre exatamente a união ⇒ 1:1 com o desktop real.
          cssPerImageRef.current = window.innerWidth / base.width
          // Derivar de innerWidth (e não de devicePixelRatio) mantém a conta correta
          // em DPI misto, onde a janela adota o fator de escala de um monitor só.
          const cssPerDip = window.innerWidth / union.width
          viewportsCssRef.current = data.displays.map((d) =>
            dipRectToOverlayCss(d.bounds, union, cssPerDip)
          )
        }
      } else {
        const img = images[0]
        base.width = img.naturalWidth
        base.height = img.naturalHeight
        ctx2(base).drawImage(img, 0, 0)
        // redit: janela não é fullscreen — ajusta para caber sem cortar
        if (data.mode === 'redit') {
          cssPerImageRef.current = Math.min(
            window.innerWidth / base.width,
            window.innerHeight / base.height
          )
        } else {
          cssPerImageRef.current = window.innerWidth / base.width
        }
        viewportsCssRef.current = [
          { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }
        ]
      }

      baseCanvasRef.current = base
      setBeautify(beautifyFromSettings(data.settings))
      setInit(data)
      if (data.mode === 'area') {
        setPhase('select')
      } else {
        setSelection({ x: 0, y: 0, width: base.width, height: base.height })
        setPhase('edit')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // ---------- desenho ----------
  // RNF-02: o canvas do modo `area` pode ter o tamanho da união de todos os monitores.
  // Coalescer em requestAnimationFrame garante no máximo um redraw por frame durante
  // o arrasto, mesmo que vários estados mudem no mesmo evento de ponteiro.
  useEffect(() => {
    const canvas = canvasRef.current
    const base = baseCanvasRef.current
    if (!canvas || !base || phase === 'loading') return

    const frame = requestAnimationFrame(() => {
      canvas.width = base.width
      canvas.height = base.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(base, 0, 0)
      const annotations = draft ? [...editor.annotations, draft] : editor.annotations
      renderAnnotations(ctx, base, annotations)

      // véu fora da seleção (o mesmo tom quase preto do site, DESIGN.md)
      ctx.save()
      ctx.fillStyle = 'rgba(9, 9, 12, 0.55)'
      if (!selection) {
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      } else {
        const s = selection
        ctx.fillRect(0, 0, canvas.width, s.y)
        ctx.fillRect(0, s.y, s.x, s.height)
        ctx.fillRect(s.x + s.width, s.y, canvas.width - s.x - s.width, s.height)
        ctx.fillRect(0, s.y + s.height, canvas.width, canvas.height - s.y - s.height)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)'
        ctx.lineWidth = Math.max(1, 1.5 * pxScale)
        ctx.setLineDash([6 * pxScale, 4 * pxScale])
        ctx.strokeRect(s.x, s.y, s.width, s.height)
      }
      ctx.restore()
    })
    return () => cancelAnimationFrame(frame)
  }, [phase, selection, editor, draft, pxScale])

  // ---------- ações ----------
  const getDataUrl = useCallback((): string | null => {
    const base = baseCanvasRef.current
    if (!base || !selection || !init) return null
    return exportSelection(
      base,
      editor.annotations,
      selection,
      init.settings.imageFormat,
      init.settings.jpgQuality,
      // RN-21: a re-edição já parte de uma imagem exportada — embelezar de novo
      // empilharia moldura sobre moldura.
      init.mode === 'redit' ? undefined : (beautify ?? undefined)
    )
  }, [selection, editor, init, beautify])

  // Fundo que ficou na imagem exportada (0010): a galeria usa para pintar a página do PDF.
  // Na re-edição o acabamento não é reaplicado, então o item mantém o fundo que já tinha.
  const exportedBackground = useCallback((): string | undefined => {
    if (!beautify?.enabled || init?.mode === 'redit') return undefined
    return pageBackground(beautify.background)?.id
  }, [beautify, init])

  const handleCopy = useCallback(() => {
    const dataUrl = getDataUrl()
    if (dataUrl) void window.arcanshot.copyImage(dataUrl, exportedBackground())
  }, [getDataUrl, exportedBackground])

  const handleSave = useCallback(() => {
    const dataUrl = getDataUrl()
    if (dataUrl) void window.arcanshot.saveImage(dataUrl, exportedBackground())
  }, [getDataUrl, exportedBackground])

  const handleSaveAs = useCallback(() => {
    const dataUrl = getDataUrl()
    if (dataUrl) void window.arcanshot.saveImageAs(dataUrl, exportedBackground())
  }, [getDataUrl, exportedBackground])

  const handleCancel = useCallback(() => {
    void window.arcanshot.cancelOverlay()
  }, [])

  // ---------- embelezamento ----------

  /**
   * RN-19: aplica o ajuste na hora e agenda a persistência. O debounce evita que o
   * deslizante de margem dispare dezenas de escritas em settings.json.
   * RN-20/FA-5: falha ao persistir é silenciosa — não interrompe a captura.
   */
  const handleBeautifyChange = useCallback(
    (patch: Partial<BeautifyOptions>) => {
      if (!beautify) return
      const next = { ...beautify, ...patch }
      setBeautify(next)

      // O agendamento fica FORA da função atualizadora do estado: o React pode
      // executar atualizadoras mais de uma vez, e um efeito colateral ali produziria
      // escritas duplicadas em settings.json.
      if (beautifySaveTimerRef.current) clearTimeout(beautifySaveTimerRef.current)
      beautifySaveTimerRef.current = setTimeout(() => {
        // Este callback roda fora do React: uma exceção aqui viraria erro não tratado.
        // RN-20 exige que falha ao persistir jamais atrapalhe a captura — daí o
        // try/catch por cima do Promise.resolve (que também cobre retorno não-Promise).
        try {
          void Promise.resolve(
            window.arcanshot.saveSettings({
              beautifyEnabled: next.enabled,
              beautifyBackground: next.background,
              beautifyPadding: next.padding,
              beautifyRounded: next.rounded,
              beautifyShadow: next.shadow
            })
          ).catch(() => {})
        } catch {
          // silencioso por decisão de produto (FA-5)
        }
      }, BEAUTIFY_SAVE_DEBOUNCE_MS)
    },
    [beautify]
  )

  useEffect(() => {
    return () => {
      if (beautifySaveTimerRef.current) clearTimeout(beautifySaveTimerRef.current)
    }
  }, [])

  /**
   * RN-16: preview fiel em escala reduzida. Reduzir o recorte ANTES de embelezar
   * (em vez de embelezar e reduzir) mantém o custo constante mesmo em capturas 4K,
   * e a margem proporcional faz o resultado reduzido corresponder ao real.
   */
  const renderBeautifyPreview = useCallback(
    (options: BeautifyOptions): string | null => {
      const base = baseCanvasRef.current
      if (!base || !selection) return null

      const scale = Math.min(1, PREVIEW_MAX_WIDTH / Math.max(1, selection.width))
      const small = document.createElement('canvas')
      small.width = Math.max(1, Math.round(selection.width * scale))
      small.height = Math.max(1, Math.round(selection.height * scale))
      const sctx = small.getContext('2d')
      if (!sctx) return null

      const composed = document.createElement('canvas')
      composed.width = base.width
      composed.height = base.height
      const cctx = composed.getContext('2d')
      if (!cctx) return null
      cctx.drawImage(base, 0, 0)
      renderAnnotations(cctx, base, editor.annotations)

      sctx.drawImage(
        composed,
        selection.x,
        selection.y,
        selection.width,
        selection.height,
        0,
        0,
        small.width,
        small.height
      )

      const result = options.enabled ? applyBeautify(small, options) : small
      return result.toDataURL('image/png')
    },
    [selection, editor]
  )

  // ---------- medição da toolbar (RN-10) ----------
  // Medir em vez de assumir uma constante: a toolbar cresce a cada ferramenta nova,
  // e uma largura errada faz `placeToolbar` clampar no lugar errado.
  useEffect(() => {
    const el = toolbarWrapperRef.current
    if (!el || phase !== 'edit') return
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setToolbarSize({ width: rect.width, height: rect.height })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [phase, beautifyOpen])

  // ---------- teclado ----------
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        // Esc no textarea é tratado pelo TextInputLayer via stopPropagation;
        // este handler só fecha o overlay quando não há texto em edição.
        if (!textPos) handleCancel()
        return
      }
      if (phase !== 'edit' || textPos) return
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        handleCopy()
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSaveAs()
      } else if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSave()
      } else if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        setEditor((s) => undo(s))
      } else if (e.ctrlKey && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault()
        setEditor((s) => redo(s))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [phase, textPos, handleCopy, handleSave, handleSaveAs, handleCancel])

  // ---------- mouse ----------
  const toImg = useCallback(
    (e: { clientX: number; clientY: number }): Point => ({
      x: e.clientX / cssPerImageRef.current,
      y: e.clientY / cssPerImageRef.current
    }),
    []
  )

  function canvasBounds(): Rect {
    const base = baseCanvasRef.current!
    return { x: 0, y: 0, width: base.width, height: base.height }
  }

  function onPointerDown(e: ReactPointerEvent): void {
    if (phase === 'loading' || textPos) return
    if ((e.target as HTMLElement).closest('.toolbar, .handle, .text-input-layer')) return
    const p = toImg(e)

    if (phase === 'select') {
      dragRef.current = { type: 'create-selection', start: p }
      return
    }
    // phase === 'edit'
    if (tool === 'eyedropper') {
      // RN-05: o conta-gotas não cria anotação nem inicia arrasto.
      setColor(hoverColor)
      void window.arcanshot.copyColor(hoverColor)
      return
    }
    if (tool === 'pencil') {
      dragRef.current = { type: 'draft-freehand' }
      setDraft({ kind: 'freehand', points: [p], color, strokeWidth })
      return
    }
    if (tool === 'select') {
      if (selection && rectContains(selection, p)) {
        dragRef.current = { type: 'move-selection', start: p, original: selection }
      } else {
        dragRef.current = { type: 'create-selection', start: p }
      }
    } else if (tool === 'text') {
      setTextPos(p)
    } else if (tool === 'step') {
      setEditor((s) => addAnnotation(s, { kind: 'step', x: p.x, y: p.y, n: nextStepNumber(s), color }))
    } else {
      dragRef.current = { type: 'draft-shape', start: p }
    }
  }

  function onPointerMove(e: ReactPointerEvent): void {
    const p = toImg(e)
    // RN-01: a lupa precisa da posição mesmo sem arrasto. `cursorImg` não entra nas
    // dependências do efeito de desenho, então o canvas principal não redesenha aqui.
    setCursorImg(p)

    const drag = dragRef.current
    if (!drag) return
    const bounds = canvasBounds()

    if (drag.type === 'create-selection') {
      setSelection(clampRectToBounds(normalizeRect(drag.start, p), bounds))
    } else if (drag.type === 'move-selection') {
      const dx = p.x - drag.start.x
      const dy = p.y - drag.start.y
      const moved = {
        x: Math.max(0, Math.min(drag.original.x + dx, bounds.width - drag.original.width)),
        y: Math.max(0, Math.min(drag.original.y + dy, bounds.height - drag.original.height)),
        width: drag.original.width,
        height: drag.original.height
      }
      setSelection(moved)
    } else if (drag.type === 'resize-selection') {
      const o = drag.original
      let left = o.x
      let top = o.y
      let right = o.x + o.width
      let bottom = o.y + o.height
      if (drag.handle.includes('w')) left = p.x
      if (drag.handle.includes('e')) right = p.x
      if (drag.handle.includes('n')) top = p.y
      if (drag.handle.includes('s')) bottom = p.y
      setSelection(
        clampRectToBounds(normalizeRect({ x: left, y: top }, { x: right, y: bottom }), bounds)
      )
    } else if (drag.type === 'draft-freehand') {
      setDraft((current) => {
        if (!current || current.kind !== 'freehand') return current
        const last = current.points[current.points.length - 1]
        // Descarta micro-movimentos: sem isso o array incha com centenas de pontos
        // praticamente coincidentes num único traço.
        if (Math.hypot(p.x - last.x, p.y - last.y) < FREEHAND_MIN_STEP) return current
        return { ...current, points: [...current.points, p] }
      })
    } else if (drag.type === 'draft-shape') {
      if (tool === 'blur') {
        setDraft({ kind: 'blur', rect: clampRectToBounds(normalizeRect(drag.start, p), bounds) })
      } else if (tool === 'redact') {
        setDraft({
          kind: 'redact',
          rect: clampRectToBounds(normalizeRect(drag.start, p), bounds),
          color
        })
      } else if (tool === 'rect' || tool === 'ellipse' || tool === 'arrow' || tool === 'line' || tool === 'highlight') {
        setDraft({ kind: 'shape', tool, start: drag.start, end: p, color, strokeWidth })
      }
    }
  }

  function onPointerUp(): void {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag) return

    if (drag.type === 'create-selection') {
      const minPx = MIN_SELECTION_DIP * pxScale
      if (!selection || !rectIsMinSize(selection, minPx)) {
        // RN9: arrasto pequeno demais é ignorado
        if (phase === 'select') setSelection(null)
        return
      }
      if (phase === 'select') {
        setPhase('edit')
        void window.arcanshot.beginEdit()
      }
    } else if (drag.type === 'draft-freehand') {
      // RN-09/FA-6: clique sem movimento não vira traço.
      if (draft && draft.kind === 'freehand' && draft.points.length >= 2) {
        setEditor((s) => addAnnotation(s, draft))
      }
      setDraft(null)
    } else if (drag.type === 'draft-shape' && draft) {
      // RN-13: tarja minúscula é descartada, mesmo critério do desfoque.
      const minPx = MIN_SELECTION_DIP * pxScale
      if (draft.kind === 'redact' && !rectIsMinSize(draft.rect, minPx)) {
        setDraft(null)
        return
      }
      setEditor((s) => addAnnotation(s, draft))
      setDraft(null)
    }
  }

  function onHandlePointerDown(handle: string, e: ReactPointerEvent): void {
    e.stopPropagation()
    if (selection) {
      dragRef.current = { type: 'resize-selection', handle, original: selection }
    }
  }

  // ---------- layout (CSS px) ----------
  const selCss = selection
    ? {
        x: selection.x * cssPerImage,
        y: selection.y * cssPerImage,
        width: selection.width * cssPerImage,
        height: selection.height * cssPerImage
      }
    : null

  function handleStyle(handle: string): { left: number; top: number; cursor: string } {
    const s = selCss!
    const cx = s.x + s.width / 2
    const cy = s.y + s.height / 2
    const pos: Record<string, [number, number, string]> = {
      nw: [s.x, s.y, 'nwse-resize'],
      n: [cx, s.y, 'ns-resize'],
      ne: [s.x + s.width, s.y, 'nesw-resize'],
      e: [s.x + s.width, cy, 'ew-resize'],
      se: [s.x + s.width, s.y + s.height, 'nwse-resize'],
      s: [cx, s.y + s.height, 'ns-resize'],
      sw: [s.x, s.y + s.height, 'nesw-resize'],
      w: [s.x, cy, 'ew-resize']
    }
    const [left, top, cursor] = pos[handle]
    return { left, top, cursor }
  }

  // RN-10: a toolbar precisa ficar inteira dentro de um monitor real — com a janela
  // cobrindo a união dos displays, usar a janela inteira como referência a colocaria
  // em faixa preta ou partida entre duas telas.
  const toolbarPos = placeToolbar(
    selCss ?? { x: 8, y: 8, width: 0, height: 0 },
    toolbarSize,
    viewportsCssRef.current,
    TOOLBAR_GAP_CSS
  )

  const cursorClass =
    phase === 'select' || (phase === 'edit' && tool !== 'select') ? 'crosshair' : 'default'

  // RN-01: durante a seleção sempre; em edição, só com o conta-gotas ativo.
  const showMagnifier =
    cursorImg !== null &&
    baseCanvasRef.current !== null &&
    (phase === 'select' || (phase === 'edit' && tool === 'eyedropper'))

  // RN-21: sem embelezamento na re-edição de item da galeria.
  const showBeautify = init !== null && init.mode !== 'redit'

  return (
    <div
      className={`overlay-root cursor-${cursorClass}`}
      data-testid="editor-overlay"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <canvas
        ref={canvasRef}
        className="overlay-canvas"
        style={
          baseCanvasRef.current
            ? {
                width: baseCanvasRef.current.width * cssPerImage,
                height: baseCanvasRef.current.height * cssPerImage
              }
            : undefined
        }
      />

      {selCss && (
        <div
          className="size-badge size-label"
          data-testid="editor-size-badge"
          style={{
            left: selCss.x,
            top: selCss.y > 36 ? selCss.y - 31 : selCss.y + 8
          }}
        >
          {Math.round(selection!.width)} × {Math.round(selection!.height)}
        </div>
      )}

      {phase === 'edit' && selCss && tool === 'select' && (
        <>
          {HANDLES.map((h) => {
            const st = handleStyle(h)
            return (
              <div
                key={h}
                className="handle"
                data-testid={`editor-handle-${h}`}
                style={{ left: st.left - 5, top: st.top - 5, cursor: st.cursor }}
                onPointerDown={(e) => onHandlePointerDown(h, e)}
              />
            )
          })}
        </>
      )}

      {phase === 'edit' && (
        <div
          ref={toolbarWrapperRef}
          className="toolbar-wrapper"
          style={{ left: toolbarPos.x, top: toolbarPos.y }}
        >
          <Toolbar
            tool={tool}
            onToolChange={setTool}
            color={color}
            onColorChange={setColor}
            stroke={stroke}
            onStrokeChange={setStroke}
            canUndo={canUndo(editor)}
            canRedo={canRedo(editor)}
            onUndo={() => setEditor((s) => undo(s))}
            onRedo={() => setEditor((s) => redo(s))}
            onCopy={handleCopy}
            onSave={handleSave}
            onSaveAs={handleSaveAs}
            onCancel={handleCancel}
            showBeautify={showBeautify}
            beautifyOpen={beautifyOpen}
            beautifyEnabled={beautify?.enabled ?? false}
            onToggleBeautify={() => setBeautifyOpen((open) => !open)}
          />
          {beautifyOpen && beautify && showBeautify && (
            <BeautifyPanel
              options={beautify}
              onChange={handleBeautifyChange}
              renderPreview={renderBeautifyPreview}
            />
          )}
        </div>
      )}

      {showMagnifier && (
        <Magnifier
          source={baseCanvasRef.current}
          point={cursorImg!}
          cssPerImage={cssPerImage}
          viewport={{ width: window.innerWidth, height: window.innerHeight }}
          onColorRead={setHoverColor}
        />
      )}

      {textPos && (
        <TextInputLayer
          x={textPos.x * cssPerImage}
          y={textPos.y * cssPerImage}
          color={color}
          fontSizeCss={FONT_CSS[stroke]}
          onCommit={(text) => {
            setEditor((s) =>
              addAnnotation(s, { kind: 'text', x: textPos.x, y: textPos.y, text, color, fontSize })
            )
            setTextPos(null)
          }}
          onCancel={() => setTextPos(null)}
        />
      )}
    </div>
  )
}

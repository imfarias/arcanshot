import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import type { Annotation, OverlayInitData, Point, Rect, ToolId } from '@shared/types'
import { clampRectToBounds, normalizeRect, rectContains, rectIsMinSize, unionRect } from '@shared/geometry'
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

const MIN_SELECTION_DIP = 4
const STROKE_CSS: Record<StrokeKey, number> = { s: 2, m: 4, l: 7 }
const FONT_CSS: Record<StrokeKey, number> = { s: 16, m: 22, l: 30 }

type Phase = 'loading' | 'select' | 'edit'

type DragState =
  | { type: 'create-selection'; start: Point }
  | { type: 'move-selection'; start: Point; original: Rect }
  | { type: 'resize-selection'; handle: string; original: Rect }
  | { type: 'draft-shape'; start: Point }
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

  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<DragState>(null)
  // CSS px por image px (1/scaleFactor em area/full; fitScale em all)
  const cssPerImageRef = useRef(1)

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

      if (data.mode === 'all' && data.displays.length > 1) {
        const canvasScale = Math.max(...data.displays.map((d) => d.scaleFactor))
        const union = unionRect(data.displays.map((d) => d.bounds))
        base.width = Math.round(union.width * canvasScale)
        base.height = Math.round(union.height * canvasScale)
        const ctx = ctx2(base)
        ctx.fillStyle = '#000000' // RN10: regiões sem display ficam pretas
        ctx.fillRect(0, 0, base.width, base.height)
        data.displays.forEach((d, i) => {
          ctx.drawImage(
            images[i],
            Math.round((d.bounds.x - union.x) * canvasScale),
            Math.round((d.bounds.y - union.y) * canvasScale),
            Math.round(d.bounds.width * canvasScale),
            Math.round(d.bounds.height * canvasScale)
          )
        })
        cssPerImageRef.current = Math.min(
          window.innerWidth / base.width,
          window.innerHeight / base.height,
          1
        )
      } else {
        const img = images[0]
        base.width = img.naturalWidth
        base.height = img.naturalHeight
        ctx2(base).drawImage(img, 0, 0)
        cssPerImageRef.current = window.innerWidth / base.width
      }

      baseCanvasRef.current = base
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
  useEffect(() => {
    const canvas = canvasRef.current
    const base = baseCanvasRef.current
    if (!canvas || !base || phase === 'loading') return
    canvas.width = base.width
    canvas.height = base.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(base, 0, 0)
    const annotations = draft ? [...editor.annotations, draft] : editor.annotations
    renderAnnotations(ctx, base, annotations)

    // máscara escura fora da seleção
    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    if (!selection) {
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else {
      const s = selection
      ctx.fillRect(0, 0, canvas.width, s.y)
      ctx.fillRect(0, s.y, s.x, s.height)
      ctx.fillRect(s.x + s.width, s.y, canvas.width - s.x - s.width, s.height)
      ctx.fillRect(0, s.y + s.height, canvas.width, canvas.height - s.y - s.height)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = Math.max(1, pxScale)
      ctx.setLineDash([6 * pxScale, 4 * pxScale])
      ctx.strokeRect(s.x, s.y, s.width, s.height)
    }
    ctx.restore()
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
      init.settings.jpgQuality
    )
  }, [selection, editor, init])

  const handleCopy = useCallback(() => {
    const dataUrl = getDataUrl()
    if (dataUrl) void window.arcanshot.copyImage(dataUrl)
  }, [getDataUrl])

  const handleSave = useCallback(() => {
    const dataUrl = getDataUrl()
    if (dataUrl) void window.arcanshot.saveImage(dataUrl)
  }, [getDataUrl])

  const handleSaveAs = useCallback(() => {
    const dataUrl = getDataUrl()
    if (dataUrl) void window.arcanshot.saveImageAs(dataUrl)
  }, [getDataUrl])

  const handleCancel = useCallback(() => {
    void window.arcanshot.cancelOverlay()
  }, [])

  // ---------- teclado ----------
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        handleCancel()
        return
      }
      if (phase !== 'edit') return
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
  }, [phase, handleCopy, handleSave, handleSaveAs, handleCancel])

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
    const drag = dragRef.current
    if (!drag) return
    const p = toImg(e)
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
    } else if (drag.type === 'draft-shape') {
      if (tool === 'blur') {
        setDraft({ kind: 'blur', rect: clampRectToBounds(normalizeRect(drag.start, p), bounds) })
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
    } else if (drag.type === 'draft-shape' && draft) {
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

  const toolbarTop =
    selCss && selCss.y + selCss.height + 64 < window.innerHeight
      ? selCss.y + selCss.height + 10
      : Math.max(8, (selCss?.y ?? 0) - 64)
  const toolbarLeft = Math.max(8, Math.min(selCss?.x ?? 8, window.innerWidth - 760))

  const cursorClass =
    phase === 'select' || (phase === 'edit' && tool !== 'select') ? 'crosshair' : 'default'

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
          className="size-badge"
          data-testid="editor-size-badge"
          style={{
            left: selCss.x,
            top: selCss.y > 34 ? selCss.y - 30 : selCss.y + 6
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
        <div className="toolbar-wrapper" style={{ left: toolbarLeft, top: toolbarTop }}>
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
          />
        </div>
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

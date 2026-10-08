import type { BeautifyOptions } from '@shared/beautify'
import { pickExportFormat } from '@shared/beautify'
import { applyBeautify } from './beautify'
import type { Annotation, Point, Rect } from '@shared/types'

export interface EditorState {
  annotations: Annotation[]
  undoStack: Annotation[][]
  redoStack: Annotation[][]
}

export function createEditorState(): EditorState {
  return { annotations: [], undoStack: [], redoStack: [] }
}

export function addAnnotation(state: EditorState, annotation: Annotation): EditorState {
  return {
    annotations: [...state.annotations, annotation],
    undoStack: [...state.undoStack, state.annotations],
    redoStack: []
  }
}

export function undo(state: EditorState): EditorState {
  if (state.undoStack.length === 0) return state
  const previous = state.undoStack[state.undoStack.length - 1]
  return {
    annotations: previous,
    undoStack: state.undoStack.slice(0, -1),
    redoStack: [...state.redoStack, state.annotations]
  }
}

export function redo(state: EditorState): EditorState {
  if (state.redoStack.length === 0) return state
  const next = state.redoStack[state.redoStack.length - 1]
  return {
    annotations: next,
    undoStack: [...state.undoStack, state.annotations],
    redoStack: state.redoStack.slice(0, -1)
  }
}

export function canUndo(state: EditorState): boolean {
  return state.undoStack.length > 0
}

export function canRedo(state: EditorState): boolean {
  return state.redoStack.length > 0
}

/** RN5: sequencial considerando apenas os steps ativos (undo retrocede o contador). */
export function nextStepNumber(state: EditorState): number {
  return state.annotations.filter((a) => a.kind === 'step').length + 1
}

const STEP_RADIUS_FACTOR = 12

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  size: number
): void {
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(to.x - size * Math.cos(angle - Math.PI / 6), to.y - size * Math.sin(angle - Math.PI / 6))
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(to.x - size * Math.cos(angle + Math.PI / 6), to.y - size * Math.sin(angle + Math.PI / 6))
  ctx.stroke()
}

/**
 * RN-08: traço à mão livre suavizado. Ligar os pontos com retas produz cantos
 * angulosos quando o mouse se move rápido; usar cada ponto como controle de uma
 * curva quadrática até o ponto médio seguinte devolve uma linha contínua.
 */
export function drawFreehand(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  strokeWidth: number
): void {
  if (points.length === 0) return
  ctx.strokeStyle = color
  ctx.lineWidth = strokeWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()

  if (points.length === 1) {
    // Ponto isolado: um segmento de comprimento zero com lineCap redondo vira um ponto.
    ctx.moveTo(points[0].x, points[0].y)
    ctx.lineTo(points[0].x, points[0].y)
    ctx.stroke()
    return
  }

  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length - 1; i++) {
    const mid = { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 }
    ctx.quadraticCurveTo(points[i].x, points[i].y, mid.x, mid.y)
  }
  const last = points[points.length - 1]
  ctx.lineTo(last.x, last.y)
  ctx.stroke()
}

/** RN6: pixelização com bloco proporcional, mínimo 8 px. */
export function pixelateRegion(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  rect: Rect
): void {
  if (rect.width < 1 || rect.height < 1) return
  const block = Math.max(8, Math.round(Math.min(rect.width, rect.height) / 12))
  const smallW = Math.max(1, Math.round(rect.width / block))
  const smallH = Math.max(1, Math.round(rect.height / block))
  const temp = document.createElement('canvas')
  temp.width = smallW
  temp.height = smallH
  const tctx = temp.getContext('2d')!
  tctx.imageSmoothingEnabled = true
  tctx.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, smallW, smallH)
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(temp, 0, 0, smallW, smallH, rect.x, rect.y, rect.width, rect.height)
  ctx.restore()
}

/**
 * Desenha as anotações sobre um contexto já contendo a imagem base.
 * `baseImage` é necessária para o desfoque (fonte dos pixels originais).
 */
export function renderAnnotations(
  ctx: CanvasRenderingContext2D,
  baseImage: CanvasImageSource,
  annotations: Annotation[]
): void {
  for (const a of annotations) {
    ctx.save()
    if (a.kind === 'blur') {
      pixelateRegion(ctx, baseImage, a.rect)
    } else if (a.kind === 'redact') {
      // RN-11: opaco de verdade. Diferente do desfoque, nada do conteúdo original
      // permanece na imagem exportada — por isso `globalAlpha` não é tocado aqui.
      ctx.fillStyle = a.color
      ctx.fillRect(a.rect.x, a.rect.y, a.rect.width, a.rect.height)
    } else if (a.kind === 'freehand') {
      drawFreehand(ctx, a.points, a.color, a.strokeWidth)
    } else if (a.kind === 'shape') {
      ctx.strokeStyle = a.color
      ctx.lineWidth = a.strokeWidth
      ctx.lineCap = 'round'
      const x = Math.min(a.start.x, a.end.x)
      const y = Math.min(a.start.y, a.end.y)
      const w = Math.abs(a.end.x - a.start.x)
      const h = Math.abs(a.end.y - a.start.y)
      switch (a.tool) {
        case 'rect':
          ctx.strokeRect(x, y, w, h)
          break
        case 'ellipse':
          ctx.beginPath()
          ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
          ctx.stroke()
          break
        case 'line':
          ctx.beginPath()
          ctx.moveTo(a.start.x, a.start.y)
          ctx.lineTo(a.end.x, a.end.y)
          ctx.stroke()
          break
        case 'arrow':
          ctx.beginPath()
          ctx.moveTo(a.start.x, a.start.y)
          ctx.lineTo(a.end.x, a.end.y)
          ctx.stroke()
          drawArrowHead(ctx, a.start, a.end, Math.max(12, a.strokeWidth * 4))
          break
        case 'highlight':
          ctx.globalAlpha = 0.35
          ctx.lineWidth = Math.max(a.strokeWidth * 6, 14)
          ctx.beginPath()
          ctx.moveTo(a.start.x, a.start.y)
          ctx.lineTo(a.end.x, a.end.y)
          ctx.stroke()
          break
      }
    } else if (a.kind === 'text') {
      ctx.fillStyle = a.color
      ctx.font = `bold ${a.fontSize}px "Segoe UI", sans-serif`
      ctx.textBaseline = 'top'
      const lines = a.text.split('\n')
      lines.forEach((line, i) => {
        ctx.fillText(line, a.x, a.y + i * a.fontSize * 1.25)
      })
    } else if (a.kind === 'step') {
      const radius = STEP_RADIUS_FACTOR + 8
      ctx.fillStyle = a.color
      ctx.beginPath()
      ctx.arc(a.x, a.y, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${radius}px "Segoe UI", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(a.n), a.x, a.y + 1)
    }
    ctx.restore()
  }
}

/**
 * Recorta a seleção + anotações num canvas offscreen e exporta como dataURL (RN3).
 *
 * `beautify` é opcional: omitido (ou desligado), o resultado é idêntico ao de antes
 * da feature 0008 — é essa a garantia da RN-22.
 */
export function exportSelection(
  baseCanvas: HTMLCanvasElement,
  annotations: Annotation[],
  selection: Rect,
  format: 'png' | 'jpg',
  jpgQuality: number,
  beautify?: BeautifyOptions
): string {
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(selection.width))
  out.height = Math.max(1, Math.round(selection.height))
  const ctx = out.getContext('2d')!
  // composição: imagem base + anotações, transladadas para a origem da seleção
  const composed = document.createElement('canvas')
  composed.width = baseCanvas.width
  composed.height = baseCanvas.height
  const cctx = composed.getContext('2d')!
  cctx.drawImage(baseCanvas, 0, 0)
  renderAnnotations(cctx, baseCanvas, annotations)
  ctx.drawImage(
    composed,
    selection.x,
    selection.y,
    selection.width,
    selection.height,
    0,
    0,
    out.width,
    out.height
  )

  const final = beautify?.enabled ? applyBeautify(out, beautify) : out
  const outFormat = beautify ? pickExportFormat(format, beautify) : format

  if (outFormat === 'jpg') {
    return final.toDataURL('image/jpeg', jpgQuality / 100)
  }
  return final.toDataURL('image/png')
}

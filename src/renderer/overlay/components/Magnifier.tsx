import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { Point } from '@shared/types'
import { placeNearCursor } from '@shared/geometry'

/** Lado do quadro da lupa em CSS px. */
export const MAGNIFIER_SIZE = 132
/** Fator de ampliação (RN-02). */
export const MAGNIFIER_ZOOM = 8
const CURSOR_OFFSET = 24

export interface MagnifierProps {
  /** Canvas base da captura (fonte dos pixels). */
  source: HTMLCanvasElement | null
  /** Posição do cursor em px de imagem. */
  point: Point
  /** CSS px por px de imagem — converte a posição para a tela. */
  cssPerImage: number
  viewport: { width: number; height: number }
  onColorRead?: (hex: string) => void
}

function toHex(r: number, g: number, b: number): string {
  const part = (v: number): string => v.toString(16).padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase()
}

export function Magnifier(props: MagnifierProps): ReactNode {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hexRef, labelRef] = [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)]
  const { source, point, cssPerImage, viewport, onColorRead } = props

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !source) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const span = MAGNIFIER_SIZE / MAGNIFIER_ZOOM
    const sx = Math.round(point.x) - span / 2
    const sy = Math.round(point.y) - span / 2

    ctx.clearRect(0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE)
    // RN-02: pixels ampliados devem aparecer como blocos nítidos, não borrados.
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(source, sx, sy, span, span, 0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE)

    // RNF-02: a cor sai deste canvas de 132 px, NUNCA do canvas base — que depois da
    // feature 0007 pode ter o tamanho da união de todos os monitores.
    let hex = '#000000'
    try {
      const center = MAGNIFIER_SIZE / 2
      const data = ctx.getImageData(center, center, 1, 1).data
      hex = toHex(data[0], data[1], data[2])
    } catch {
      // canvas "sujo" (cross-origin) — mantém o valor padrão em vez de quebrar a lupa
    }

    if (hexRef.current) hexRef.current.textContent = hex
    if (labelRef.current) {
      labelRef.current.textContent = `${Math.round(point.x)}, ${Math.round(point.y)}`
    }
    onColorRead?.(hex)

    // cruz no pixel central
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.lineWidth = 1
    ctx.strokeRect(
      MAGNIFIER_SIZE / 2 - MAGNIFIER_ZOOM / 2,
      MAGNIFIER_SIZE / 2 - MAGNIFIER_ZOOM / 2,
      MAGNIFIER_ZOOM,
      MAGNIFIER_ZOOM
    )
  }, [source, point.x, point.y, onColorRead])

  const cursorCss = { x: point.x * cssPerImage, y: point.y * cssPerImage }
  const pos = placeNearCursor(
    cursorCss,
    { width: MAGNIFIER_SIZE, height: MAGNIFIER_SIZE + 34 },
    CURSOR_OFFSET,
    viewport
  )

  return (
    <div
      className="magnifier"
      data-testid="editor-magnifier"
      aria-hidden="true"
      style={{ left: pos.x, top: pos.y, width: MAGNIFIER_SIZE }}
    >
      <canvas
        ref={canvasRef}
        width={MAGNIFIER_SIZE}
        height={MAGNIFIER_SIZE}
        className="magnifier-canvas"
        data-testid="editor-magnifier-canvas"
      />
      <div className="magnifier-info">
        <span ref={labelRef} data-testid="editor-magnifier-coords" />
        <span ref={hexRef} data-testid="editor-magnifier-hex" />
      </div>
    </div>
  )
}

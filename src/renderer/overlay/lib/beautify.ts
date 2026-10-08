import type { BeautifyOptions } from '@shared/beautify'
import { computeBeautifyLayout, resolveBackground } from '@shared/beautify'

/**
 * Caminho de retângulo arredondado via `arcTo`.
 * `ctx.roundRect()` nativo existe no Electron 38, mas `arcTo` é universal e
 * sobrevive ao stub de canvas dos testes. Raio 0 degenera num retângulo comum.
 */
export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.arcTo(x + width, y, x + width, y + r, r)
  ctx.lineTo(x + width, y + height - r)
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r)
  ctx.lineTo(x + r, y + height)
  ctx.arcTo(x, y + height, x, y + height - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

/**
 * Aplica o acabamento de compartilhamento sobre um recorte já pronto (RN-15).
 * Nunca altera `source`; devolve um canvas novo.
 */
export function applyBeautify(
  source: HTMLCanvasElement,
  opts: BeautifyOptions
): HTMLCanvasElement {
  const layout = computeBeautifyLayout({ width: source.width, height: source.height }, opts)
  const preset = resolveBackground(opts.background)

  const out = document.createElement('canvas')
  out.width = Math.max(1, layout.width)
  out.height = Math.max(1, layout.height)
  const ctx = out.getContext('2d')!

  // 1. Fundo (RN-18: `none` deixa o canvas transparente)
  if (preset.type === 'solid') {
    ctx.fillStyle = preset.colors[0]
    ctx.fillRect(0, 0, out.width, out.height)
  } else if (preset.type === 'gradient') {
    const gradient = ctx.createLinearGradient(0, 0, out.width, out.height)
    gradient.addColorStop(0, preset.colors[0])
    gradient.addColorStop(1, preset.colors[1])
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, out.width, out.height)
  }

  const { padding, radius, shadow } = layout

  // 2. Sombra: preenche o caminho da imagem para projetá-la. O preenchimento em si
  //    é coberto pela imagem no passo 3.
  if (shadow) {
    ctx.save()
    ctx.shadowColor = shadow.color
    ctx.shadowBlur = shadow.blur
    ctx.shadowOffsetY = shadow.offsetY
    ctx.fillStyle = '#000000'
    roundRectPath(ctx, padding, padding, source.width, source.height, radius)
    ctx.fill()
    ctx.restore()
  }

  // 3. Imagem recortada pelos cantos arredondados
  ctx.save()
  roundRectPath(ctx, padding, padding, source.width, source.height, radius)
  ctx.clip()
  ctx.drawImage(source, padding, padding)
  ctx.restore()

  return out
}

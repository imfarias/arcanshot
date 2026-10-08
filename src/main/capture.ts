import { desktopCapturer, screen } from 'electron'
import type { DisplayCapture } from '@shared/types'

/**
 * Captura todos os displays em uma única chamada a getSources.
 * Uma chamada por display serializa internamente no Electron mesmo com Promise.all;
 * uma única chamada com o maior tamanho físico entre todos os displays elimina esse
 * gargalo. Displays menores recebem thumbnail no tamanho do maior (upscale pelo Electron),
 * o canvas do overlay escala corretamente ao usar display.bounds × scaleFactor.
 */
export async function captureAllDisplays(): Promise<DisplayCapture[]> {
  const displays = screen.getAllDisplays()

  const maxSize = displays.reduce(
    (max, d) => ({
      width: Math.max(max.width, Math.round(d.bounds.width * d.scaleFactor)),
      height: Math.max(max.height, Math.round(d.bounds.height * d.scaleFactor))
    }),
    { width: 0, height: 0 }
  )

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: maxSize
  })

  return displays.map((display, index) => {
    const source =
      sources.find((s) => s.display_id === String(display.id)) ?? sources[index] ?? sources[0]
    if (!source || source.thumbnail.isEmpty()) {
      throw new Error(`Não foi possível capturar o display ${display.id}`)
    }
    return {
      displayId: display.id,
      bounds: display.bounds,
      scaleFactor: display.scaleFactor,
      dataUrl: source.thumbnail.toDataURL()
    }
  })
}

import { desktopCapturer, screen } from 'electron'
import type { DisplayCapture } from '@shared/types'

/**
 * Captura cada display em resolução física. Uma chamada por display garante
 * thumbnail no tamanho exato mesmo com DPI misto.
 */
export async function captureAllDisplays(): Promise<DisplayCapture[]> {
  const displays = screen.getAllDisplays()
  const captures: DisplayCapture[] = []

  for (const [index, display] of displays.entries()) {
    const physicalSize = {
      width: Math.round(display.bounds.width * display.scaleFactor),
      height: Math.round(display.bounds.height * display.scaleFactor)
    }
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: physicalSize
    })
    const source =
      sources.find((s) => s.display_id === String(display.id)) ?? sources[index] ?? sources[0]
    if (!source || source.thumbnail.isEmpty()) {
      throw new Error(`Não foi possível capturar o display ${display.id}`)
    }
    captures.push({
      displayId: display.id,
      bounds: display.bounds,
      scaleFactor: display.scaleFactor,
      dataUrl: source.thumbnail.toDataURL()
    })
  }

  return captures
}

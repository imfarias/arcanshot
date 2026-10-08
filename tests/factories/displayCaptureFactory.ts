import { faker } from '@faker-js/faker'
import type { DisplayCapture, DisplayInfo } from '@shared/types'

/** PNG 1×1 transparente — dataUrl válido e barato para massa de teste. */
export const PIXEL_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

export function displayCaptureFactory(overrides: Partial<DisplayCapture> = {}): DisplayCapture {
  return {
    displayId: faker.number.int({ min: 1000000, max: 9999999 }),
    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    scaleFactor: 1,
    dataUrl: PIXEL_PNG,
    ...overrides
  }
}

/** Deriva a captura correspondente a um `DisplayInfo` — mantém ids coerentes. */
displayCaptureFactory.fromDisplay = (
  display: DisplayInfo,
  overrides: Partial<DisplayCapture> = {}
): DisplayCapture => ({
  displayId: display.id,
  bounds: display.bounds,
  scaleFactor: display.scaleFactor,
  dataUrl: PIXEL_PNG,
  ...overrides
})

displayCaptureFactory.fromDisplays = (displays: DisplayInfo[]): DisplayCapture[] =>
  displays.map((d) => displayCaptureFactory.fromDisplay(d))

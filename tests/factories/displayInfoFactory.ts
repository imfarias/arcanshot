import { faker } from '@faker-js/faker'
import type { DisplayInfo } from '@shared/types'

export function displayInfoFactory(overrides: Partial<DisplayInfo> = {}): DisplayInfo {
  return {
    id: faker.number.int({ min: 1000000, max: 9999999 }),
    bounds: {
      x: 0,
      y: 0,
      width: faker.helpers.arrayElement([1920, 2560, 3840]),
      height: faker.helpers.arrayElement([1080, 1440, 2160])
    },
    scaleFactor: faker.helpers.arrayElement([1.0, 1.25, 1.5, 2.0]),
    ...overrides
  }
}

displayInfoFactory.dualMonitor = (): [DisplayInfo, DisplayInfo] => {
  const primary = displayInfoFactory({ bounds: { x: 0, y: 0, width: 2560, height: 1440 } })
  const secondary = displayInfoFactory({
    bounds: { x: 2560, y: 0, width: 1920, height: 1080 },
    scaleFactor: 1.0
  })
  return [primary, secondary]
}

/** Dois monitores idênticos lado a lado — layout determinístico para geometria. */
displayInfoFactory.sideBySide = (): [DisplayInfo, DisplayInfo] => [
  displayInfoFactory({ bounds: { x: 0, y: 0, width: 1920, height: 1080 }, scaleFactor: 1 }),
  displayInfoFactory({ bounds: { x: 1920, y: 0, width: 1920, height: 1080 }, scaleFactor: 1 })
]

/** Monitor secundário à ESQUERDA do primário — produz união com `x` negativo. */
displayInfoFactory.secondaryOnLeft = (): [DisplayInfo, DisplayInfo] => [
  displayInfoFactory({ bounds: { x: 0, y: 0, width: 2560, height: 1440 }, scaleFactor: 1 }),
  displayInfoFactory({ bounds: { x: -1920, y: 0, width: 1920, height: 1080 }, scaleFactor: 1 })
]

/** Alturas diferentes — deixa região vazia dentro da união (RN-04). */
displayInfoFactory.differentHeights = (): [DisplayInfo, DisplayInfo] => [
  displayInfoFactory({ bounds: { x: 0, y: 0, width: 2560, height: 1440 }, scaleFactor: 1 }),
  displayInfoFactory({ bounds: { x: 2560, y: 0, width: 1920, height: 1080 }, scaleFactor: 1 })
]

/** Escalas distintas — exercita RN-05 (canvas na maior escala). */
displayInfoFactory.mixedDpi = (): [DisplayInfo, DisplayInfo] => [
  displayInfoFactory({ bounds: { x: 0, y: 0, width: 2560, height: 1440 }, scaleFactor: 1.5 }),
  displayInfoFactory({ bounds: { x: 2560, y: 0, width: 1920, height: 1080 }, scaleFactor: 1 })
]

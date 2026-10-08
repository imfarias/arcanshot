import { describe, expect, it } from 'vitest'
import type { CaptureMode } from '@shared/types'
import { pickCapturesForWindow, planOverlayWindows } from '../../src/main/overlayLayout'
import { displayInfoFactory } from '../factories/displayInfoFactory'
import { displayCaptureFactory } from '../factories/displayCaptureFactory'

const NO_CTX = { cursorDisplayId: null, primaryDisplayId: null }

describe('planOverlayWindows — modo area (CT-OL-01 a CT-OL-06)', () => {
  it('CT-OL-01: retorna exatamente uma janela (RN-01)', () => {
    const displays = displayInfoFactory.sideBySide()
    expect(planOverlayWindows('area', displays, NO_CTX)).toHaveLength(1)
  })

  it('CT-OL-02: os bounds da janela são a união de todos os displays (RN-02)', () => {
    const displays = displayInfoFactory.sideBySide()
    const [plan] = planOverlayWindows('area', displays, NO_CTX)
    expect(plan.bounds).toEqual({ x: 0, y: 0, width: 3840, height: 1080 })
  })

  it('CT-OL-03: displayId é null — a janela recebe todas as capturas (RN-03)', () => {
    const [plan] = planOverlayWindows('area', displayInfoFactory.sideBySide(), NO_CTX)
    expect(plan.displayId).toBeNull()
  })

  it('CT-OL-04: monitor à esquerda do primário gera união com x negativo (RN-02)', () => {
    const displays = displayInfoFactory.secondaryOnLeft()
    const [plan] = planOverlayWindows('area', displays, NO_CTX)
    expect(plan.bounds).toEqual({ x: -1920, y: 0, width: 4480, height: 1440 })
  })

  it('CT-OL-05: alturas diferentes usam a altura do monitor mais alto (RN-02)', () => {
    const displays = displayInfoFactory.differentHeights()
    const [plan] = planOverlayWindows('area', displays, NO_CTX)
    expect(plan.bounds).toEqual({ x: 0, y: 0, width: 4480, height: 1440 })
  })

  it('CT-OL-06: com um único display a janela cobre exatamente esse display (FA-3)', () => {
    const display = displayInfoFactory({ bounds: { x: 0, y: 0, width: 2560, height: 1440 } })
    const [plan] = planOverlayWindows('area', [display], NO_CTX)
    expect(plan.bounds).toEqual(display.bounds)
    expect(plan.displayId).toBeNull()
  })

  it('quatro monitores continuam gerando uma janela só', () => {
    const displays = [0, 1, 2, 3].map((i) =>
      displayInfoFactory({ bounds: { x: i * 1920, y: 0, width: 1920, height: 1080 } })
    )
    const plans = planOverlayWindows('area', displays, NO_CTX)
    expect(plans).toHaveLength(1)
    expect(plans[0].bounds.width).toBe(7680)
  })
})

describe('planOverlayWindows — demais modos (CT-OL-07 a CT-OL-11)', () => {
  it('CT-OL-07: modo full usa os bounds do display sob o cursor (RN-07)', () => {
    const [primary, secondary] = displayInfoFactory.sideBySide()
    const plans = planOverlayWindows('full', [primary, secondary], {
      cursorDisplayId: secondary.id,
      primaryDisplayId: primary.id
    })
    expect(plans).toHaveLength(1)
    expect(plans[0].bounds).toEqual(secondary.bounds)
    expect(plans[0].displayId).toBe(secondary.id)
  })

  it('CT-OL-08: modo full com cursorDisplayId inexistente cai no primeiro display', () => {
    const [primary, secondary] = displayInfoFactory.sideBySide()
    const plans = planOverlayWindows('full', [primary, secondary], {
      cursorDisplayId: -1,
      primaryDisplayId: null
    })
    expect(plans[0].displayId).toBe(primary.id)
  })

  it('CT-OL-09: modo all usa o display primário e compõe todas as capturas (RN-08)', () => {
    const [primary, secondary] = displayInfoFactory.sideBySide()
    const plans = planOverlayWindows('all', [primary, secondary], {
      cursorDisplayId: secondary.id,
      primaryDisplayId: primary.id
    })
    expect(plans).toHaveLength(1)
    expect(plans[0].bounds).toEqual(primary.bounds)
    expect(plans[0].displayId).toBeNull()
  })

  it('modo all com primaryDisplayId inexistente cai no primeiro display', () => {
    const [primary, secondary] = displayInfoFactory.sideBySide()
    const plans = planOverlayWindows('all', [primary, secondary], {
      cursorDisplayId: null,
      primaryDisplayId: -1
    })
    expect(plans[0].bounds).toEqual(primary.bounds)
    expect(plans[0].displayId).toBeNull()
  })

  it('CT-OL-10: modo redit não cria janela por startCapture (RN-12)', () => {
    expect(planOverlayWindows('redit', displayInfoFactory.sideBySide(), NO_CTX)).toEqual([])
  })

  it('CT-OL-11: lista de displays vazia retorna lista vazia em qualquer modo', () => {
    const modes: CaptureMode[] = ['area', 'full', 'all', 'redit']
    for (const mode of modes) {
      expect(planOverlayWindows(mode, [], NO_CTX)).toEqual([])
    }
  })
})

describe('pickCapturesForWindow (CT-OL-12 a CT-OL-14)', () => {
  it('CT-OL-12: displayId null retorna todas as capturas na ordem (RN-03)', () => {
    const captures = displayCaptureFactory.fromDisplays(displayInfoFactory.sideBySide())
    expect(pickCapturesForWindow(captures, null)).toEqual(captures)
  })

  it('CT-OL-13: displayId específico retorna apenas aquela captura (RN-07)', () => {
    const captures = displayCaptureFactory.fromDisplays(displayInfoFactory.sideBySide())
    const target = captures[1]
    expect(pickCapturesForWindow(captures, target.displayId)).toEqual([target])
  })

  it('CT-OL-14: displayId inexistente cai na primeira captura (cache desatualizado)', () => {
    const captures = displayCaptureFactory.fromDisplays(displayInfoFactory.sideBySide())
    expect(pickCapturesForWindow(captures, -999)).toEqual([captures[0]])
  })

  it('lista de capturas vazia não quebra', () => {
    expect(pickCapturesForWindow([], 123)).toEqual([])
    expect(pickCapturesForWindow([], null)).toEqual([])
  })
})

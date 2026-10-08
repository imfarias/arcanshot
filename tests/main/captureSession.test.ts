import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CaptureSession } from '../../src/main/captureSession'
import type { GalleryItem } from '@shared/types'

const TIMEOUT_MS = 1000

let onComplete: ReturnType<typeof vi.fn>
let session: CaptureSession

beforeEach(() => {
  vi.useFakeTimers()
  onComplete = vi.fn()
  session = new CaptureSession(() => TIMEOUT_MS, onComplete)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('CaptureSession', () => {
  it('CT-CS-01: addCapture acumula dataUrls no buffer', () => {
    session.addCapture('data:image/png;base64,AAA')
    session.addCapture('data:image/png;base64,BBB')
    // timer ainda não expirou
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('CT-CS-02: 1 item no buffer — callback NÃO é chamado ao expirar', () => {
    session.addCapture('data:image/png;base64,AAA')
    vi.runAllTimers()
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('CT-CS-03: 2 items antes do timer expirar — callback chamado com 2 items após timer', () => {
    session.addCapture('data:image/png;base64,AAA')
    session.addCapture('data:image/png;base64,BBB')
    vi.runAllTimers()

    expect(onComplete).toHaveBeenCalledOnce()
    const items: GalleryItem[] = onComplete.mock.calls[0][0]
    expect(items).toHaveLength(2)
    expect(items[0].index).toBe(1)
    expect(items[0].dataUrl).toBe('data:image/png;base64,AAA')
    expect(items[1].index).toBe(2)
    expect(items[1].dataUrl).toBe('data:image/png;base64,BBB')
  })

  it('CT-CS-04: segundo addCapture reseta o timer — o callback dispara apenas uma vez ao final', () => {
    session.addCapture('data:image/png;base64,AAA')
    vi.advanceTimersByTime(800)
    // timer ainda não expirou
    expect(onComplete).not.toHaveBeenCalled()

    session.addCapture('data:image/png;base64,BBB')
    // timer resetado — avançar mais 800ms não dispara (precisa de 1000ms desde o reset)
    vi.advanceTimersByTime(800)
    expect(onComplete).not.toHaveBeenCalled()

    // agora avança os 200ms restantes (total 1000ms desde último addCapture)
    vi.advanceTimersByTime(200)
    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('CT-CS-05: clearSession cancela timer pendente — callback não é chamado', () => {
    session.addCapture('data:image/png;base64,AAA')
    session.addCapture('data:image/png;base64,BBB')
    session.clearSession()
    vi.runAllTimers()
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('CT-CS-06: 20 items disparam onComplete imediatamente (limite de segurança)', () => {
    for (let i = 0; i < 20; i++) {
      session.addCapture(`data:image/png;base64,${String(i).padStart(3, '0')}`)
    }
    // sem avançar o timer
    expect(onComplete).toHaveBeenCalledOnce()
    const items: GalleryItem[] = onComplete.mock.calls[0][0]
    expect(items).toHaveLength(20)
  })

  it('CT-CS-07: após onComplete, buffer limpo; nova sequência reinicia do zero', () => {
    session.addCapture('data:image/png;base64,AAA')
    session.addCapture('data:image/png;base64,BBB')
    vi.runAllTimers()
    expect(onComplete).toHaveBeenCalledOnce()

    // nova sequência
    session.addCapture('data:image/png;base64,CCC')
    session.addCapture('data:image/png;base64,DDD')
    vi.runAllTimers()

    expect(onComplete).toHaveBeenCalledTimes(2)
    const secondCall: GalleryItem[] = onComplete.mock.calls[1][0]
    expect(secondCall[0].index).toBe(1)
    expect(secondCall[0].dataUrl).toBe('data:image/png;base64,CCC')
  })

  it('sequência de 3 items mantém índices corretos', () => {
    session.addCapture('data:image/png;base64,A')
    session.addCapture('data:image/png;base64,B')
    session.addCapture('data:image/png;base64,C')
    vi.runAllTimers()

    const items: GalleryItem[] = onComplete.mock.calls[0][0]
    expect(items.map((i) => i.index)).toEqual([1, 2, 3])
  })
})

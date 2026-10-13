import { describe, expect, it } from 'vitest'
import { listWindows } from '../../src/main/windowList'

// Integração com o user32/dwmapi reais (koffi). Só roda no Windows; o runner de CI do
// release (windows-latest) cobre. Nada aqui depende de quais janelas estejam abertas.
describe.runIf(process.platform === 'win32')('listWindows (Windows real)', () => {
  it('CT-WL-01: devolve janelas bem formadas, sem lançar', () => {
    const list = listWindows()
    expect(Array.isArray(list)).toBe(true)
    for (const w of list) {
      expect(Number.isFinite(w.handle)).toBe(true)
      expect(typeof w.title).toBe('string')
      expect(typeof w.className).toBe('string')
      expect(w.exStyle).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(w.rect.x + w.rect.y + w.rect.width + w.rect.height)).toBe(true)
    }
  })

  it('CT-WL-02: chamadas repetidas continuam funcionando (callback nativo liberado)', () => {
    for (let i = 0; i < 25; i++) listWindows()
    expect(Array.isArray(listWindows())).toBe(true)
  })

  it('CT-WL-03: enumerar é rápido o bastante para ficar no caminho do atalho (< 250 ms)', () => {
    listWindows() // aquece o carregamento da biblioteca
    const t0 = performance.now()
    listWindows()
    expect(performance.now() - t0).toBeLessThan(250)
  })
})

describe.runIf(process.platform !== 'win32')('listWindows (fora do Windows)', () => {
  it('CT-WL-04: devolve lista vazia, sem lançar', () => {
    expect(listWindows()).toEqual([])
  })
})

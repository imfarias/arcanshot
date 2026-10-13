import { readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  OCR_MAX_DIMENSION,
  ocrScale,
  parseOcrOutput,
  readPngSize,
  recognizeDataUrl
} from '../../src/main/ocr'
import { pngBuffer, pngDataUrl } from '../factories/imageFactory'

describe('readPngSize (0012)', () => {
  it('CT-OC-01: lê largura e altura do cabeçalho', () => {
    expect(readPngSize(pngBuffer(321, 123))).toEqual({ width: 321, height: 123 })
  })

  it('CT-OC-02: o que não é PNG (ou é curto demais) devolve null', () => {
    expect(readPngSize(Buffer.from('não sou png, mas tenho mais de vinte e quatro bytes'))).toBeNull()
    expect(readPngSize(Buffer.alloc(8))).toBeNull()
  })
})

describe('ocrScale (0012)', () => {
  it('CT-OC-03: imagem que cabe no limite não é alterada (nunca amplia)', () => {
    expect(ocrScale(1920, 1080)).toBe(1)
    expect(ocrScale(OCR_MAX_DIMENSION, 10)).toBe(1)
    expect(ocrScale(40, 20)).toBe(1)
  })

  it('CT-OC-04: imagem acima do limite é reduzida pela maior dimensão', () => {
    expect(ocrScale(16000, 4000)).toBe(0.5)
    expect(ocrScale(1000, OCR_MAX_DIMENSION * 4)).toBe(0.25)
  })
})

describe('parseOcrOutput (0012)', () => {
  it('CT-OC-05: texto reconhecido, com quebras de linha normalizadas e sem sobras nas pontas', () => {
    const out = parseOcrOutput(
      JSON.stringify({ status: 'ok', language: 'pt-BR', text: '  Olá, mundo\r\nsegunda linha  \n' })
    )
    expect(out).toEqual({ ok: true, text: 'Olá, mundo\nsegunda linha', language: 'pt-BR' })
  })

  it('CT-OC-06: texto vazio ou só espaços é "empty", não sucesso', () => {
    expect(parseOcrOutput(JSON.stringify({ status: 'ok', language: 'en-US', text: ' \n ' }))).toEqual({
      ok: false,
      reason: 'empty'
    })
  })

  it('CT-OC-07: sem idioma de OCR instalado é "unavailable"', () => {
    expect(parseOcrOutput(JSON.stringify({ status: 'unavailable' }))).toEqual({
      ok: false,
      reason: 'unavailable'
    })
  })

  it('CT-OC-08: erro do script carrega a mensagem', () => {
    expect(parseOcrOutput(JSON.stringify({ status: 'error', message: 'falhou' }))).toEqual({
      ok: false,
      reason: 'error',
      error: 'falhou'
    })
  })

  it('CT-OC-09: saída que não é o combinado vira erro, sem lançar', () => {
    for (const raw of ['', 'oi', '[]', 'null', '{"status":"ok"}', '{"status":"maluco"}']) {
      const out = parseOcrOutput(raw)
      expect(out.ok).toBe(false)
      if (!out.ok) expect(out.reason).toBe('error')
    }
  })
})

describe('recognizeDataUrl (0012)', () => {
  it('CT-OC-10: dataUrl que não é imagem vira erro, sem lançar nem chamar o Windows', async () => {
    const out = await recognizeDataUrl('texto qualquer')
    expect(out.ok).toBe(false)
  })

  it.runIf(process.platform === 'win32')(
    'CT-OC-12: lê o texto de uma imagem real com o reconhecedor do Windows (e apaga o temporário)',
    async (ctx) => {
      const png = readFileSync(join(__dirname, '..', 'fixtures', 'ocr-texto.png'))
      const before = readdirSync(tmpdir()).filter((f) => f.startsWith('arcanshot-ocr-'))

      const out = await recognizeDataUrl('data:image/png;base64,' + png.toString('base64'))

      // Runner sem idioma de OCR instalado: não é defeito do código, só não há o que verificar.
      if (!out.ok && out.reason === 'unavailable') ctx.skip()
      expect(out.ok).toBe(true)
      if (out.ok) {
        const flat = out.text.toLowerCase().replace(/\s+/g, ' ')
        expect(flat).toContain('arcanshot')
        expect(flat).toContain('48291')
        expect(out.text.split('\n').length).toBeGreaterThanOrEqual(2) // uma linha por linha
      }
      const after = readdirSync(tmpdir()).filter((f) => f.startsWith('arcanshot-ocr-'))
      expect(after.length).toBeLessThanOrEqual(before.length)
    },
    60_000
  )

  it.runIf(process.platform === 'win32')(
    'CT-OC-11: imagem sem texto no Windows real não é sucesso (vazio ou indisponível)',
    async () => {
      const out = await recognizeDataUrl(pngDataUrl(200, 100, [255, 255, 255]))
      expect(out.ok).toBe(false)
      if (!out.ok) expect(['empty', 'unavailable']).toContain(out.reason)
    },
    60_000
  )
})

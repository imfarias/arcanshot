// @ts-expect-error script .mjs sem tipos
import { PIX, crc16, pixPayload } from '../../scripts/gen-pix.mjs'

describe('gen-pix', () => {
  it('CRC16-CCITT bate com o valor de referência', () => {
    expect(crc16('123456789')).toBe('29B1')
  })

  it('monta o BR Code estático com a chave, sem valor e com CRC válido', () => {
    const payload: string = pixPayload(PIX)
    expect(payload.startsWith('000201')).toBe(true)
    expect(payload).toContain(`0014br.gov.bcb.pix0136${PIX.key}`)
    expect(payload).toContain('5303986')
    expect(payload).toContain('5802BR')
    expect(payload).not.toMatch(/54\d{2}\d+\.\d{2}/) // sem campo 54 (valor livre)
    expect(payload).toContain('62070503***')
    const body = payload.slice(0, -4)
    expect(body.endsWith('6304')).toBe(true)
    expect(payload.slice(-4)).toBe(crc16(body))
  })

  it('respeita os limites de nome (25) e cidade (15)', () => {
    const payload: string = pixPayload({ key: 'k', name: 'N'.repeat(40), city: 'C'.repeat(30) })
    expect(payload).toContain(`5925${'N'.repeat(25)}`)
    expect(payload).toContain(`6015${'C'.repeat(15)}`)
  })
})

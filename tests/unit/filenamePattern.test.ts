import { describe, expect, it } from 'vitest'
import { formatFilename, validatePattern } from '@shared/filenamePattern'

const date = new Date(2026, 0, 5, 3, 7, 9) // 2026-01-05 03:07:09

describe('formatFilename', () => {
  it('CT-UN-01: expande todos os tokens com zero-padding', () => {
    expect(formatFilename('%Y-%m-%d_%H-%M-%S', date)).toBe('2026-01-05_03-07-09')
  })

  it('mantém texto literal ao redor dos tokens', () => {
    expect(formatFilename('Captura_%Y%m%d', date)).toBe('Captura_20260105')
  })

  it('CT-UN-02: sanitiza caracteres ilegais do Windows', () => {
    expect(formatFilename('shot:%H*teste?', date)).toBe('shot-03-teste-')
    expect(formatFilename('a<b>c|d', date)).toBe('a-b-c-d')
  })

  it('remove espaços nas pontas', () => {
    expect(formatFilename('  shot_%d  ', date)).toBe('shot_05')
  })
})

describe('validatePattern', () => {
  it('CT-UN-03: aceita o padrão default', () => {
    expect(validatePattern('Captura_%Y-%m-%d_%H-%M-%S')).toBeNull()
  })

  it('rejeita vazio e só espaços', () => {
    expect(validatePattern('')).toMatch(/vazio/)
    expect(validatePattern('   ')).toMatch(/vazio/)
  })

  it('rejeita padrões acima de 120 caracteres', () => {
    expect(validatePattern('a'.repeat(121))).toMatch(/120/)
  })

  it('rejeita caracteres ilegais', () => {
    for (const pattern of ['a/b', 'a\\b', 'a:b', 'a*b', 'a?b', 'a"b', 'a<b', 'a>b', 'a|b']) {
      expect(validatePattern(pattern), pattern).not.toBeNull()
    }
  })
})

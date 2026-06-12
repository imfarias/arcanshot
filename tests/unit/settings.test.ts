import { describe, expect, it } from 'vitest'
import { defaultSettings, mergeSettings, validateSettings } from '@shared/settings'
import { settingsFactory } from '../factories/settingsFactory'

describe('defaultSettings', () => {
  it('aponta para a subpasta ArcanShot dentro de Imagens', () => {
    const d = defaultSettings('C:\\Users\\vini\\Pictures')
    expect(d.saveDir).toBe('C:\\Users\\vini\\Pictures\\ArcanShot')
    expect(d.imageFormat).toBe('png')
    expect(d.hotkeyArea).toBe('PrintScreen')
  })
})

describe('mergeSettings (CT-UN-07)', () => {
  const base = defaultSettings('C:\\Pictures')

  it('aplica chaves conhecidas e ignora desconhecidas', () => {
    const merged = mergeSettings(base, { imageFormat: 'jpg', chaveEstranha: 'x' })
    expect(merged.imageFormat).toBe('jpg')
    expect('chaveEstranha' in merged).toBe(false)
  })

  it('ignora valores com tipo errado', () => {
    const merged = mergeSettings(base, { jpgQuality: 'alta', copyOnSave: 1 })
    expect(merged.jpgQuality).toBe(base.jpgQuality)
    expect(merged.copyOnSave).toBe(base.copyOnSave)
  })

  it('tolera entrada não-objeto', () => {
    expect(mergeSettings(base, null)).toEqual(base)
    expect(mergeSettings(base, 'lixo')).toEqual(base)
  })
})

describe('validateSettings (CT-UN-06)', () => {
  it('aceita settings da factory', () => {
    expect(validateSettings(settingsFactory())).toEqual({})
  })

  it.each([0, 101, 1.5, -3])('rejeita jpgQuality %s', (q) => {
    expect(validateSettings({ jpgQuality: q }).jpgQuality).toBeTruthy()
  })

  it('rejeita formato inválido', () => {
    expect(
      validateSettings({ imageFormat: 'gif' as unknown as 'png' }).imageFormat
    ).toBeTruthy()
  })

  it('rejeita atalhos duplicados (case-insensitive)', () => {
    const errors = validateSettings({ hotkeyArea: 'Ctrl+P', hotkeyFull: 'ctrl+p' })
    expect(errors.hotkeyArea).toMatch(/duplicado/i)
    expect(errors.hotkeyFull).toMatch(/duplicado/i)
  })

  it('rejeita saveDir e atalhos vazios', () => {
    const errors = validateSettings({ saveDir: '  ', hotkeyAll: '' })
    expect(errors.saveDir).toBeTruthy()
    expect(errors.hotkeyAll).toBeTruthy()
  })

  it('valida só o que foi enviado (parcial)', () => {
    expect(validateSettings({ copyOnSave: false })).toEqual({})
  })
})

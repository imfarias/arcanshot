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

// ---------------------------------------------------------------------------
// Feature 0008 — campos de embelezamento
// ---------------------------------------------------------------------------

describe('settings de embelezamento (CT-UN-40 a CT-UN-44)', () => {
  it('CT-UN-40: nasce desligado para não mudar o comportamento de quem já usa (RN-22)', () => {
    expect(defaultSettings('C:\\Pictures').beautifyEnabled).toBe(false)
  })

  it('CT-UN-41: traz os 5 campos com os defaults previstos', () => {
    const d = defaultSettings('C:\\Pictures')
    expect(d.beautifyBackground).toBe('graphite')
    expect(d.beautifyPadding).toBe(6)
    expect(d.beautifyRounded).toBe(true)
    expect(d.beautifyShadow).toBe(true)
  })

  it('CT-UN-42: settings.json antigo (sem os campos) recebe os defaults no merge', () => {
    const base = defaultSettings('C:\\Pictures')
    const legacy = {
      saveDir: 'D:\\Prints',
      filenamePattern: 'Captura_%Y',
      imageFormat: 'png',
      jpgQuality: 90,
      hotkeyArea: 'PrintScreen',
      hotkeyFull: 'Ctrl+PrintScreen',
      hotkeyAll: 'Shift+PrintScreen',
      launchOnStartup: false,
      copyOnSave: true,
      showNotifications: true,
      sequenceTimeoutSec: 5
    }
    const merged = mergeSettings(base, legacy)
    expect(merged.saveDir).toBe('D:\\Prints')
    expect(merged.beautifyEnabled).toBe(false)
    expect(merged.beautifyBackground).toBe('graphite')
    expect(merged.beautifyPadding).toBe(6)
    expect(merged.updateCheckOnStartup).toBe(true)
    expect(merged.updateAutoInstall).toBe(false)
  })

  it('CT-UN-43: validateSettings rejeita margem inválida', () => {
    expect(validateSettings({ beautifyPadding: 99 }).beautifyPadding).toBeTruthy()
    expect(validateSettings({ beautifyPadding: 3.5 }).beautifyPadding).toBeTruthy()
  })

  it('CT-UN-44: validateSettings rejeita fundo desconhecido', () => {
    expect(validateSettings({ beautifyBackground: 'inexistente' }).beautifyBackground).toBeTruthy()
  })

  it('aceita um parcial válido de embelezamento', () => {
    expect(validateSettings({ beautifyBackground: 'ocean', beautifyPadding: 10 })).toEqual({})
  })

  it('erros de embelezamento convivem com erros dos campos antigos', () => {
    const errors = validateSettings({ saveDir: '  ', beautifyPadding: 50 })
    expect(errors.saveDir).toBeTruthy()
    expect(errors.beautifyPadding).toBeTruthy()
  })
})

import type { AppSettings, FieldErrors } from './types'
import { validatePattern } from './filenamePattern'
import { DEFAULT_BACKGROUND_ID, validateBeautify } from './beautify'

export function defaultSettings(picturesDir: string): AppSettings {
  return {
    saveDir: `${picturesDir}\\ArcanShot`,
    filenamePattern: 'Captura_%Y-%m-%d_%H-%M-%S',
    imageFormat: 'png',
    jpgQuality: 90,
    hotkeyArea: 'PrintScreen',
    hotkeyFull: 'Ctrl+PrintScreen',
    hotkeyAll: 'Shift+PrintScreen',
    launchOnStartup: false,
    copyOnSave: true,
    showNotifications: true,
    sequenceTimeoutSec: 5,
    // RN-22: desligado por padrão — quem já usa o app não vê mudança até optar.
    beautifyEnabled: false,
    beautifyBackground: DEFAULT_BACKGROUND_ID,
    beautifyPadding: 6,
    beautifyRounded: true,
    beautifyShadow: true,
    updateCheckOnStartup: true,
    updateAutoInstall: false,
    // RN-07 (0009): desligado — o PDF continua como era até a pessoa optar.
    pdfUniformSize: false
  }
}

/** Merge tolerante: aplica do parcial apenas chaves conhecidas com o tipo certo. */
export function mergeSettings(base: AppSettings, partial: unknown): AppSettings {
  const result = { ...base }
  if (!partial || typeof partial !== 'object') return result
  const p = partial as Record<string, unknown>
  for (const key of Object.keys(base) as (keyof AppSettings)[]) {
    const value = p[key]
    if (value !== undefined && typeof value === typeof base[key]) {
      ;(result as Record<string, unknown>)[key] = value
    }
  }
  return result
}

/** Valida um parcial de settings. Retorna mapa de erros por campo (vazio = válido). */
export function validateSettings(partial: Partial<AppSettings>): FieldErrors {
  const errors: FieldErrors = {}

  if (partial.saveDir !== undefined && partial.saveDir.trim().length === 0) {
    errors.saveDir = 'Informe a pasta padrão para salvar'
  }
  if (partial.filenamePattern !== undefined) {
    const patternError = validatePattern(partial.filenamePattern)
    if (patternError) errors.filenamePattern = patternError
  }
  if (partial.imageFormat !== undefined && !['png', 'jpg'].includes(partial.imageFormat)) {
    errors.imageFormat = 'Formato deve ser png ou jpg'
  }
  if (
    partial.jpgQuality !== undefined &&
    (!Number.isInteger(partial.jpgQuality) || partial.jpgQuality < 1 || partial.jpgQuality > 100)
  ) {
    errors.jpgQuality = 'Qualidade deve ser um inteiro entre 1 e 100'
  }

  const hotkeys: { key: 'hotkeyArea' | 'hotkeyFull' | 'hotkeyAll'; label: string }[] = [
    { key: 'hotkeyArea', label: 'capturar área' },
    { key: 'hotkeyFull', label: 'tela atual' },
    { key: 'hotkeyAll', label: 'todos os monitores' }
  ]
  for (const { key, label } of hotkeys) {
    const value = partial[key]
    if (value !== undefined && value.trim().length === 0) {
      errors[key] = `Informe o atalho para ${label}`
    }
  }
  const provided = hotkeys
    .map(({ key }) => ({ key, value: partial[key]?.trim().toLowerCase() }))
    .filter((h) => h.value)
  for (const a of provided) {
    if (provided.some((b) => b.key !== a.key && b.value === a.value)) {
      errors[a.key] = 'Atalho duplicado com outra ação'
    }
  }

  if (partial.sequenceTimeoutSec !== undefined) {
    const t = partial.sequenceTimeoutSec
    if (!Number.isInteger(t) || t < 2 || t > 60) {
      errors.sequenceTimeoutSec = 'Tempo deve ser um inteiro entre 2 e 60 segundos'
    }
  }

  return { ...errors, ...validateBeautify(partial) }
}

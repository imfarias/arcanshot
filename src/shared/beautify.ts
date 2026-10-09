import type { AppSettings, FieldErrors } from './types'

export interface BeautifyOptions {
  enabled: boolean
  background: string
  /** % da menor dimensão da captura (0–20). */
  padding: number
  rounded: boolean
  shadow: boolean
}

export interface BackgroundPreset {
  id: string
  label: string
  type: 'none' | 'solid' | 'gradient'
  /** Vazio para `none`; 1 cor para `solid`; 2 para `gradient`. */
  colors: string[]
}

export interface BeautifyShadow {
  blur: number
  offsetY: number
  color: string
}

export interface BeautifyLayout {
  padding: number
  radius: number
  shadow: BeautifyShadow | null
  width: number
  height: number
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { id: 'none', label: 'Nenhum (transparente)', type: 'none', colors: [] },
  { id: 'graphite', label: 'Grafite', type: 'solid', colors: ['#18181b'] },
  { id: 'paper', label: 'Papel', type: 'solid', colors: ['#f4f4f5'] },
  { id: 'sunset', label: 'Pôr do sol', type: 'gradient', colors: ['#ff7a18', '#af002d'] },
  { id: 'ocean', label: 'Oceano', type: 'gradient', colors: ['#2e3192', '#1bffff'] },
  { id: 'forest', label: 'Floresta', type: 'gradient', colors: ['#11998e', '#38ef7d'] },
  { id: 'violet', label: 'Violeta', type: 'gradient', colors: ['#654ea3', '#eaafc8'] }
]

export const DEFAULT_BACKGROUND_ID = 'graphite'

export const MIN_PADDING_PCT = 0
export const MAX_PADDING_PCT = 20

/** Proporções do acabamento — todas relativas à menor dimensão (RN-17). */
const RADIUS_FACTOR = 0.025
const MIN_RADIUS = 6
const MAX_RADIUS = 48
const SHADOW_BLUR_FACTOR = 0.5
const SHADOW_OFFSET_FACTOR = 0.18
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.35)'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

/** Preset por id; id desconhecido cai no padrão em vez de lançar. */
export function resolveBackground(id: string): BackgroundPreset {
  return (
    BACKGROUND_PRESETS.find((p) => p.id === id) ??
    BACKGROUND_PRESETS.find((p) => p.id === DEFAULT_BACKGROUND_ID)!
  )
}

export function isKnownBackground(id: string): boolean {
  return BACKGROUND_PRESETS.some((p) => p.id === id)
}

/**
 * Preset que pinta o fundo da página no PDF (0010), ou null quando não há o que pintar:
 * id ausente, desconhecido ou transparente. Aceita `unknown` porque o id vem do renderer.
 */
export function pageBackground(id: unknown): BackgroundPreset | null {
  if (typeof id !== 'string') return null
  const preset = BACKGROUND_PRESETS.find((p) => p.id === id)
  return preset && preset.type !== 'none' ? preset : null
}

/** Opções de embelezamento derivadas das settings persistidas. */
export function beautifyFromSettings(settings: AppSettings): BeautifyOptions {
  return {
    enabled: settings.beautifyEnabled,
    background: settings.beautifyBackground,
    padding: settings.beautifyPadding,
    rounded: settings.beautifyRounded,
    shadow: settings.beautifyShadow
  }
}

/**
 * Geometria do acabamento para uma captura de `inner`.
 *
 * Tudo é proporcional à menor dimensão (RN-17): um print de 300 px e outro de 3000 px
 * recebem acabamentos visualmente equivalentes.
 */
export function computeBeautifyLayout(
  inner: { width: number; height: number },
  opts: Pick<BeautifyOptions, 'padding' | 'rounded' | 'shadow'>
): BeautifyLayout {
  const base = Math.min(inner.width, inner.height)
  const pct = clamp(opts.padding, MIN_PADDING_PCT, MAX_PADDING_PCT)
  const padding = Math.round((base * pct) / 100)
  const radius = opts.rounded ? clamp(Math.round(base * RADIUS_FACTOR), MIN_RADIUS, MAX_RADIUS) : 0

  // Sem margem não há onde a sombra aparecer — desenhá-la só produziria um artefato
  // recortado na borda do canvas.
  const shadow =
    opts.shadow && padding > 0
      ? {
          blur: Math.round(padding * SHADOW_BLUR_FACTOR),
          offsetY: Math.round(padding * SHADOW_OFFSET_FACTOR),
          color: SHADOW_COLOR
        }
      : null

  return {
    padding,
    radius,
    shadow,
    width: inner.width + padding * 2,
    height: inner.height + padding * 2
  }
}

/**
 * RN-18: JPG não tem canal alfa — fundo transparente viraria preto.
 * Com acabamento ligado e fundo `none`, a exportação é forçada a PNG.
 */
export function pickExportFormat(
  format: 'png' | 'jpg',
  opts: Pick<BeautifyOptions, 'enabled' | 'background'>
): 'png' | 'jpg' {
  if (opts.enabled && resolveBackground(opts.background).type === 'none') return 'png'
  return format
}

/** Valida os campos de embelezamento de um parcial de settings. */
export function validateBeautify(partial: Partial<AppSettings>): FieldErrors {
  const errors: FieldErrors = {}

  if (partial.beautifyBackground !== undefined && !isKnownBackground(partial.beautifyBackground)) {
    errors.beautifyBackground = 'Fundo desconhecido'
  }
  if (partial.beautifyPadding !== undefined) {
    const p = partial.beautifyPadding
    if (!Number.isInteger(p) || p < MIN_PADDING_PCT || p > MAX_PADDING_PCT) {
      errors.beautifyPadding = `Margem deve ser um inteiro entre ${MIN_PADDING_PCT} e ${MAX_PADDING_PCT}`
    }
  }

  return errors
}

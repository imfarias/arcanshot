import { describe, expect, it } from 'vitest'
import {
  BACKGROUND_PRESETS,
  DEFAULT_BACKGROUND_ID,
  beautifyFromSettings,
  computeBeautifyLayout,
  isKnownBackground,
  pageBackground,
  pickExportFormat,
  resolveBackground,
  validateBeautify
} from '@shared/beautify'
import { settingsFactory } from '../factories/settingsFactory'

const OPTS = { padding: 10, rounded: true, shadow: true }

describe('BACKGROUND_PRESETS (CT-BE-01)', () => {
  it('CT-BE-01: inclui `none` e cada preset tem cores coerentes com o tipo', () => {
    expect(BACKGROUND_PRESETS.some((p) => p.id === 'none')).toBe(true)
    for (const preset of BACKGROUND_PRESETS) {
      expect(preset.id).toBeTruthy()
      expect(preset.label).toBeTruthy()
      if (preset.type === 'none') expect(preset.colors).toHaveLength(0)
      if (preset.type === 'solid') expect(preset.colors).toHaveLength(1)
      if (preset.type === 'gradient') expect(preset.colors).toHaveLength(2)
    }
  })

  it('ids são únicos', () => {
    const ids = BACKGROUND_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('resolveBackground (CT-BE-02, CT-BE-03)', () => {
  it('CT-BE-02: devolve o preset pedido', () => {
    expect(resolveBackground('ocean').id).toBe('ocean')
    expect(resolveBackground('none').type).toBe('none')
  })

  it('CT-BE-03: id desconhecido cai no padrão sem lançar', () => {
    expect(() => resolveBackground('inexistente')).not.toThrow()
    expect(resolveBackground('inexistente').id).toBe(DEFAULT_BACKGROUND_ID)
  })

  it('isKnownBackground distingue conhecidos de desconhecidos', () => {
    expect(isKnownBackground('forest')).toBe(true)
    expect(isKnownBackground('nao-existe')).toBe(false)
  })
})

describe('computeBeautifyLayout (CT-BE-04 a CT-BE-11)', () => {
  it('CT-BE-04: margem é percentual da MENOR dimensão', () => {
    // menor dimensão 400 → 10% = 40, mesmo com largura 1000
    expect(computeBeautifyLayout({ width: 1000, height: 400 }, OPTS).padding).toBe(40)
    expect(computeBeautifyLayout({ width: 400, height: 1000 }, OPTS).padding).toBe(40)
  })

  it('CT-BE-05: saída = interna + 2× margem nos dois eixos', () => {
    const layout = computeBeautifyLayout({ width: 1000, height: 400 }, OPTS)
    expect(layout.width).toBe(1000 + 80)
    expect(layout.height).toBe(400 + 80)
  })

  it('CT-BE-06: margem 0 produz saída idêntica à interna', () => {
    const layout = computeBeautifyLayout({ width: 800, height: 600 }, { ...OPTS, padding: 0 })
    expect(layout.padding).toBe(0)
    expect(layout.width).toBe(800)
    expect(layout.height).toBe(600)
  })

  it('CT-BE-07: raio é proporcional e limitado entre 6 e 48', () => {
    expect(computeBeautifyLayout({ width: 800, height: 800 }, OPTS).radius).toBe(20)
    // muito pequeno → piso de 6
    expect(computeBeautifyLayout({ width: 40, height: 40 }, OPTS).radius).toBe(6)
    // muito grande → teto de 48
    expect(computeBeautifyLayout({ width: 8000, height: 8000 }, OPTS).radius).toBe(48)
  })

  it('CT-BE-08: rounded desligado zera o raio', () => {
    expect(computeBeautifyLayout({ width: 800, height: 800 }, { ...OPTS, rounded: false }).radius).toBe(0)
  })

  it('CT-BE-09: sombra é null quando desligada', () => {
    expect(computeBeautifyLayout({ width: 800, height: 600 }, { ...OPTS, shadow: false }).shadow).toBeNull()
  })

  it('CT-BE-10: sombra é null quando a margem é 0, mesmo ligada', () => {
    const layout = computeBeautifyLayout({ width: 800, height: 600 }, { ...OPTS, padding: 0 })
    expect(layout.shadow).toBeNull()
  })

  it('sombra ligada com margem produz blur e deslocamento proporcionais', () => {
    const layout = computeBeautifyLayout({ width: 1000, height: 1000 }, OPTS)
    expect(layout.shadow).not.toBeNull()
    expect(layout.shadow!.blur).toBe(50)
    expect(layout.shadow!.offsetY).toBe(18)
  })

  it('CT-BE-11: prints pequeno e grande recebem acabamento proporcionalmente igual (RN-17)', () => {
    const small = computeBeautifyLayout({ width: 300, height: 300 }, OPTS)
    const large = computeBeautifyLayout({ width: 3000, height: 3000 }, OPTS)
    expect(small.padding / 300).toBeCloseTo(large.padding / 3000, 5)
    expect(small.width / small.height).toBeCloseTo(large.width / large.height, 5)
  })

  it('margem fora da faixa é limitada em vez de lançar', () => {
    expect(computeBeautifyLayout({ width: 1000, height: 1000 }, { ...OPTS, padding: 999 }).padding).toBe(200)
    expect(computeBeautifyLayout({ width: 1000, height: 1000 }, { ...OPTS, padding: -5 }).padding).toBe(0)
  })
})

describe('pickExportFormat (CT-BE-12 a CT-BE-14)', () => {
  it('CT-BE-12: fundo transparente com acabamento ligado força PNG (RN-18)', () => {
    expect(pickExportFormat('jpg', { enabled: true, background: 'none' })).toBe('png')
  })

  it('CT-BE-13: fundo opaco respeita o formato escolhido', () => {
    expect(pickExportFormat('jpg', { enabled: true, background: 'graphite' })).toBe('jpg')
    expect(pickExportFormat('png', { enabled: true, background: 'graphite' })).toBe('png')
  })

  it('CT-BE-14: acabamento desligado não interfere no formato (RN-22)', () => {
    expect(pickExportFormat('jpg', { enabled: false, background: 'none' })).toBe('jpg')
  })
})

describe('validateBeautify (CT-BE-15 a CT-BE-17)', () => {
  it('CT-BE-15: rejeita margem fora da faixa ou não inteira', () => {
    expect(validateBeautify({ beautifyPadding: -1 }).beautifyPadding).toBeTruthy()
    expect(validateBeautify({ beautifyPadding: 21 }).beautifyPadding).toBeTruthy()
    expect(validateBeautify({ beautifyPadding: 5.5 }).beautifyPadding).toBeTruthy()
  })

  it('CT-BE-16: rejeita fundo desconhecido', () => {
    expect(validateBeautify({ beautifyBackground: 'arco-iris' }).beautifyBackground).toBeTruthy()
  })

  it('CT-BE-17: aceita parcial válido sem erros', () => {
    expect(validateBeautify({ beautifyBackground: 'ocean', beautifyPadding: 12 })).toEqual({})
    expect(validateBeautify({})).toEqual({})
  })
})

describe('pageBackground (0010)', () => {
  it('CT-PB-01: devolve o preset para fundos sólidos e degradês', () => {
    expect(pageBackground('violet')?.type).toBe('gradient')
    expect(pageBackground('graphite')?.colors).toEqual(['#18181b'])
  })

  it('CT-PB-02: transparente, desconhecido, ausente e de tipo errado não pintam nada', () => {
    for (const v of ['none', 'arco-iris', undefined, null, 42, {}, '']) {
      expect(pageBackground(v)).toBeNull()
    }
  })

  it('CT-PB-03: todo preset pintável tem cores no formato #rrggbb que o PDF entende', () => {
    for (const p of BACKGROUND_PRESETS.filter((x) => x.type !== 'none')) {
      for (const c of p.colors) expect(c).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})

describe('beautifyFromSettings', () => {
  it('extrai as opções dos campos planos de AppSettings', () => {
    const settings = settingsFactory.beautified()
    expect(beautifyFromSettings(settings)).toEqual({
      enabled: true,
      background: 'graphite',
      padding: 8,
      rounded: true,
      shadow: true
    })
  })
})

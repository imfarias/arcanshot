import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'
import type { BeautifyOptions } from '@shared/beautify'
import { BACKGROUND_PRESETS, MAX_PADDING_PCT, MIN_PADDING_PCT } from '@shared/beautify'

export interface BeautifyPanelProps {
  options: BeautifyOptions
  onChange: (patch: Partial<BeautifyOptions>) => void
  /** Devolve um dataUrl do resultado reduzido, ou null se não houver o que mostrar. */
  renderPreview: (options: BeautifyOptions) => string | null
}

/** Amostra visual de um preset — reproduz sólido/gradiente/transparente em CSS. */
function swatchStyle(colors: string[], type: string): { background: string } {
  if (type === 'none') {
    return {
      background:
        'repeating-conic-gradient(#9ca3af 0% 25%, #e5e7eb 0% 50%) 50% / 10px 10px'
    }
  }
  if (type === 'gradient') {
    return { background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }
  }
  return { background: colors[0] }
}

export function BeautifyPanel(props: BeautifyPanelProps): ReactNode {
  const { options, onChange, renderPreview } = props
  const [preview, setPreview] = useState<string | null>(null)
  const [previewFailed, setPreviewFailed] = useState(false)
  const uid = useId()
  const paddingId = `${uid}-padding`
  const enabledId = `${uid}-enabled`
  const roundedId = `${uid}-rounded`
  const shadowId = `${uid}-shadow`

  // RN-16: o preview reflete o resultado final; recalculado a cada ajuste.
  useEffect(() => {
    try {
      setPreview(renderPreview(options))
      setPreviewFailed(false)
    } catch {
      setPreview(null)
      setPreviewFailed(true)
    }
  }, [options, renderPreview])

  return (
    <div className="beautify-panel" data-testid="editor-beautify-panel" role="group" aria-label="Opções de embelezamento">
      <div className="beautify-preview">
        {preview ? (
          <img src={preview} alt="Prévia do acabamento" data-testid="editor-beautify-preview" />
        ) : (
          <p className="beautify-preview-empty" data-testid="editor-beautify-preview-empty">
            {previewFailed ? 'Não foi possível gerar a prévia' : 'Sem prévia disponível'}
          </p>
        )}
      </div>

      <div className="beautify-row">
        <input
          type="checkbox"
          id={enabledId}
          data-testid="editor-beautify-enabled"
          checked={options.enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
        />
        <label htmlFor={enabledId}>Embelezar ao copiar/salvar</label>
      </div>

      <fieldset className="beautify-fieldset">
        <legend>Fundo</legend>
        <div className="beautify-swatches">
          {BACKGROUND_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`beautify-swatch ${options.background === preset.id ? 'active' : ''}`}
              style={swatchStyle(preset.colors, preset.type)}
              aria-label={preset.label}
              aria-pressed={options.background === preset.id}
              title={preset.label}
              data-testid={`editor-beautify-bg-${preset.id}`}
              onClick={() => onChange({ background: preset.id })}
            />
          ))}
        </div>
      </fieldset>

      <div className="beautify-row">
        <label htmlFor={paddingId}>Margem</label>
        <input
          type="range"
          id={paddingId}
          data-testid="editor-beautify-padding"
          min={MIN_PADDING_PCT}
          max={MAX_PADDING_PCT}
          step={1}
          value={options.padding}
          onChange={(e) => onChange({ padding: Number(e.target.value) })}
        />
        <span className="beautify-value" data-testid="editor-beautify-padding-value">
          {options.padding}%
        </span>
      </div>

      <div className="beautify-row">
        <input
          type="checkbox"
          id={roundedId}
          data-testid="editor-beautify-rounded"
          checked={options.rounded}
          onChange={(e) => onChange({ rounded: e.target.checked })}
        />
        <label htmlFor={roundedId}>Cantos arredondados</label>

        <input
          type="checkbox"
          id={shadowId}
          data-testid="editor-beautify-shadow"
          checked={options.shadow}
          onChange={(e) => onChange({ shadow: e.target.checked })}
        />
        <label htmlFor={shadowId}>Sombra</label>
      </div>
    </div>
  )
}

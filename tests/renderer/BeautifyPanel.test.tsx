// @vitest-environment jsdom
// Painel de embelezamento (feature 0008) — sucesso E erro, conforme §11 da arquitetura.
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import type { BeautifyOptions } from '@shared/beautify'
import { BACKGROUND_PRESETS } from '@shared/beautify'
import { BeautifyPanel } from '../../src/renderer/overlay/components/BeautifyPanel'

const OPTIONS: BeautifyOptions = {
  enabled: true,
  background: 'graphite',
  padding: 6,
  rounded: true,
  shadow: true
}

function setup(
  overrides: Partial<BeautifyOptions> = {},
  preview: () => string | null = () => 'data:image/png;base64,AA'
) {
  const onChange = vi.fn()
  const view = render(
    <BeautifyPanel
      options={{ ...OPTIONS, ...overrides }}
      onChange={onChange}
      renderPreview={preview}
    />
  )
  return { onChange, ...view }
}

describe('BeautifyPanel (CT-BP-01 a CT-BP-10)', () => {
  it('CT-BP-01: renderiza uma amostra por preset, incluindo "nenhum"', () => {
    setup()
    for (const preset of BACKGROUND_PRESETS) {
      expect(screen.getByTestId(`editor-beautify-bg-${preset.id}`)).toBeInTheDocument()
    }
    expect(screen.getByTestId('editor-beautify-bg-none')).toBeInTheDocument()
  })

  it('CT-BP-02: clicar num fundo emite onChange com o id (RN-19)', async () => {
    const user = userEvent.setup()
    const { onChange } = setup()

    await user.click(screen.getByTestId('editor-beautify-bg-ocean'))

    expect(onChange).toHaveBeenCalledWith({ background: 'ocean' })
  })

  it('CT-BP-03: mover o deslizante emite onChange com a margem (RN-19)', () => {
    const { onChange } = setup()
    const slider = screen.getByTestId('editor-beautify-padding')

    fireEvent.change(slider, { target: { value: '15' } })

    expect(onChange).toHaveBeenCalledWith({ padding: 15 })
  })

  it('CT-BP-04: alternar cantos e sombra emite onChange (RN-19)', async () => {
    const user = userEvent.setup()
    const { onChange } = setup()

    await user.click(screen.getByTestId('editor-beautify-rounded'))
    expect(onChange).toHaveBeenCalledWith({ rounded: false })

    await user.click(screen.getByTestId('editor-beautify-shadow'))
    expect(onChange).toHaveBeenCalledWith({ shadow: false })
  })

  it('CT-BP-05: o interruptor geral emite onChange com enabled (RN-15)', async () => {
    const user = userEvent.setup()
    const { onChange } = setup({ enabled: false })

    await user.click(screen.getByTestId('editor-beautify-enabled'))

    expect(onChange).toHaveBeenCalledWith({ enabled: true })
  })

  it('CT-BP-06: o fundo ativo é marcado com aria-pressed', () => {
    setup({ background: 'forest' })

    expect(screen.getByTestId('editor-beautify-bg-forest')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('editor-beautify-bg-graphite')).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it('CT-BP-07: o preview é regerado quando as opções mudam (RN-16)', () => {
    const preview = vi.fn().mockReturnValue('data:image/png;base64,AA')
    const { rerender } = render(
      <BeautifyPanel options={OPTIONS} onChange={vi.fn()} renderPreview={preview} />
    )
    expect(preview).toHaveBeenCalledTimes(1)

    rerender(
      <BeautifyPanel
        options={{ ...OPTIONS, padding: 12 }}
        onChange={vi.fn()}
        renderPreview={preview}
      />
    )
    expect(preview).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('editor-beautify-preview')).toBeInTheDocument()
  })

  it('CT-BP-08: falha ao gerar o preview mostra estado de erro sem quebrar o painel', () => {
    setup({}, () => {
      throw new Error('canvas indisponível')
    })

    expect(screen.getByTestId('editor-beautify-preview-empty').textContent).toContain(
      'Não foi possível gerar a prévia'
    )
    // controles continuam operáveis
    expect(screen.getByTestId('editor-beautify-padding')).toBeInTheDocument()
  })

  it('preview nulo mostra a mensagem neutra, não a de erro', () => {
    setup({}, () => null)
    expect(screen.getByTestId('editor-beautify-preview-empty').textContent).toContain(
      'Sem prévia disponível'
    )
  })

  it('CT-BP-09: todos os controles têm rótulo acessível associado', () => {
    setup()
    expect(screen.getByLabelText('Embelezar ao copiar/salvar')).toBeInTheDocument()
    expect(screen.getByLabelText('Margem')).toBeInTheDocument()
    expect(screen.getByLabelText('Cantos arredondados')).toBeInTheDocument()
    expect(screen.getByLabelText('Sombra')).toBeInTheDocument()
    expect(screen.getByLabelText('Oceano')).toBeInTheDocument()
  })

  it('CT-BP-10: sem violações de acessibilidade', async () => {
    const { container } = setup()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('exibe o valor atual da margem', () => {
    setup({ padding: 14 })
    expect(screen.getByTestId('editor-beautify-padding-value').textContent).toBe('14%')
  })
})

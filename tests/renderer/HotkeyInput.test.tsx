// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { HotkeyInput } from '../../src/renderer/settings/HotkeyInput'

function renderInput(value = 'PrintScreen', onChange = vi.fn()) {
  return render(
    <div>
      <label htmlFor="test-hotkey">Atalho de captura</label>
      <HotkeyInput
        id="test-hotkey"
        value={value}
        onChange={onChange}
        data-testid="hotkey-input"
      />
    </div>
  )
}

describe('HotkeyInput', () => {
  it('CT-HK-01: exibe o valor atual quando não está capturando', () => {
    renderInput('Ctrl+PrintScreen')
    expect(screen.getByTestId('hotkey-input')).toHaveValue('Ctrl+PrintScreen')
  })

  it('CT-HK-02: entra em modo captura ao focar e mostra placeholder', async () => {
    const user = userEvent.setup()
    renderInput()
    const input = screen.getByTestId('hotkey-input')
    await user.click(input)
    expect(input).toHaveAttribute('placeholder', 'Pressione a tecla…')
    expect(input).toHaveValue('')
  })

  it('CT-HK-03: captura tecla simples (PrintScreen) e chama onChange', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    renderInput('PrintScreen', onChange)
    await user.click(screen.getByTestId('hotkey-input'))
    await user.keyboard('{PrintScreen}')
    expect(onChange).toHaveBeenCalledWith('PrintScreen')
  })

  it('CT-HK-04: captura combinação Ctrl+P e chama onChange com "Ctrl+P"', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    renderInput('PrintScreen', onChange)
    await user.click(screen.getByTestId('hotkey-input'))
    await user.keyboard('{Control>}p{/Control}')
    expect(onChange).toHaveBeenCalledWith('Ctrl+P')
  })

  it('CT-HK-05: Esc cancela sem alterar o valor', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    renderInput('Shift+PrintScreen', onChange)
    await user.click(screen.getByTestId('hotkey-input'))
    await user.keyboard('{Escape}')
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByTestId('hotkey-input')).toHaveValue('Shift+PrintScreen')
  })

  it('CT-HK-06: sai do modo captura ao perder foco e restaura o valor anterior', async () => {
    const user = userEvent.setup()
    renderInput('Ctrl+PrintScreen')
    const input = screen.getByTestId('hotkey-input')
    await user.click(input)
    expect(input).toHaveValue('')
    await user.tab()
    expect(input).toHaveValue('Ctrl+PrintScreen')
  })

  it('CT-HK-07: modificadores sozinhos não disparam onChange', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    renderInput('PrintScreen', onChange)
    await user.click(screen.getByTestId('hotkey-input'))
    await user.keyboard('{Control}')
    await user.keyboard('{Alt}')
    await user.keyboard('{Shift}')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('CT-HK-08: sem violações de acessibilidade (axe)', async () => {
    const { container } = renderInput()
    expect(await axe(container)).toHaveNoViolations()
  })
})

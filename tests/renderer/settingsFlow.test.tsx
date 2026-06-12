// @vitest-environment jsdom
// Integração frontend: formulário completo com window.arcanshot mockado na fronteira
// do preload (equivalente ao "nível HTTP" num app web).
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AppSettings } from '@shared/types'
import { validateSettings } from '@shared/settings'
import { SettingsForm } from '../../src/renderer/settings/SettingsForm'
import { settingsFactory } from '../factories/settingsFactory'

/** Fake do main: valida de verdade e "persiste" em memória, como o handler real. */
function fakeMain(initial: AppSettings) {
  let stored = initial
  window.arcanshot = {
    getSettings: vi.fn().mockImplementation(() => Promise.resolve(stored)),
    saveSettings: vi.fn().mockImplementation((partial: Partial<AppSettings>) => {
      const fieldErrors = validateSettings(partial)
      if (Object.keys(fieldErrors).length > 0) return Promise.resolve({ ok: false, fieldErrors })
      stored = { ...stored, ...partial }
      return Promise.resolve({ ok: true, settings: stored })
    }),
    pickDirectory: vi.fn().mockResolvedValue({ ok: true, path: 'E:\\Prints' }),
    startCapture: vi.fn(),
    overlayInit: vi.fn(),
    beginEdit: vi.fn(),
    cancelOverlay: vi.fn(),
    copyImage: vi.fn(),
    saveImage: vi.fn(),
    saveImageAs: vi.fn(),
    getVersion: vi.fn().mockResolvedValue('0.1.0')
  }
  return { getStored: () => stored }
}

describe('Fluxo integrado do formulário de configurações', () => {
  it('CT-FI-01: carregar → editar 3 campos → salvar → persistido no fake main', async () => {
    const { getStored } = fakeMain(settingsFactory({ imageFormat: 'png' }))
    render(<SettingsForm />)
    const user = userEvent.setup()
    await screen.findByTestId('settings-form')

    await user.click(screen.getByTestId('settings-pick-dir'))
    await screen.findByDisplayValue('E:\\Prints')

    const pattern = screen.getByTestId('settings-filename-pattern')
    await user.clear(pattern)
    await user.type(pattern, 'Tela_%Y-%m-%d')
    await user.selectOptions(screen.getByTestId('settings-image-format'), 'jpg')
    await user.click(screen.getByTestId('settings-save'))

    await screen.findByTestId('settings-success')
    expect(getStored()).toMatchObject({
      saveDir: 'E:\\Prints',
      filenamePattern: 'Tela_%Y-%m-%d',
      imageFormat: 'jpg'
    })
  })

  it('CT-FI-02: erro do main → corrigir → salvar de novo → sucesso', async () => {
    const { getStored } = fakeMain(settingsFactory())
    render(<SettingsForm />)
    const user = userEvent.setup()
    await screen.findByTestId('settings-form')

    // provoca duplicidade real de atalhos (passa na validação local? não — então
    // usamos o mesmo validador: o erro aparece sem chamar o main, e corrigimos)
    const hotkeyFull = screen.getByTestId('settings-hotkey-full')
    await user.clear(hotkeyFull)
    await user.type(hotkeyFull, 'PrintScreen') // duplica com hotkeyArea
    await user.click(screen.getByTestId('settings-save'))

    await screen.findByTestId('settings-error-hotkey-full')
    expect(getStored().hotkeyFull).not.toBe('PrintScreen')

    await user.clear(hotkeyFull)
    await user.type(hotkeyFull, 'Ctrl+Alt+P')
    await user.click(screen.getByTestId('settings-save'))

    await screen.findByTestId('settings-success')
    expect(getStored().hotkeyFull).toBe('Ctrl+Alt+P')
  })
})

// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import type { ArcanshotApi } from '@shared/types'
import { SettingsForm } from '../../src/renderer/settings/SettingsForm'
import { settingsFactory } from '../factories/settingsFactory'

function mockApi(overrides: Partial<ArcanshotApi> = {}): ArcanshotApi {
  const settings = settingsFactory({
    saveDir: 'C:\\Users\\vini\\Pictures\\ArcanShot',
    filenamePattern: 'Captura_%Y-%m-%d_%H-%M-%S',
    imageFormat: 'png'
  })
  const api: ArcanshotApi = {
    getSettings: vi.fn().mockResolvedValue(settings),
    saveSettings: vi
      .fn()
      .mockImplementation((partial) => Promise.resolve({ ok: true, settings: { ...settings, ...partial } })),
    pickDirectory: vi.fn().mockResolvedValue({ ok: true }),
    startCapture: vi.fn(),
    overlayInit: vi.fn(),
    beginEdit: vi.fn(),
    cancelOverlay: vi.fn(),
    copyImage: vi.fn(),
    copyColor: vi.fn(),
    saveImage: vi.fn(),
    saveImageAs: vi.fn(),
    getVersion: vi.fn().mockResolvedValue('0.1.0'),
    galleryInit: vi.fn(),
    gallerySaveAll: vi.fn(),
    galleryExportPdf: vi.fn(),
    galleryDragItems: vi.fn().mockReturnValue({ ok: true }),
    galleryEditItem: vi.fn().mockResolvedValue({ ok: true }),
    galleryClose: vi.fn(),
    onGalleryRefresh: vi.fn().mockReturnValue(() => {}),
    ...overrides
  }
  window.arcanshot = api
  return api
}

async function renderForm(api = mockApi()) {
  const utils = render(<SettingsForm />)
  await screen.findByTestId('settings-form')
  return { ...utils, api }
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('SettingsForm', () => {
  it('CT-FC-01: exibe loading e então o formulário com os valores carregados', async () => {
    mockApi()
    render(<SettingsForm />)
    expect(screen.getByTestId('settings-loading')).toBeInTheDocument()
    const pattern = await screen.findByTestId('settings-filename-pattern')
    expect(pattern).toHaveValue('Captura_%Y-%m-%d_%H-%M-%S')
    expect(screen.getByTestId('settings-save-dir')).toHaveValue(
      'C:\\Users\\vini\\Pictures\\ArcanShot'
    )
  })

  it('CT-FC-02: salvar com sucesso exibe confirmação e envia o payload', async () => {
    const { api } = await renderForm()
    const user = userEvent.setup()
    const pattern = screen.getByTestId('settings-filename-pattern')
    await user.clear(pattern)
    await user.type(pattern, 'Shot_%Y%m%d')
    await user.click(screen.getByTestId('settings-save'))

    expect(await screen.findByTestId('settings-success')).toHaveTextContent(
      'Configurações salvas'
    )
    expect(api.saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ filenamePattern: 'Shot_%Y%m%d' })
    )
  })

  it('CT-FC-03: erro local de validação bloqueia o envio (não chama IPC)', async () => {
    const { api } = await renderForm()
    const user = userEvent.setup()
    const pattern = screen.getByTestId('settings-filename-pattern')
    await user.clear(pattern)
    await user.type(pattern, 'a/b')
    await user.click(screen.getByTestId('settings-save'))

    expect(await screen.findByTestId('settings-error-filename-pattern')).toBeInTheDocument()
    expect(api.saveSettings).not.toHaveBeenCalled()
  })

  it('CT-FC-04: fieldErrors do main aparecem por campo e o primeiro inválido recebe foco', async () => {
    const api = mockApi({
      saveSettings: vi.fn().mockResolvedValue({
        ok: false,
        fieldErrors: { hotkeyArea: 'Atalho duplicado com outra ação' }
      })
    })
    await renderForm(api)
    const user = userEvent.setup()
    await user.click(screen.getByTestId('settings-save'))

    expect(await screen.findByTestId('settings-error-hotkey-area')).toHaveTextContent(
      /duplicado/i
    )
    await waitFor(() => {
      expect(screen.getByTestId('settings-hotkey-area')).toHaveFocus()
    })
  })

  it('CT-FC-05: falha de IPC mostra erro global e o formulário continua usável', async () => {
    const api = mockApi({
      saveSettings: vi.fn().mockRejectedValue(new Error('ipc down'))
    })
    await renderForm(api)
    const user = userEvent.setup()
    await user.click(screen.getByTestId('settings-save'))

    expect(await screen.findByTestId('settings-global-error')).toHaveTextContent(/erro/i)
    expect(screen.getByTestId('settings-save')).toBeEnabled()
  })

  it('CT-FC-06: qualidade JPG desabilitada em png e habilitada em jpg', async () => {
    await renderForm()
    const user = userEvent.setup()
    expect(screen.getByTestId('settings-jpg-quality')).toBeDisabled()
    await user.selectOptions(screen.getByTestId('settings-image-format'), 'jpg')
    expect(screen.getByTestId('settings-jpg-quality')).toBeEnabled()
  })

  it('CT-FC-07: escolher pasta atualiza o campo; cancelar não altera', async () => {
    const api = mockApi({
      pickDirectory: vi
        .fn()
        .mockResolvedValueOnce({ ok: true, path: 'D:\\Capturas' })
        .mockResolvedValueOnce({ ok: true })
    })
    await renderForm(api)
    const user = userEvent.setup()

    await user.click(screen.getByTestId('settings-pick-dir'))
    await waitFor(() => {
      expect(screen.getByTestId('settings-save-dir')).toHaveValue('D:\\Capturas')
    })

    await user.click(screen.getByTestId('settings-pick-dir'))
    expect(screen.getByTestId('settings-save-dir')).toHaveValue('D:\\Capturas')
  })

  it('CT-FC-08: preview do nome atualiza ao digitar o padrão', async () => {
    await renderForm()
    const user = userEvent.setup()
    const pattern = screen.getByTestId('settings-filename-pattern')
    await user.clear(pattern)
    await user.type(pattern, 'Print_%Y')
    expect(screen.getByTestId('settings-filename-preview')).toHaveTextContent(
      `Print_${new Date().getFullYear()}`
    )
  })

  it('CT-FC-12: sem violações de acessibilidade (axe)', async () => {
    const { container } = await renderForm()
    expect(await axe(container)).toHaveNoViolations()
  })
})

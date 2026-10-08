// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import type { ArcanshotApi, GalleryInitData } from '@shared/types'
import { Gallery } from '../../src/renderer/gallery/Gallery'
import { settingsFactory } from '../factories/settingsFactory'

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function makeGalleryData(count = 2): GalleryInitData {
  return {
    items: Array.from({ length: count }, (_, i) => ({ index: i + 1, dataUrl: TINY_PNG })),
    settings: settingsFactory()
  }
}

function mockGalleryApi(overrides: Partial<ArcanshotApi> = {}): void {
  window.arcanshot = {
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
    pickDirectory: vi.fn(),
    startCapture: vi.fn(),
    overlayInit: vi.fn(),
    beginEdit: vi.fn(),
    cancelOverlay: vi.fn(),
    copyImage: vi.fn(),
    copyColor: vi.fn(),
    saveImage: vi.fn(),
    saveImageAs: vi.fn(),
    getVersion: vi.fn(),
    galleryInit: vi.fn().mockResolvedValue(makeGalleryData(3)),
    gallerySaveAll: vi.fn().mockResolvedValue({ ok: true, folder: 'C:\\Prints' }),
    galleryExportPdf: vi.fn().mockResolvedValue({ ok: true, filePath: 'C:\\doc.pdf' }),
    galleryDragItems: vi.fn().mockReturnValue({ ok: true }),
    galleryEditItem: vi.fn().mockResolvedValue({ ok: true }),
    galleryClose: vi.fn().mockResolvedValue(undefined),
    onGalleryRefresh: vi.fn().mockReturnValue(() => {}),
    ...overrides
  }
}

beforeEach(() => {
  vi.restoreAllMocks()
})

async function renderGallery(overrides: Partial<ArcanshotApi> = {}) {
  mockGalleryApi(overrides)
  const utils = render(<Gallery />)
  await screen.findByRole('list', { name: /capturas da sequência/i })
  return utils
}

describe('Gallery', () => {
  it('CT-GL-01: renderiza thumbnails com alt correto para cada item', async () => {
    await renderGallery()
    expect(screen.getByAltText('Captura 1')).toBeInTheDocument()
    expect(screen.getByAltText('Captura 2')).toBeInTheDocument()
    expect(screen.getByAltText('Captura 3')).toBeInTheDocument()
  })

  it('CT-GL-02: exibe contagem de capturas no header', async () => {
    await renderGallery()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('3 capturas na sequência')
  })

  it('CT-GL-03: "Salvar todas" chama gallerySaveAll e exibe sucesso', async () => {
    await renderGallery()
    const user = userEvent.setup()
    await user.click(screen.getByTestId('gallery-btn-save-all'))

    await screen.findByTestId('gallery-feedback')
    expect(screen.getByTestId('gallery-feedback')).toHaveTextContent(/C:\\Prints/)
    expect(window.arcanshot.gallerySaveAll).toHaveBeenCalledOnce()
  })

  it('CT-GL-04: "Salvar todas" em falha exibe mensagem de erro', async () => {
    await renderGallery({
      gallerySaveAll: vi.fn().mockResolvedValue({ ok: false, error: 'Permissão negada' })
    })
    const user = userEvent.setup()
    await user.click(screen.getByTestId('gallery-btn-save-all'))

    await screen.findByTestId('gallery-feedback')
    expect(screen.getByTestId('gallery-feedback')).toHaveTextContent(/Permissão negada/)
  })

  it('CT-GL-05: "Gerar PDF" chama galleryExportPdf e exibe sucesso', async () => {
    await renderGallery()
    const user = userEvent.setup()
    await user.click(screen.getByTestId('gallery-btn-export-pdf'))

    await screen.findByTestId('gallery-feedback')
    expect(screen.getByTestId('gallery-feedback')).toHaveTextContent(/C:\\doc\.pdf/)
    expect(window.arcanshot.galleryExportPdf).toHaveBeenCalledOnce()
  })

  it('CT-GL-06: "Gerar PDF" em falha exibe mensagem de erro', async () => {
    await renderGallery({
      galleryExportPdf: vi.fn().mockResolvedValue({ ok: false, error: 'Sem espaço em disco' })
    })
    const user = userEvent.setup()
    await user.click(screen.getByTestId('gallery-btn-export-pdf'))

    await screen.findByTestId('gallery-feedback')
    expect(screen.getByTestId('gallery-feedback')).toHaveTextContent(/Sem espaço em disco/)
  })

  it('CT-GL-07: "Fechar" chama galleryClose', async () => {
    await renderGallery()
    const user = userEvent.setup()
    await user.click(screen.getByTestId('gallery-btn-close'))
    expect(window.arcanshot.galleryClose).toHaveBeenCalledOnce()
  })

  it('CT-GL-08: DragStart de thumbnail não-selecionado chama galleryDragItems com apenas esse índice', async () => {
    await renderGallery()
    const items = screen.getAllByRole('listitem')
    // item[1] é index 2; nenhum selecionado → drag unitário
    fireEvent.dragStart(items[1])

    expect(window.arcanshot.galleryDragItems).toHaveBeenCalledWith([2])
  })

  it('CT-GL-09: zero violações de acessibilidade (axe)', async () => {
    const { container } = await renderGallery()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('CT-GL-10: checkbox altera classe gallery-item--selected no thumbnail', async () => {
    await renderGallery()
    const user = userEvent.setup()
    const items = screen.getAllByRole('listitem')
    const checkboxes = screen.getAllByRole('checkbox')

    expect(items[0]).not.toHaveClass('gallery-item--selected')
    await user.click(checkboxes[0])
    expect(items[0]).toHaveClass('gallery-item--selected')

    await user.click(checkboxes[0])
    expect(items[0]).not.toHaveClass('gallery-item--selected')
  })

  it('CT-GL-11: DragStart de thumbnail selecionado chama galleryDragItems com todos selecionados', async () => {
    await renderGallery()
    const user = userEvent.setup()
    const items = screen.getAllByRole('listitem')
    const checkboxes = screen.getAllByRole('checkbox')

    await user.click(checkboxes[0]) // seleciona índice 1
    await user.click(checkboxes[1]) // seleciona índice 2

    // Arrasta o primeiro (está selecionado) → deve arrastar 1 e 2
    fireEvent.dragStart(items[0])

    expect(window.arcanshot.galleryDragItems).toHaveBeenCalledWith(
      expect.arrayContaining([1, 2])
    )
    expect((window.arcanshot.galleryDragItems as ReturnType<typeof vi.fn>).mock.calls[0][0]).toHaveLength(2)
  })

  it('CT-GL-12: botão "Editar" desabilitado com 0 itens selecionados', async () => {
    await renderGallery()
    expect(screen.getByTestId('gallery-btn-edit')).toBeDisabled()
  })

  it('CT-GL-13: botão "Editar" desabilitado com 2+ itens selecionados', async () => {
    await renderGallery()
    const user = userEvent.setup()
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])
    await user.click(checkboxes[1])
    expect(screen.getByTestId('gallery-btn-edit')).toBeDisabled()
  })

  it('CT-GL-14: botão "Editar" com 1 selecionado chama galleryEditItem com índice correto', async () => {
    await renderGallery()
    const user = userEvent.setup()
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[1]) // seleciona índice 2

    const editBtn = screen.getByTestId('gallery-btn-edit')
    expect(editBtn).not.toBeDisabled()
    await user.click(editBtn)

    expect(window.arcanshot.galleryEditItem).toHaveBeenCalledWith(2)
  })

  it('CT-GL-15: onGalleryRefresh atualiza thumbnails quando disparado', async () => {
    let refreshCallback: (() => void) | null = null
    const updatedData = makeGalleryData(2)
    updatedData.items[0].dataUrl = 'data:image/png;base64,UPDATED'

    await renderGallery({
      onGalleryRefresh: vi.fn().mockImplementation((cb: () => void) => {
        refreshCallback = cb
        return () => {}
      }),
      galleryInit: vi
        .fn()
        .mockResolvedValueOnce(makeGalleryData(3))  // chamada inicial
        .mockResolvedValueOnce(updatedData)           // chamada após refresh
    })

    // Dispara refresh
    refreshCallback!()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('2 capturas na sequência')
    })
  })

  it('exibe loading enquanto galleryInit não resolve', () => {
    window.arcanshot = {
      ...window.arcanshot,
      galleryInit: vi.fn().mockReturnValue(new Promise(() => {}))
    }
    render(<Gallery />)
    expect(screen.getByRole('status')).toHaveTextContent(/Carregando/)
  })
})

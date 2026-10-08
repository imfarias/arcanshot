// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { Toolbar } from '../../src/renderer/overlay/components/Toolbar'
import type { ToolbarProps } from '../../src/renderer/overlay/components/Toolbar'

function makeProps(overrides: Partial<ToolbarProps> = {}): ToolbarProps {
  return {
    tool: 'select',
    onToolChange: vi.fn(),
    color: '#ef4444',
    onColorChange: vi.fn(),
    stroke: 'm',
    onStrokeChange: vi.fn(),
    canUndo: false,
    canRedo: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onCopy: vi.fn(),
    onSave: vi.fn(),
    onSaveAs: vi.fn(),
    onCancel: vi.fn(),
    showBeautify: false,
    beautifyOpen: false,
    beautifyEnabled: false,
    onToggleBeautify: vi.fn(),
    ...overrides
  }
}

describe('Toolbar', () => {
  it('renderiza as 9 ferramentas e as ações', () => {
    render(<Toolbar {...makeProps()} />)
    for (const tool of ['select', 'rect', 'ellipse', 'arrow', 'line', 'highlight', 'blur', 'text', 'step']) {
      expect(screen.getByTestId(`editor-tool-${tool}`)).toBeInTheDocument()
    }
    for (const action of ['copy', 'save', 'save-as', 'cancel']) {
      expect(screen.getByTestId(`editor-${action}`)).toBeInTheDocument()
    }
  })

  it('CT-FC-09: clicar numa ferramenta dispara callback e aria-pressed reflete a ativa', async () => {
    const props = makeProps({ tool: 'rect' })
    render(<Toolbar {...props} />)
    const user = userEvent.setup()

    expect(screen.getByTestId('editor-tool-rect')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('editor-tool-arrow')).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByTestId('editor-tool-arrow'))
    expect(props.onToolChange).toHaveBeenCalledWith('arrow')
  })

  it('CT-FC-10: undo/redo desabilitados conforme o histórico', () => {
    const { rerender } = render(<Toolbar {...makeProps({ canUndo: false, canRedo: false })} />)
    expect(screen.getByTestId('editor-undo')).toBeDisabled()
    expect(screen.getByTestId('editor-redo')).toBeDisabled()

    rerender(<Toolbar {...makeProps({ canUndo: true, canRedo: true })} />)
    expect(screen.getByTestId('editor-undo')).toBeEnabled()
    expect(screen.getByTestId('editor-redo')).toBeEnabled()
  })

  it('CT-FC-11: setas movem o foco entre os controles (roving)', async () => {
    render(<Toolbar {...makeProps()} />)
    const user = userEvent.setup()
    const first = screen.getByTestId('editor-tool-select')
    first.focus()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByTestId('editor-tool-rect')).toHaveFocus()

    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    // voltou e deu a volta para o último habilitado
    expect(first).not.toHaveFocus()
  })

  it('aciona as ações de exportação', async () => {
    const props = makeProps()
    render(<Toolbar {...props} />)
    const user = userEvent.setup()
    await user.click(screen.getByTestId('editor-copy'))
    await user.click(screen.getByTestId('editor-save'))
    await user.click(screen.getByTestId('editor-save-as'))
    await user.click(screen.getByTestId('editor-cancel'))
    expect(props.onCopy).toHaveBeenCalled()
    expect(props.onSave).toHaveBeenCalled()
    expect(props.onSaveAs).toHaveBeenCalled()
    expect(props.onCancel).toHaveBeenCalled()
  })

  it('CT-FC-12: sem violações de acessibilidade (axe)', async () => {
    const { container } = render(<Toolbar {...makeProps()} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

// ---------------------------------------------------------------------------
// Feature 0008 — ferramentas novas e botão de embelezar
// ---------------------------------------------------------------------------

describe('Toolbar — feature 0008 (CT-TB-10 a CT-TB-16)', () => {
  const NOVAS = [
    { id: 'pencil', label: 'Traço livre' },
    { id: 'redact', label: 'Tarja sólida' },
    { id: 'eyedropper', label: 'Conta-gotas' }
  ]

  it('CT-TB-10: as 3 ferramentas novas são renderizadas com aria-label', () => {
    render(<Toolbar {...makeProps()} />)
    for (const { id, label } of NOVAS) {
      const btn = screen.getByTestId(`editor-tool-${id}`)
      expect(btn).toBeInTheDocument()
      expect(btn).toHaveAttribute('aria-label', label)
    }
  })

  it('CT-TB-11: clicar em cada ferramenta nova emite onToolChange com o id certo', async () => {
    const user = userEvent.setup()
    for (const { id } of NOVAS) {
      const props = makeProps()
      const { unmount } = render(<Toolbar {...props} />)
      await user.click(screen.getByTestId(`editor-tool-${id}`))
      expect(props.onToolChange).toHaveBeenCalledWith(id)
      unmount()
    }
  })

  it('CT-TB-12: a ferramenta ativa recebe aria-pressed="true"', () => {
    render(<Toolbar {...makeProps({ tool: 'pencil' })} />)
    expect(screen.getByTestId('editor-tool-pencil')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('editor-tool-redact')).toHaveAttribute('aria-pressed', 'false')
  })

  it('CT-TB-13: o botão de embelezar emite onToggleBeautify', async () => {
    const user = userEvent.setup()
    const props = makeProps({ showBeautify: true })
    render(<Toolbar {...props} />)

    await user.click(screen.getByTestId('editor-beautify-toggle'))

    expect(props.onToggleBeautify).toHaveBeenCalledTimes(1)
  })

  it('CT-TB-14: o botão de embelezar não é renderizado quando não é oferecido (RN-21)', () => {
    render(<Toolbar {...makeProps({ showBeautify: false })} />)
    expect(screen.queryByTestId('editor-beautify-toggle')).not.toBeInTheDocument()
  })

  it('o botão de embelezar reflete o estado aberto em aria-pressed', () => {
    const { rerender } = render(<Toolbar {...makeProps({ showBeautify: true, beautifyOpen: false })} />)
    expect(screen.getByTestId('editor-beautify-toggle')).toHaveAttribute('aria-pressed', 'false')

    rerender(<Toolbar {...makeProps({ showBeautify: true, beautifyOpen: true })} />)
    expect(screen.getByTestId('editor-beautify-toggle')).toHaveAttribute('aria-pressed', 'true')
  })

  it('CT-TB-15: navegação por setas alcança os controles novos', async () => {
    const user = userEvent.setup()
    render(<Toolbar {...makeProps({ showBeautify: true })} />)

    const first = screen.getByTestId('editor-tool-select')
    first.focus()
    // percorre a toolbar inteira: com roving tabindex o foco circula
    for (let i = 0; i < 12; i++) {
      await user.keyboard('{ArrowRight}')
    }
    expect(document.activeElement).not.toBe(first)
    expect(document.activeElement?.tagName).toBe('BUTTON')
  })

  it('CT-TB-16: sem violações de acessibilidade após as adições', async () => {
    const { container } = render(<Toolbar {...makeProps({ showBeautify: true })} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

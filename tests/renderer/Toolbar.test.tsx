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

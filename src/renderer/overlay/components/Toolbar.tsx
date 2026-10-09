import { useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import type { ToolId } from '@shared/types'
import { Icon } from '../../shared/Icon'
import type { IconName } from '../../shared/Icon'

export type StrokeKey = 's' | 'm' | 'l'

export const TOOLBAR_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#111111']

const TOOLS: { id: ToolId; label: string; icon: IconName }[] = [
  { id: 'select', label: 'Ferramenta de seleção', icon: 'select' },
  { id: 'rect', label: 'Retângulo', icon: 'rect' },
  { id: 'ellipse', label: 'Elipse', icon: 'ellipse' },
  { id: 'arrow', label: 'Seta', icon: 'arrow' },
  { id: 'line', label: 'Linha', icon: 'line' },
  { id: 'pencil', label: 'Traço livre', icon: 'pencil' },
  { id: 'highlight', label: 'Marcador', icon: 'highlight' },
  { id: 'blur', label: 'Desfoque', icon: 'blur' },
  { id: 'redact', label: 'Tarja sólida', icon: 'redact' },
  { id: 'text', label: 'Texto', icon: 'text' },
  { id: 'step', label: 'Numeração passo-a-passo', icon: 'step' },
  { id: 'eyedropper', label: 'Conta-gotas', icon: 'eyedropper' }
]

const STROKES: { key: StrokeKey; label: string; size: number }[] = [
  { key: 's', label: 'Espessura fina', size: 6 },
  { key: 'm', label: 'Espessura média', size: 10 },
  { key: 'l', label: 'Espessura grossa', size: 14 }
]

export interface ToolbarProps {
  tool: ToolId
  onToolChange: (tool: ToolId) => void
  color: string
  onColorChange: (color: string) => void
  stroke: StrokeKey
  onStrokeChange: (stroke: StrokeKey) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onCopy: () => void
  onSave: () => void
  onSaveAs: () => void
  onCancel: () => void
  /** RN-21: ausente no modo de re-edição da galeria. */
  showBeautify?: boolean
  beautifyOpen?: boolean
  beautifyEnabled?: boolean
  onToggleBeautify?: () => void
}

export function Toolbar(props: ToolbarProps): ReactNode {
  const toolbarRef = useRef<HTMLDivElement>(null)

  // roving tabindex: setas movem o foco entre os controles habilitados
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    const root = toolbarRef.current
    if (!root) return
    const focusables = Array.from(
      root.querySelectorAll<HTMLElement>('button:not([disabled]), input[type="color"]')
    )
    const current = focusables.indexOf(document.activeElement as HTMLElement)
    if (current < 0) return
    event.preventDefault()
    const delta = event.key === 'ArrowRight' ? 1 : -1
    const next = (current + delta + focusables.length) % focusables.length
    focusables[next].focus()
  }

  return (
    <div
      ref={toolbarRef}
      className="toolbar"
      role="toolbar"
      aria-label="Ferramentas de anotação"
      data-testid="editor-toolbar"
      onKeyDown={handleKeyDown}
    >
      <div className="toolbar-group">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tool-btn ${props.tool === t.id ? 'active' : ''}`}
            aria-label={t.label}
            aria-pressed={props.tool === t.id}
            title={t.label}
            data-testid={`editor-tool-${t.id}`}
            onClick={() => props.onToolChange(t.id)}
          >
            <Icon name={t.icon} />
          </button>
        ))}
      </div>

      <div className="toolbar-sep" aria-hidden="true" />

      <div className="toolbar-group">
        {TOOLBAR_COLORS.map((c, i) => (
          <button
            key={c}
            type="button"
            className={`color-btn ${props.color === c ? 'active' : ''}`}
            style={{ backgroundColor: c }}
            aria-label={`Cor ${i + 1}`}
            aria-pressed={props.color === c}
            data-testid={`editor-color-${i}`}
            onClick={() => props.onColorChange(c)}
          />
        ))}
        <input
          type="color"
          className="color-custom"
          aria-label="Cor personalizada"
          data-testid="editor-color-custom"
          value={/^#[0-9a-fA-F]{6}$/.test(props.color) ? props.color : '#ff0000'}
          onChange={(e) => props.onColorChange(e.target.value)}
        />
      </div>

      <div className="toolbar-sep" aria-hidden="true" />

      <div className="toolbar-group">
        {STROKES.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`stroke-btn ${props.stroke === s.key ? 'active' : ''}`}
            aria-label={s.label}
            aria-pressed={props.stroke === s.key}
            title={s.label}
            data-testid={`editor-stroke-${s.key}`}
            onClick={() => props.onStrokeChange(s.key)}
          >
            <span className="stroke-dot" style={{ width: s.size, height: s.size }} />
          </button>
        ))}
      </div>

      <div className="toolbar-sep" aria-hidden="true" />

      <div className="toolbar-group">
        <button
          type="button"
          className="tool-btn"
          aria-label="Desfazer"
          title="Desfazer (Ctrl+Z)"
          data-testid="editor-undo"
          disabled={!props.canUndo}
          onClick={props.onUndo}
        >
          <Icon name="undo" />
        </button>
        <button
          type="button"
          className="tool-btn"
          aria-label="Refazer"
          title="Refazer (Ctrl+Y)"
          data-testid="editor-redo"
          disabled={!props.canRedo}
          onClick={props.onRedo}
        >
          <Icon name="redo" />
        </button>
      </div>

      <div className="toolbar-sep" aria-hidden="true" />

      <div className="toolbar-group">
        {props.showBeautify && (
          <button
            type="button"
            className={`action-btn ${props.beautifyEnabled ? 'is-on' : ''}`}
            aria-label="Embelezar para compartilhar"
            aria-pressed={props.beautifyOpen ?? false}
            title="Embelezar para compartilhar"
            data-testid="editor-beautify-toggle"
            onClick={props.onToggleBeautify}
          >
            <Icon name="beautify" />
          </button>
        )}
        <button
          type="button"
          className="action-btn"
          aria-label="Copiar para o clipboard"
          title="Copiar (Ctrl+C)"
          data-testid="editor-copy"
          onClick={props.onCopy}
        >
          <Icon name="copy" />
        </button>
        <button
          type="button"
          className="action-btn"
          aria-label="Salvar na pasta padrão"
          title="Salvar (Ctrl+S)"
          data-testid="editor-save"
          onClick={props.onSave}
        >
          <Icon name="save" />
        </button>
        <button
          type="button"
          className="action-btn"
          aria-label="Salvar como"
          title="Salvar como (Ctrl+Shift+S)"
          data-testid="editor-save-as"
          onClick={props.onSaveAs}
        >
          <Icon name="folder" />
        </button>
        <button
          type="button"
          className="action-btn cancel"
          aria-label="Cancelar captura"
          title="Cancelar (Esc)"
          data-testid="editor-cancel"
          onClick={props.onCancel}
        >
          <Icon name="close" />
        </button>
      </div>
    </div>
  )
}

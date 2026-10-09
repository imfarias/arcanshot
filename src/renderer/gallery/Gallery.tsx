import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { GalleryInitData, GalleryItem } from '@shared/types'
import { Icon } from '../shared/Icon'
import './gallery.css'

type FeedbackState = { kind: 'success'; message: string } | { kind: 'error'; message: string } | null

export function Gallery(): ReactNode {
  const [data, setData] = useState<GalleryInitData | null>(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  // tamanho real de cada captura, para a etiqueta da moldura de seleção
  const [sizes, setSizes] = useState<Record<number, string>>({})
  // 0009: páginas do PDF com o mesmo tamanho; nasce da preferência salva
  const [uniform, setUniform] = useState(false)

  function applyData(d: GalleryInitData): void {
    setData(d)
    setUniform(d.settings.pdfUniformSize)
  }

  useEffect(() => {
    void window.arcanshot.galleryInit().then((d) => {
      if (d) applyData(d)
    })
  }, [])

  // Escuta sinal de atualização do main (após re-edição de item)
  useEffect(() => {
    const unsubscribe = window.arcanshot.onGalleryRefresh(() => {
      void window.arcanshot.galleryInit().then((d) => {
        if (d) applyData(d)
      })
    })
    return unsubscribe
  }, [])

  function showFeedback(kind: 'success' | 'error', message: string): void {
    setFeedback({ kind, message })
    setTimeout(() => setFeedback(null), 4000)
  }

  function toggleSelect(index: number): void {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  function selectAll(items: GalleryItem[]): void {
    setSelected(new Set(items.map((i) => i.index)))
  }

  function clearSelection(): void {
    setSelected(new Set())
  }

  function handleDragStart(item: GalleryItem): void {
    // Se o item está selecionado, arrasta todos os selecionados; senão só esse.
    const indicesToDrag = selected.has(item.index) ? [...selected] : [item.index]
    window.arcanshot.galleryDragItems(indicesToDrag)
  }

  async function handleSaveAll(): Promise<void> {
    setBusy(true)
    try {
      const result = await window.arcanshot.gallerySaveAll()
      if (result.ok && result.folder) {
        showFeedback('success', `Salvo em ${result.folder}`)
      } else if (!result.ok && result.error) {
        showFeedback('error', result.error)
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleExportPdf(): Promise<void> {
    setBusy(true)
    try {
      const result = await window.arcanshot.galleryExportPdf({ uniformSize: uniform })
      if (result.ok && result.filePath) {
        showFeedback('success', `PDF salvo em ${result.filePath}`)
      } else if (!result.ok && result.error) {
        showFeedback('error', result.error)
      }
    } finally {
      setBusy(false)
    }
  }

  function handleUniformChange(value: boolean): void {
    setUniform(value)
    // Persistência melhor-esforço (FA-3): se falhar, o PDF desta galeria ainda segue o que
    // está marcado, porque o valor vai junto no pedido de exportação.
    try {
      void Promise.resolve(window.arcanshot.saveSettings({ pdfUniformSize: value })).catch(() => {})
    } catch {
      // idem
    }
  }

  function handleEdit(): void {
    if (selected.size !== 1) return
    const index = [...selected][0]
    void window.arcanshot.galleryEditItem(index)
  }

  async function handleClose(): Promise<void> {
    await window.arcanshot.galleryClose()
  }

  if (!data) {
    return (
      <main className="gallery-root" aria-label="Galeria de capturas">
        <div className="gallery-loading" role="status" aria-live="polite">
          Carregando capturas…
        </div>
      </main>
    )
  }

  const count = data.items.length
  const selectedCount = selected.size
  const allSelected = selectedCount === count && count > 0

  return (
    <main className="gallery-root" aria-label="Galeria de capturas">
      <header className="gallery-header">
        <div>
          <h1>
            {count} {count === 1 ? 'captura' : 'capturas'} na sequência
          </h1>
          <p className="gallery-hint">Clique para selecionar. Arraste para soltar em outro programa.</p>
        </div>
        <div className="gallery-header-actions">
          <button
            className="gallery-btn-text"
            data-testid="gallery-btn-select-all"
            onClick={() => (allSelected ? clearSelection() : selectAll(data.items))}
            aria-label={allSelected ? 'Desmarcar todas as capturas' : 'Selecionar todas as capturas'}
          >
            {allSelected ? 'Desmarcar todas' : 'Selecionar todas'}
          </button>
        </div>
      </header>

      <section className="gallery-grid-container">
        <ul className="gallery-grid" role="list" aria-label="Capturas da sequência">
          {data.items.map((item) => (
            <li
              key={item.index}
              className={`gallery-item${selected.has(item.index) ? ' gallery-item--selected' : ''}`}
              role="listitem"
              draggable
              onDragStart={() => handleDragStart(item)}
              aria-label={`Captura ${item.index} — arraste para compartilhar`}
            >
              <label className="gallery-item-checkbox-label" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  className="gallery-item-checkbox"
                  checked={selected.has(item.index)}
                  onChange={() => toggleSelect(item.index)}
                  aria-label={`Selecionar captura ${item.index}`}
                />
              </label>
              <img
                src={item.dataUrl}
                alt={`Captura ${item.index}`}
                draggable={false}
                onClick={() => toggleSelect(item.index)}
                onLoad={(e) => {
                  const { naturalWidth: w, naturalHeight: h } = e.currentTarget
                  setSizes((prev) => ({ ...prev, [item.index]: `${w} × ${h}` }))
                }}
              />
              <span className="gallery-item-badge" aria-hidden="true">
                {item.index}
              </span>
              {selected.has(item.index) && (
                <span className="sel-frame" aria-hidden="true">
                  <i className="h-tl" />
                  <i className="h-tr" />
                  <i className="h-bl" />
                  <i className="h-br" />
                  {sizes[item.index] && <span className="size-label">{sizes[item.index]}</span>}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <footer className="gallery-footer">
        <div className="gallery-footer-left">
          {feedback ? (
            <span
              className={`gallery-feedback gallery-feedback--${feedback.kind}`}
              role="status"
              aria-live="polite"
              data-testid="gallery-feedback"
            >
              {feedback.kind === 'success' && <Icon name="check" size={18} />}
              {feedback.message}
            </span>
          ) : (
            <span className="gallery-selection-count" aria-live="polite">
              {selectedCount > 0
                ? `${selectedCount} ${selectedCount === 1 ? 'selecionada' : 'selecionadas'}`
                : ''}
            </span>
          )}
        </div>

        <div className="gallery-option" title="Todas as páginas do PDF ficam do tamanho da maior captura">
          <input
            type="checkbox"
            id="gallery-pdf-uniform"
            data-testid="gallery-pdf-uniform"
            checked={uniform}
            disabled={busy}
            aria-describedby="gallery-pdf-uniform-help"
            onChange={(e) => handleUniformChange(e.target.checked)}
          />
          <label htmlFor="gallery-pdf-uniform">Páginas do mesmo tamanho</label>
          <span id="gallery-pdf-uniform-help" hidden>
            Ao gerar o PDF, todas as páginas ficam do tamanho da maior captura; as menores ficam centralizadas, sem esticar.
          </span>
        </div>

        <div className="bar gallery-bar">
          <button
            className="bar-btn"
            data-testid="gallery-btn-edit"
            disabled={selectedCount !== 1}
            onClick={handleEdit}
            aria-label="Editar captura selecionada no overlay"
            title={selectedCount === 1 ? undefined : 'Selecione uma captura para editar'}
          >
            <Icon name="pencil" size={18} />
            Editar
          </button>
          <span className="bar-sep" aria-hidden="true" />
          <button
            className="bar-btn is-primary"
            data-testid="gallery-btn-save-all"
            disabled={busy}
            onClick={() => void handleSaveAll()}
            aria-label="Salvar todas as capturas em uma pasta"
          >
            <Icon name="save" size={18} />
            Salvar todas
          </button>
          <button
            className="bar-btn"
            data-testid="gallery-btn-export-pdf"
            disabled={busy}
            onClick={() => void handleExportPdf()}
            aria-label="Exportar todas as capturas como PDF"
          >
            <Icon name="file" size={18} />
            Gerar PDF
          </button>
          <span className="bar-sep" aria-hidden="true" />
          <button
            className="bar-btn"
            data-testid="gallery-btn-close"
            onClick={() => void handleClose()}
            aria-label="Fechar galeria"
          >
            <Icon name="close" size={18} />
            Fechar
          </button>
        </div>
      </footer>
    </main>
  )
}

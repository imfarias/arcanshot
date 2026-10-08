import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { GalleryInitData, GalleryItem } from '@shared/types'
import './gallery.css'

type FeedbackState = { kind: 'success'; message: string } | { kind: 'error'; message: string } | null

export function Gallery(): ReactNode {
  const [data, setData] = useState<GalleryInitData | null>(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [selected, setSelected] = useState<Set<number>>(() => new Set())

  useEffect(() => {
    void window.arcanshot.galleryInit().then((d) => {
      if (d) setData(d)
    })
  }, [])

  // Escuta sinal de atualização do main (após re-edição de item)
  useEffect(() => {
    const unsubscribe = window.arcanshot.onGalleryRefresh(() => {
      void window.arcanshot.galleryInit().then((d) => {
        if (d) setData(d)
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
      const result = await window.arcanshot.galleryExportPdf()
      if (result.ok && result.filePath) {
        showFeedback('success', `PDF salvo em ${result.filePath}`)
      } else if (!result.ok && result.error) {
        showFeedback('error', result.error)
      }
    } finally {
      setBusy(false)
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
        <h1>
          {count} {count === 1 ? 'captura' : 'capturas'} na sequência
        </h1>
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
              />
              <span className="gallery-item-badge" aria-hidden="true">
                {item.index}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="gallery-footer">
        <div className="gallery-footer-left">
          <button
            className="gallery-btn gallery-btn-edit"
            data-testid="gallery-btn-edit"
            disabled={selectedCount !== 1}
            onClick={handleEdit}
            aria-label="Editar captura selecionada no overlay"
          >
            Editar
          </button>
          {selectedCount > 0 && (
            <span className="gallery-selection-count" aria-live="polite">
              {selectedCount} {selectedCount === 1 ? 'selecionada' : 'selecionadas'}
            </span>
          )}
        </div>

        <div className="gallery-footer-right">
          {feedback && (
            <span
              className={`gallery-feedback gallery-feedback--${feedback.kind}`}
              role="status"
              aria-live="polite"
              data-testid="gallery-feedback"
            >
              {feedback.message}
            </span>
          )}
          <button
            className="gallery-btn gallery-btn-primary"
            data-testid="gallery-btn-save-all"
            disabled={busy}
            onClick={() => void handleSaveAll()}
            aria-label="Salvar todas as capturas em uma pasta"
          >
            Salvar todas
          </button>
          <button
            className="gallery-btn gallery-btn-secondary"
            data-testid="gallery-btn-export-pdf"
            disabled={busy}
            onClick={() => void handleExportPdf()}
            aria-label="Exportar todas as capturas como PDF"
          >
            Gerar PDF
          </button>
          <button
            className="gallery-btn gallery-btn-close"
            data-testid="gallery-btn-close"
            onClick={() => void handleClose()}
            aria-label="Fechar galeria"
          >
            Fechar
          </button>
        </div>
      </footer>
    </main>
  )
}

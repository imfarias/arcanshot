# 0006 — Critérios de Aceitação

**Data:** 2026-06-13 · **Autor:** arc-lider (Momento A, via arc-specfull)

---

## Suite de Testes

### Componente Gallery (`tests/renderer/Gallery.test.tsx`)

| CT | Descrição | Verifica |
|---|---|---|
| CT-GL-01 | Thumbnails com `alt="Captura N"` | a11y: alt text |
| CT-GL-02 | Header com contagem correta | render correto |
| CT-GL-03 | "Salvar todas" → gallerySaveAll → feedback sucesso | ação principal |
| CT-GL-04 | "Salvar todas" em falha → feedback erro | erro |
| CT-GL-05 | "Gerar PDF" → galleryExportPdf → sucesso | ação PDF |
| CT-GL-06 | "Gerar PDF" em falha → feedback erro | erro PDF |
| CT-GL-07 | "Fechar" → galleryClose | fechar |
| CT-GL-08 | DragStart thumbnail não-selecionado → galleryDragItems([idx]) | drag unitário |
| CT-GL-09 | jest-axe: zero violações | a11y |
| CT-GL-10 | Checkbox altera classe `.gallery-item--selected` | seleção visual |
| CT-GL-11 | DragStart thumbnail selecionado → galleryDragItems com todos selecionados | drag multi |
| CT-GL-12 | Botão "Editar" desabilitado com 0 selecionados | estado UI |
| CT-GL-13 | Botão "Editar" desabilitado com 2+ selecionados | estado UI |
| CT-GL-14 | Botão "Editar" com 1 selecionado → galleryEditItem(idx) | re-edição |
| CT-GL-15 | `onGalleryRefresh` atualiza thumbnails quando chamado | refresh push |
| Extra | Loading enquanto galleryInit não resolve | UX loading |

### Regressão (arquivos não modificados)

- `tests/main/displayCacheStore.test.ts` (12 testes)
- `tests/main/captureSession.test.ts` (8 testes)
- `tests/main/pdfBuilder.test.ts` (3 testes)
- `tests/renderer/settingsFlow.test.tsx` (CTs existentes mantidos)
- `tests/renderer/HotkeyInput.test.tsx`

---

## Critérios de Aceitação Manual

| # | Cenário | Comportamento esperado |
|---|---|---|
| M-01 | Drag thumbnail único para Explorer | Arquivo copiado |
| M-02 | Selecionar 2 thumbnails e drag para Explorer | 2 arquivos copiados |
| M-03 | Selecionar 1 thumbnail e clicar "Editar" | Galeria some, overlay abre com imagem |
| M-04 | Anotar e Ctrl+S no overlay de redit | Galeria reaparece com thumbnail atualizado |
| M-05 | Pressionar Esc no overlay de redit | Galeria reaparece sem alteração |
| M-06 | Botão "Editar" com 0 selecionados | Botão desabilitado |
| M-07 | Botão "Editar" com 2 selecionados | Botão desabilitado |

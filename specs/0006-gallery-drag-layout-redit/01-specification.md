# 0006 — Galeria: Drag Corrigido, Multi-Select, Layout Limpo e Re-edição

**Data:** 2026-06-13 · **Autor:** arc-requisito (via arc-specfull)

---

## 1. Contexto

A galeria de sequências (feature 0005) tem três problemas:
1. **Drag quebrado** — `galleryDragItem` usa `ipcRenderer.invoke` (async): quando o main process recebe a mensagem, o gesto de drag nativo já terminou e `startDrag` não tem mais efeito.
2. **Drag unitário** — só é possível arrastar um arquivo por vez; usuário precisa arrastar um a um para o WhatsApp.
3. **Re-edição ausente** — após abrir a galeria, não é possível voltar a anotar uma captura.

---

## 2. Requisitos Funcionais

| ID | Requisito |
|---|---|
| RN-01 | Drag-and-drop para apps nativos (WhatsApp Desktop, Slack, Explorer) deve funcionar via `ipcRenderer.sendSync` + `ipcMain.on` com `event.returnValue`. |
| RN-02 | Thumbnails têm checkbox de seleção. |
| RN-03 | Arrastar thumbnail selecionado inicia drag de todos os itens selecionados (`startDrag({ files: string[] })`). |
| RN-04 | Arrastar thumbnail não-selecionado inicia drag apenas desse item (sem alterar seleção). |
| RN-05 | Header da galeria tem botão "Selecionar todas" e "Limpar seleção" (só visível quando há seleção). |
| RN-06 | Footer tem botão "Editar" habilitado somente quando exatamente 1 item está selecionado. |
| RN-07 | Clicar em "Editar" abre overlay de re-edição (modo `redit`): galeria se oculta, overlay abre em janela com barra de título, usuário anota normalmente. |
| RN-08 | Ao salvar/copiar no overlay de re-edição, a foto original na galeria é substituída pela nova versão anotada; galeria reabre. |
| RN-09 | Ao pressionar Esc no overlay de re-edição, galeria reabre sem alterar a foto. |
| RN-10 | Layout geral da galeria fica mais limpo (ver seção 5). |

---

## 3. Requisitos Não-Funcionais

- Sem nova dependência de runtime.
- Drag-and-drop: `startDrag` chamado sincronamente durante o evento de drag (mandado pelo browser engine).
- `sendSync` bloqueia o renderer thread no máximo por um tick de IPC (~1 ms); aceitável para drag.

---

## 4. Fora do Escopo

- Drag para WhatsApp Web (browser) — `startDrag` não funciona para páginas web Chromium por design do Electron.
- Seleção de itens individuais para PDF/salvar (salvar-todas e PDF sempre usam todos os itens da sessão).
- Reordenar itens na galeria.

---

## 5. Layout da Galeria (wireframe textual)

```
┌─────────────────────────────────────────────────────────┐
│ ArcanShot — 3 capturas na sequência  [Sel. todas][Limpar]│
├─────────────────────────────────────────────────────────┤
│ ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│ │☑  [img1] │  │☑  [img2] │  │☐  [img3] │               │
│ │         1│  │         2│  │         3│               │
│ └──────────┘  └──────────┘  └──────────┘               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ [Editar] 2 selecionadas │ [Salvar todas] [PDF] [Fechar] │
│ feedback...                                             │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Fluxo de Re-edição

```
Galeria visível
  → usuário seleciona 1 item
  → clica "Editar"
  → gallery:edit-item IPC
  → galeria se oculta (win.hide())
  → reditContext = { galleryIndex: N }
  → novo BrowserWindow com overlay/index.html (modo 'redit')
  → overlay abre em janela com barra de título, imagem carregada
  → usuário anota → Ctrl+S / Ctrl+C
  → editor:save/copy IPC
  → reditContext consumido
  → closeAllOverlays() (fecha redit win → closed event vê ctx=null → NÃO chama showGallery)
  → updateGalleryItem(N, newDataUrl) → mutata galleryInitData → overwrite temp file → showGallery()
  → galeria reaparece com thumbnail atualizado

Alternativa: usuário pressiona Esc
  → overlay:cancel IPC
  → closeAllOverlays() (redit win em overlayWindows → destruído → closed event vê ctx=N → clearReditContext + showGallery)
  → galeria reaparece sem alteração
```

---

## 7. Impacto em Testes Existentes

- `Gallery.test.tsx` CT-GL-08: `galleryDragItem` → `galleryDragItems`; novos CTs para checkbox e edição.
- `settingsFlow.test.tsx`, `SettingsForm.test.tsx`: mock atualizado (`galleryDragItem` → `galleryDragItems` + `galleryEditItem` + `onGalleryRefresh`).

---

## 8. Dúvidas em Aberto

Nenhuma crítica — decisões de produto já tomadas:
- Multi-drag via checkboxes ✓
- Re-edição substitui original na galeria ✓
- Galeria fica minimizada/oculta durante re-edição ✓

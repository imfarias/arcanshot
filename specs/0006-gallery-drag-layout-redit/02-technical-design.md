# 0006 — Design Técnico

**Data:** 2026-06-13 · **Autor:** arc-lider (Momento A, via arc-specfull)

---

## 1. Resumo do Design

### 1.1 Drag-and-drop corrigido (sendSync)

`ipcRenderer.sendSync` bloqueia o renderer até o main process responder — a resposta chega **durante** o gesto de drag, tornando `event.sender.startDrag()` válido.

```
renderer onDragStart → sendSync('gallery:drag-items-sync', [1,2])
main ipcMain.on → event.sender.startDrag({ files: [...] })
main → event.returnValue = { ok: true }
renderer ← retorno síncrono
```

### 1.2 Redit window via overlay.ts

O overlay de re-edição usa a mesma página `overlay/index.html` e o mesmo preload. A diferença:
- `mode: 'redit'` em `OverlayInitData`
- Janela criada com `frame: true`, `resizable: true` (não fullscreen)
- Registrada em `overlayWindows` via nova função `registerOverlayEntry` em `overlay.ts`
- Init data registrada em `initDataByWebContents` — `overlay:init` polling a encontra normalmente

### 1.3 Redit context (flag de handshake)

```
gallery.ts: reditContext: { galleryIndex: number } | null

getReditContext() / clearReditContext()
```

**Regra crítica de ordem em `editor:copy/save/save-as` (sucesso):**
1. `clearReditContext()` ← limpa ANTES de `closeAllOverlays`
2. `closeAllOverlays()` → `win.destroy()` → `closed` event → `getReditContext() === null` → NÃO chama `showGallery`
3. `updateGalleryItem(idx, dataUrl)` → mutata dados + overwrite temp file + `showGallery()`

**Regra para Esc (`overlay:cancel`):**
- `closeAllOverlays()` → `closed` event → `getReditContext() !== null` → `clearReditContext()` + `showGallery()`

### 1.4 Gallery refresh após redit

`showGallery()` envia `webContents.send('gallery:refresh')`. `Gallery.tsx` ouve via `onGalleryRefresh(cb)` exposto no preload e re-chama `galleryInit()` para atualizar o estado React com o novo `dataUrl`.

---

## 2. Alternativas Consideradas

| Alternativa | Razão de descarte |
|---|---|
| `ipcMain.handle` para drag (status quo) | Async — drag gesture termina antes do `startDrag` |
| Janela redit separada gerenciada em `gallery.ts` sem `overlayWindows` | `Esc` não fecharia via `closeAllOverlays` — exigiria duplicar lógica de cancelamento |
| Janela redit fullscreen como captura normal | UX ruim — usuário não vê que é uma re-edição; quer janela normal |
| `useRef` para dados de galeria no renderer | Não persiste entre hide/show; necessita signal push |

---

## 3. Arquivos e Mudanças

| Arquivo | Tipo | Mudança Principal |
|---|---|---|
| `src/shared/types.ts` | Modify | `CaptureMode += 'redit'`; `galleryDragItem` → `galleryDragItems(indices[]): {ok:boolean}` (sync); `galleryEditItem`, `onGalleryRefresh` |
| `src/main/overlay.ts` | Modify | Export `registerOverlayEntry`, `loadOverlayPage` |
| `src/main/gallery.ts` | Modify | redit context; `startGalleryEdit`; `hideGalleryForEdit`; `showGallery`; `updateGalleryItem`; `closeReditWin` (not needed — redit win em overlayWindows) |
| `src/main/ipc.ts` | Modify | `ipcMain.on('gallery:drag-items-sync', ...)`; `gallery:edit-item`; redit ctx em copy/save/save-as |
| `src/preload/index.ts` | Modify | `galleryDragItems` (sendSync); `galleryEditItem`; `onGalleryRefresh` |
| `src/renderer/overlay/Overlay.tsx` | Modify | `cssPerImage` para `redit`: `Math.min(innerW/w, innerH/h)` |
| `src/renderer/gallery/Gallery.tsx` | Modify | checkboxes; `selected: Set<number>`; multi-drag; botão Editar; listener `onGalleryRefresh` |
| `src/renderer/gallery/gallery.css` | Modify | Checkbox styling; layout limpo |
| `tests/renderer/Gallery.test.tsx` | Modify | Mocks atualizados; novos CTs |
| `tests/renderer/settingsFlow.test.tsx` | Modify | Mock atualizado |
| `tests/renderer/SettingsForm.test.tsx` | Modify | Mock atualizado |

---

## 4. Contrato de Tipos

```typescript
// src/shared/types.ts

type CaptureMode = 'area' | 'full' | 'all' | 'redit'

interface ArcanshotApi {
  // ... existentes sem mudança ...
  galleryInit(): Promise<GalleryInitData>
  gallerySaveAll(): Promise<{ ok: boolean; folder?: string; error?: string }>
  galleryExportPdf(): Promise<{ ok: boolean; filePath?: string; error?: string }>
  galleryDragItems(indices: number[]): { ok: boolean }          // sync (sendSync)
  galleryEditItem(index: number): Promise<{ ok: boolean }>
  galleryClose(): Promise<void>
  onGalleryRefresh(callback: () => void): () => void            // retorna unsubscribe
}
```

---

## 5. Decisões de Segurança / Robustez

- `sendSync` bloqueia renderer; aceitável pois a chamada retorna em < 1 ms (só `startDrag` local).
- `reditContext` é escalar — não há risco de race condition em processo main (single-threaded).
- `updateGalleryItem` é best-effort no overwrite do temp file (try/catch mudo).
- `onGalleryRefresh` retorna cleanup function — sem memory leak em hot-reload.

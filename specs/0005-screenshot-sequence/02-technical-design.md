# 0005 — Desenho Técnico

**Data:** 2026-06-13 · **Autor:** arc-lider (Momento A, via arc-specfull)

---

## 1. Resumo do Design

| Área | Mudança |
|---|---|
| `src/shared/types.ts` | Novo tipo `GalleryItem`; `ArcanshotApi` ganha canais `gallery:*` |
| `src/shared/settings.ts` | Novo campo `sequenceTimeoutSec: number` (padrão 5, min 2, max 60) |
| `src/main/captureSession.ts` | **Novo** — `CaptureSession(getTimeoutMs, onComplete)` com buffer + timer |
| `src/main/gallery.ts` | **Novo** — janela galeria + temp files de DnD + init data store |
| `src/main/ipc.ts` | `editor:copy/save/save-as` adicionam ao session; novos handlers `gallery:*` |
| `src/main/index.ts` | Instancia `CaptureSession`, passa via `IpcContext.session` |
| `electron.vite.config.ts` | Nova entrada `gallery` no rollupOptions.input |
| `src/renderer/gallery/` | **Novo** — página React com thumbnails, drag, botões de ação |
| `src/renderer/settings/SettingsForm.tsx` | Campo `sequenceTimeoutSec` + label + validação inline |
| `src/preload/index.ts` | Expõe `galleryInit`, `gallerySaveAll`, `galleryExportPdf`, `galleryDragItem`, `galleryClose` |
| `package.json` | Adiciona `pdf-lib` como dependência de runtime |

---

## 2. Alternativas Consideradas

### A1 — Timer por inatividade global (qualquer evento do usuário reseta)
Não implementado: muito intrusivo, o usuário pode estar lendo o primeiro print enquanto o timer corre. **Descartado.**

### A2 — Timer só conta entre prints completos ✅ (escolhida)
O timer inicia quando o editor fecha (save/copy/save-as). Cada novo print completado reseta o timer. Comportamento intuitivo e não-intrusivo.

### A3 — Galeria aberta sempre (mesmo com 1 print)
Mudaria o UX atual de single-shot que funciona bem. **Descartado** — galeria só aparece com ≥2.

### A4 — Geração de PDF no renderer (via Chromium print)
Exigiria um BrowserWindow headless e comunicação assíncrona complexa. `pdf-lib` no main process é mais simples, testável e sem novo BrowserWindow. **Descartado.**

---

## 3. Novos Tipos em `shared/types.ts`

```typescript
export interface GalleryItem {
  index: number       // 1-based
  dataUrl: string     // PNG ou JPG exportado pelo canvas
}

export interface GalleryInitData {
  items: GalleryItem[]
  settings: AppSettings
}
```

`ArcanshotApi` ganha:
```typescript
galleryInit(): Promise<GalleryInitData>
gallerySaveAll(): Promise<{ ok: boolean; folder?: string; error?: string }>
galleryExportPdf(): Promise<{ ok: boolean; filePath?: string; error?: string }>
galleryDragItem(index: number): Promise<{ ok: boolean }>
galleryClose(): Promise<void>
```

---

## 4. `CaptureSession` — Interface e Algoritmo

```typescript
class CaptureSession {
  constructor(
    getTimeoutMs: () => number,        // lê settings.sequenceTimeoutSec × 1000 a cada tick
    onComplete: (items: GalleryItem[]) => void  // abre galeria
  )
  addCapture(dataUrl: string): void   // adiciona ao buffer, reseta timer
  clearSession(): void                // cancela timer, limpa buffer
}
```

**Algoritmo `addCapture`:**
```
buffer.push({ index: buffer.length + 1, dataUrl })
clearTimeout(timer)
timer = setTimeout(() => {
  const captured = [...buffer]
  buffer = []
  if (captured.length >= 2) onComplete(captured)
  // se < 2: descarta silenciosamente
}, getTimeoutMs())
```

**Limite de segurança:** se `buffer.length >= 20`, dispara `onComplete` imediatamente sem esperar timer.

---

## 5. `gallery.ts` — Janela e Temp Files

```typescript
let galleryWin: BrowserWindow | null = null
let galleryInitData: GalleryInitData | null = null
let tempDir: string | null = null
let tempFiles: string[] = []  // indexed por GalleryItem.index - 1

export function openGalleryWindow(items: GalleryItem[], settings: AppSettings): void
export function getGalleryInitData(): GalleryInitData | null
export function getTempFilePath(index: number): string | null
export function closeGallery(): void
```

**`openGalleryWindow`:**
1. Se `galleryWin` existe e não foi destruída → `win.focus()` e retorna (RN-08)
2. Escreve temp files: `mkdtempSync(join(tmpdir(), 'arcanshot-'))` → para cada item: `writeFileSync(path, dataUrlToBuffer(dataUrl))`
3. Cria `BrowserWindow` (900×640, resizable, não fullscreen, `show: false`)
4. Carrega `gallery/index.html`
5. Em `ready-to-show` → `win.show()`
6. Em `closed` → limpa `tempDir`, `tempFiles`, `galleryWin`, `galleryInitData`

---

## 6. Novos IPC Handlers em `ipc.ts`

| Canal | Descrição |
|---|---|
| `gallery:init` | Polling idêntico ao `overlay:init` — retorna `GalleryInitData` quando disponível |
| `gallery:save-all` | Abre dialog de pasta → salva cada item com pattern `{filenamePattern}_001`, `_002`... |
| `gallery:export-pdf` | Abre dialog de arquivo `.pdf` → gera com `pdf-lib` → salva → retorna `{ ok, filePath }` |
| `gallery:drag-item` | `event.sender.startDrag({ file: tempFilePath, icon: thumbnail })` |
| `gallery:close` | Chama `closeGallery()` |

**Modificação em handlers existentes (session.addCapture):**
- `editor:copy` → após `clipboard.writeImage`: `ctx.session?.addCapture(dataUrl)`
- `editor:save` → após `closeAllOverlays()` com sucesso: `ctx.session?.addCapture(dataUrl)`
- `editor:save-as` → após `closeAllOverlays()` com sucesso: `ctx.session?.addCapture(dataUrl)`

`session` é opcional em `IpcContext` para não quebrar testes existentes.

---

## 7. `IpcContext` atualizado

```typescript
export interface IpcContext {
  store: SettingsStore
  applySettings: (settings: AppSettings) => void
  openSettingsWindow: () => void
  session?: CaptureSession    // opcional: apenas no app real, não em testes
}
```

---

## 8. `index.ts` — Wiring

```typescript
const session = new CaptureSession(
  () => store.load().sequenceTimeoutSec * 1000,
  (items) => openGalleryWindow(items, store.load())
)
registerIpcHandlers({ store, applySettings, openSettingsWindow, session })
```

---

## 9. `electron.vite.config.ts` — Nova entrada

```typescript
input: {
  overlay: resolve(__dirname, 'src/renderer/overlay/index.html'),
  settings: resolve(__dirname, 'src/renderer/settings/index.html'),
  gallery: resolve(__dirname, 'src/renderer/gallery/index.html'),
}
```

---

## 10. `Gallery.tsx` — Estrutura do componente

```
<main aria-label="Galeria de capturas">
  <header>
    <h1>N capturas na sequência</h1>
  </header>
  <section role="list" aria-label="Capturas">
    {items.map(item => (
      <article role="listitem" key={item.index} draggable onDragStart={...}>
        <img src={item.dataUrl} alt={`Captura ${item.index}`} />
        <span aria-hidden>{item.index}</span>
      </article>
    ))}
  </section>
  <footer>
    <button data-testid="gallery-btn-save-all">Salvar todas em pasta</button>
    <button data-testid="gallery-btn-export-pdf">Gerar PDF</button>
    <button data-testid="gallery-btn-close">Fechar</button>
  </footer>
</main>
```

**`onDragStart`:**
```typescript
const handleDragStart = (index: number) => (e: DragEvent) => {
  e.preventDefault()  // bloqueia drag HTML padrão (não funciona cross-app)
  void window.arcanshot.galleryDragItem(index)
}
```

---

## 11. `SettingsForm.tsx` — Novo campo

Campo numérico `sequenceTimeoutSec` com label "Tempo entre prints na sequência (segundos)". Validação inline: inteiro 2–60. `data-testid="settings-sequenceTimeoutSec"`.

---

## 12. Geração de PDF com `pdf-lib`

```typescript
import { PDFDocument } from 'pdf-lib'

async function buildPdf(items: GalleryItem[]): Promise<Buffer> {
  const doc = await PDFDocument.create()
  for (const item of items) {
    const buf = dataUrlToBuffer(item.dataUrl)
    const isPng = item.dataUrl.startsWith('data:image/png')
    const img = isPng ? await doc.embedPng(buf) : await doc.embedJpg(buf)
    const page = doc.addPage([img.width, img.height])
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
  }
  return Buffer.from(await doc.save())
}
```

---

## 13. Settings — `sequenceTimeoutSec`

**`shared/settings.ts`:**
- `defaultSettings`: `sequenceTimeoutSec: 5`
- `mergeSettings`: copiado como `number` (já coberto pela lógica genérica de tipos)
- `validateSettings`: `Inteiro, 2 ≤ x ≤ 60`

---

## 14. Preload — novos canais expostos

```typescript
galleryInit: () => ipcRenderer.invoke('gallery:init'),
gallerySaveAll: () => ipcRenderer.invoke('gallery:save-all'),
galleryExportPdf: () => ipcRenderer.invoke('gallery:export-pdf'),
galleryDragItem: (index: number) => ipcRenderer.invoke('gallery:drag-item', index),
galleryClose: () => ipcRenderer.invoke('gallery:close'),
```

---

## 15. Impacto em Testes

| Módulo | Cobertura |
|---|---|
| `CaptureSession` | `tests/main/captureSession.test.ts` — timer com fake timers Vitest |
| `Gallery.tsx` | `tests/renderer/Gallery.test.tsx` — thumbnails, drag, botões (sucesso E erro) |
| `SettingsForm.tsx` | Campo `sequenceTimeoutSec` adicionado ao teste existente |
| `ipc.ts` (session hook) | Verificado via `captureSession.test.ts` indiretamente |
| `gallery.ts` | Sem teste automatizado (BrowserWindow + fs temp — roteiro manual em 03) |
| `buildPdf` | `tests/main/pdfBuilder.test.ts` — geração de PDF em memória com imagens sintéticas |

# 0004 — Desenho Técnico

**Data:** 2026-06-13 · **Autor:** arc-lider (Momento A, via arc-specfull)

---

## 1. Resumo do Design

| Área | Mudança |
|---|---|
| `src/shared/types.ts` | Adiciona tipo `DisplayInfo` |
| `src/main/displayCacheStore.ts` | **Novo módulo** — `DisplayCacheStore(baseDir).load()/save()` |
| `src/main/overlay.ts` | Usa cache para criar janelas; exporta `setDisplayCacheStore`; atualiza cache após captura |
| `src/main/index.ts` | Instancia `DisplayCacheStore`; chama `setDisplayCacheStore` no `whenReady` |

`capture.ts`, `ipc.ts`, `settingsStore.ts`, renderer: **sem alteração**.

---

## 2. Alternativas Consideradas

### A1 — Campo `_cachedDisplays` em `settings.json`
`SettingsStore.save()` escreveria o campo extra; `mergeSettings` o ignoraria por não estar em `AppSettings`. Problema: `mergeSettings` é tipado e só copia chaves conhecidas; o campo seria perdido em cada `save()`. Exigiria refatorar `SettingsStore` para preservar chaves extras. **Descartado.**

### A2 — `display-cache.json` via `DisplayCacheStore` ✅ (escolhida)
Módulo isolado com responsabilidade única. Segue o mesmo padrão de `SettingsStore` (baseDir injetado, fs real, atômico). Testável isoladamente. Sem impacto em `AppSettings`.

### A3 — Injeção de `DisplayCacheStore` como parâmetro de `startCapture`
Exigiria atualizar assinatura de `startCapture` em dois call-sites (`index.ts` e `ipc.ts`). A3 foi descartado em favor de injeção de módulo (`setDisplayCacheStore`) para não alterar assinatura pública nem `IpcContext`.

---

## 3. Tipo `DisplayInfo` em `shared/types.ts`

```typescript
export interface DisplayInfo {
  id: number
  bounds: Rect   // DIP — mesmo layout de Electron.Display.bounds
  scaleFactor: number
}
```

Subconjunto de `DisplayCapture` (que também tem `dataUrl`). Fonte de verdade compartilhada entre `displayCacheStore.ts` e `overlay.ts`.

---

## 4. `DisplayCacheStore` — Interface e Algoritmo

```typescript
class DisplayCacheStore {
  constructor(baseDir: string)
  load(): DisplayInfo[] | null   // null = sem cache ou inválido
  save(displays: DisplayInfo[]): void  // best-effort, erros silenciados
}
```

**`load()`:**
1. Se arquivo não existe → retorna `null`
2. `readFileSync` + `JSON.parse` em try/catch → erro → `null`
3. Valida: `Array.isArray` e cada elemento tem `id: number`, `scaleFactor: number`, `bounds.x: number` → falha → `null`
4. Retorna array validado

**`save(displays)`:**
1. `mkdirSync(baseDir, { recursive: true })`
2. `writeFileSync(filePath + '.tmp', JSON.stringify(displays, null, 2), 'utf-8')`
3. `renameSync(tmp, filePath)` — atômica
4. Qualquer erro: `rmSync(tmp, { force: true })`; silencia exceção

---

## 5. Injeção em `overlay.ts`

```typescript
let _cacheStore: DisplayCacheStore | null = null

export function setDisplayCacheStore(store: DisplayCacheStore): void {
  _cacheStore = store
}
```

`startCapture()` lê `_cacheStore?.load()`. Se `null` → `screen.getAllDisplays()` como antes.

---

## 6. Algoritmo de `startCapture()` com cache

```
cachedDisplays = _cacheStore?.load() ?? null
displayInfos   = cachedDisplays ?? getAllDisplaysAsInfo()   // screen.getAllDisplays() mapeado

mode 'area': for each displayInfo → createOverlayWindowAndLoad(displayInfo.bounds)
             trackeia por displayId (não índice)
mode 'full': screen.getCursorScreenPoint() + getDisplayNearestPoint() para obter id
             encontra displayInfo pelo id no array; cria 1 janela
mode 'all':  screen.getPrimaryDisplay() para obter id; encontra displayInfo; 1 janela

capturePromise = captureAllDisplays()   // sempre chamado — conteúdo visual sempre fresco

await readyPromise de cada janela → show/focus
captures = await capturePromise

mapeia initData por displayId (não índice) para robustez contra stale cache

// Atualiza cache em background
if _cacheStore:
  setImmediate(() => _cacheStore.save(captures.map(c => toDisplayInfo(c))))
```

**Mapeamento initData por `displayId`:**
```typescript
// Antes: captures[displayIndex] ?? captures[0]
// Depois:
const capture = captures.find(c => c.displayId === entry.displayId) ?? captures[0]
```
Mais robusto: se cache estava stale e índices diferirem, o `displayId` ainda casa corretamente.

---

## 7. Wiring em `index.ts`

```typescript
import { DisplayCacheStore } from './displayCacheStore'
import { setDisplayCacheStore } from './overlay'

app.whenReady().then(() => {
  store = new SettingsStore(...)
  const displayCache = new DisplayCacheStore(app.getPath('userData'))
  setDisplayCacheStore(displayCache)
  registerIpcHandlers(...)
  createTray()
  applySettings(store.load())
})
```

---

## 8. Impacto em Testes

| Módulo | Cobertura |
|---|---|
| `DisplayCacheStore` | Novo teste `tests/main/displayCacheStore.test.ts` — fs real em tmpdir |
| `overlay.ts` | Sem teste automatizado novo (BrowserWindow exige driver Electron); roteiro manual em `03-acceptance-criteria.md` |
| `capture.ts` | Sem alteração — sem novo teste |
| `index.ts` | Sem teste automatizado (bootstrap) |

A cobertura de `DisplayCacheStore` segue exatamente o padrão de `settingsStore.test.ts`.

---

## 9. Diagrama de Sequência (captura com cache)

```
triggerCapture()
  → startCapture(mode, settings)
      ├─ _cacheStore.load() → DisplayInfo[] (cache hit)
      ├─ createOverlayWindowAndLoad(bounds) × N  [paralelo com ↓]
      ├─ captureAllDisplays()                    [paralelo com ↑]
      │    └─ screen.getAllDisplays() + getSources() → DisplayCapture[]
      ├─ await readyPromise → win.show()
      ├─ await capturePromise → captures
      ├─ initDataByWebContents.set(webContentsId, initData)  [por displayId]
      └─ setImmediate → _cacheStore.save(displays)  [background]
```

# 0004 — Relatório de Implementação

**Data:** 2026-06-13 · **Autor:** arc-dev (via arc-specfull)  
**Status:** ✅ Concluído

---

## Arquivos Criados

| Arquivo | Descrição |
|---|---|
| `src/main/displayCacheStore.ts` | `DisplayCacheStore(baseDir).load()/save()` — persistência JSON atômica de `DisplayInfo[]` |
| `tests/main/displayCacheStore.test.ts` | 12 testes de integração com fs real em tmpdir |
| `tests/factories/displayInfoFactory.ts` | Factory com estado `dualMonitor()` usando faker |

## Arquivos Alterados

| Arquivo | Mudança |
|---|---|
| `src/shared/types.ts` | Adicionado tipo `DisplayInfo { id, bounds, scaleFactor }` |
| `src/main/overlay.ts` | `setDisplayCacheStore()` exportado; `startCapture()` usa cache; atualiza cache via `setImmediate` após captura |
| `src/main/index.ts` | Importa e instancia `DisplayCacheStore`; chama `setDisplayCacheStore` no `whenReady` |

## Decisões de Implementação

- **Injeção por módulo** (`setDisplayCacheStore`) em vez de parâmetro em `startCapture` — preserva assinatura existente em ambos os call-sites (`index.ts` e `ipc.ts`)
- **Mapeamento por `displayId`** (não índice) na atribuição de `initData` — robusto contra cache stale onde índices podem divergir
- **`setImmediate`** para atualização do cache — garante fire-and-forget sem bloquear o retorno de `startCapture`
- **`getAllDisplayInfos()`** helper privado — isola o mapeamento `Electron.Display → DisplayInfo`

## Cobertura

- `DisplayCacheStore`: 12 testes automatizados (fs real)
- `overlay.ts`: sem teste automatizado novo (BrowserWindow exige driver Electron); roteiro manual em `03-acceptance-criteria.md`
- Suite completa: 90/90 ✅

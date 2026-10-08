# 0007 — Relatório de Testes

**Data:** 2026-08-26 · **Autor:** arc-tester (via arc-specfull)
**Status:** ✅ Suíte verde

---

## 1. Resumo

| Métrica | Antes | Depois |
|---|---|---|
| Arquivos de teste | 14 | 16 |
| Testes | 117 | **163** |
| Testes novos desta feature | — | **46** |
| Falhas | 0 | 0 |
| Duração | ~4,8 s | ~4,1 s |

---

## 2. Testes implementados

### `tests/main/overlayLayout.test.ts` — 17 testes (integração do main, sem Electron)

Cobre `planOverlayWindows` e `pickCapturesForWindow` com massa de `displayInfoFactory`.

| ID | Cenário | Status |
|---|---|---|
| CT-OL-01 | Modo `area` retorna exatamente uma janela | ✅ |
| CT-OL-02 | Bounds da janela = união dos displays | ✅ |
| CT-OL-03 | `displayId` null (recebe todas as capturas) | ✅ |
| CT-OL-04 | Monitor à esquerda → união com `x` negativo | ✅ |
| CT-OL-05 | Alturas diferentes → altura do mais alto | ✅ |
| CT-OL-06 | Um único display → janela = esse display | ✅ |
| — | Quatro monitores → ainda uma janela (7680 px) | ✅ |
| CT-OL-07 | Modo `full` usa o display sob o cursor | ✅ |
| CT-OL-08 | `full` com cursor inexistente cai no primeiro | ✅ |
| CT-OL-09 | Modo `all` usa o primário, compõe todas | ✅ |
| — | `all` com primário inexistente cai no primeiro | ✅ |
| CT-OL-10 | Modo `redit` não cria janela | ✅ |
| CT-OL-11 | Lista de displays vazia em todos os modos | ✅ |
| CT-OL-12 | `null` retorna todas as capturas na ordem | ✅ |
| CT-OL-13 | id específico retorna só aquela captura | ✅ |
| CT-OL-14 | id inexistente cai na primeira | ✅ |
| — | Lista de capturas vazia não quebra | ✅ |

### `tests/unit/geometry.test.ts` — +17 testes (módulos puros)

| ID | Cenário | Status |
|---|---|---|
| CT-UN-20/21 | `pickCompositeScale`: maior escala; vazio → 1 | ✅ |
| CT-UN-22/23/24 | `displayDestRect`: origem, deslocamento escalado, união negativa | ✅ |
| CT-UN-25 | `dipRectToOverlayCss` com união de origem negativa | ✅ |
| CT-UN-26 | `rectIntersectionArea`: disjunto, encostado, sobreposto | ✅ |
| CT-UN-27/28 | `findViewportFor`: maior interseção; região vazia → primeiro | ✅ |
| CT-UN-29→33 | `placeToolbar`: abaixo, acima, dentro, borda direita, borda esquerda | ✅ |
| CT-UN-34/35 | Toolbar no monitor certo (secundário; seleção cruzada) | ✅ |
| — | Monitor menor que a toolbar degrada para a borda | ✅ |
| — | Lista de viewports vazia não quebra | ✅ |

### `tests/renderer/Overlay.test.tsx` — 11 testes (componente + a11y) — **arquivo novo**

`Overlay.tsx` não tinha nenhum teste antes desta feature.

| ID | Cenário | Status |
|---|---|---|
| CT-FC-20 | Canvas base = união dos monitores (3840×1080) | ✅ |
| CT-FC-20b | DPI misto usa a maior escala (6720×2160) | ✅ |
| CT-FC-21 | Preenchimento preto **antes** dos displays (RN-04) | ✅ |
| CT-FC-22 | Cada captura na posição relativa correta | ✅ |
| CT-FC-23 | Arrasto monitor 1 → 2 gera seleção de 3000 px (> 1920) | ✅ |
| CT-FC-24/25 | Soltar entra em edição, toolbar aparece, `beginEdit` chamado | ✅ |
| CT-FC-26 | Arrasto dentro de um monitor sem regressão | ✅ |
| CT-FC-27 | Arrasto abaixo do mínimo é descartado | ✅ |
| CT-FC-28 | `Esc` chama `cancelOverlay` | ✅ |
| CT-FC-29 | Captura única não compõe | ✅ |
| CT-FC-30 | `jest-axe` sem violações no modo de edição | ✅ |

---

## 3. Massa de dados (factories)

| Factory | Novidade |
|---|---|
| `displayCaptureFactory` | **Nova.** `DisplayCapture` com PNG 1×1 válido; `fromDisplay(info)` e `fromDisplays(infos)` mantêm ids coerentes com `DisplayInfo` |
| `displayInfoFactory` | **+4 layouts:** `sideBySide` (determinístico), `secondaryOnLeft` (x negativo), `differentHeights` (região vazia), `mixedDpi` (escalas 1,5 e 1) |

Sem seeders novos — a feature não persiste nada em disco.

---

## 4. Estratégia e fronteiras de mock

Conforme `ARCHITECTURE.md` §11, **nenhum módulo interno do projeto foi mockado**. Os stubs ficam estritamente na fronteira do browser, que o jsdom não implementa:

| Stub | Por quê |
|---|---|
| `HTMLCanvasElement.prototype.getContext` | jsdom não tem canvas 2D. O stub **registra as chamadas**, o que permite asserção direta sobre a composição (dimensões, ordem preto→displays, posições de `drawImage`) |
| `Image` | jsdom não decodifica `data:` URLs nem dispara `onload` |
| `window.PointerEvent` | Não implementado no jsdom; aliasado para `MouseEvent`, que carrega `clientX`/`clientY` |
| `window.arcanshot` | Fronteira do preload — mesmo padrão já usado em `settingsFlow.test.tsx` |

---

## 5. Cobertura

| Arquivo | Statements | Branches |
|---|---|---|
| `src/main/overlayLayout.ts` | **100%** | **100%** |
| `src/shared/geometry.ts` | **100%** | 97% |
| `src/renderer/overlay/Overlay.tsx` | 0% → **72,3%** | 70,6% |

O agregado do projeto (67,5%) segue abaixo da meta de 80% por causa de arquivos que não são desta feature — `src/main/gallery.ts` (0%, feature 0006 ainda em andamento) e `TextInputLayer.tsx` (3,7%). Essa lacuna já existia antes e não foi introduzida aqui.

---

## 6. Bugs encontrados na implementação

**Nenhum.** Nenhum ciclo de retorno ao desenvolvedor foi necessário.

Duas expectativas **de teste** estavam erradas e foram corrigidas depois de conferir que o código estava certo:
1. `CT-UN-34`: eu esperava a toolbar em `x=1500`; o correto é `1288` — em `1500` a barra de 760 px estouraria a borda direita do monitor, e o clamp é o comportamento desejado (RN-10).
2. `CT-FC-23/26`: eu esperava altura 1125/750; o correto é o valor clampado à altura da união (1080 px). O arrasto vertical do teste ultrapassava o canvas — `clampRectToBounds` agiu corretamente. Os valores do arrasto foram ajustados para exercitar o caso sem clamp.

---

## 7. Não coberto por automação

| Item | Por quê | Como validar |
|---|---|---|
| Alinhamento do overlay ao desktop real em DPI misto | Depende do `devicePixelRatio` real de uma janela que cruza monitores — não reproduzível no jsdom nem no Playwright headless | Roteiro E do `03-acceptance-criteria.md` |
| Fluidez do arrasto (RNF-02) e memória (RNF-04) | Exigem GPU e monitores físicos | Roteiros H |
| Janela com `x` negativo criada pelo Electron | `planOverlayWindows` está testado; a criação real da `BrowserWindow` está em `overlay.ts`, excluído da cobertura por depender de Electron | Roteiro D |
| E2E do fluxo de captura | A suíte E2E existente (`tests/e2e/app.spec.ts`) cobre settings; disparar captura real em CI headless não é confiável | Roteiros A–G |

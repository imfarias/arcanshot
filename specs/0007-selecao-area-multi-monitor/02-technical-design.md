# 0007 — Desenho Técnico

**Data:** 2026-08-26 · **Autor:** arc-lider (Momento A, via arc-specfull)

---

## 1. Resumo da Solução

A causa raiz é estrutural: no modo `area`, `startCapture()` cria **uma `BrowserWindow` por display**. Um gesto de mouse pertence a uma única janela — ao sair dela, o `pointermove` deixa de chegar, e `clampRectToBounds` ainda limita o retângulo ao canvas daquele display.

A solução é trocar as N janelas por **uma única janela overlay cujos bounds são a união dos bounds de todos os displays**. O renderer compõe as capturas num canvas único (mesma técnica que o modo `all` já usa) e o arrasto passa a ser um gesto contínuo dentro de uma só janela — cross-display **sem nenhum IPC no caminho crítico do `pointermove`**.

Efeitos colaterais desejáveis: uma janela a menos para criar/carregar/mostrar por captura (ajuda o RNF-01) e `closeAllOverlays` fica trivialmente correto (RN-09).

Efeito colateral a controlar: o canvas passa a ter o tamanho da união (2× 4K ≈ 66 MB por canvas, dois canvases). Mitigado por coalescência de render em `requestAnimationFrame` (RNF-02).

---

## 2. Alternativas Consideradas

| # | Alternativa | Por que não |
|---|---|---|
| A | **Janela única na união dos displays** ✅ **escolhida** | — |
| B | Manter N janelas e sincronizar a seleção via IPC (`pointermove` de uma janela reenviado às demais) | Coloca IPC no caminho crítico de cada frame de arrasto (RNF-02 em risco); exige estado de seleção distribuído e consistente entre N renderers; o cursor continua "preso" a uma janela — capturar o mouse fora dela exige hook nativo |
| C | Janela única em tela cheia apenas quando o usuário segura um modificador | UX descoberta por acidente; dois caminhos de código para manter |
| D | Manter o limite e orientar o uso do modo "todas as telas" | Não resolve o pedido — o usuário precisa recortar depois em outro programa |

---

## 3. Componentes Afetados

| Arquivo | Ação | Descrição |
|---|---|---|
| `src/main/overlayLayout.ts` | **novo** | Módulo **puro** (sem `import 'electron'`) que decide a geometria das janelas de overlay e o fatiamento das capturas por janela. Isola a regra do `overlay.ts` — que é excluído da cobertura por depender de `BrowserWindow` |
| `src/main/overlay.ts` | alterar | `startCapture` delega o plano de janelas a `overlayLayout`; consulta cursor/primário sob demanda |
| `src/shared/geometry.ts` | alterar | Novos helpers puros: escala do composto, posicionamento de displays no canvas, mapeamento DIP→CSS do overlay, escolha de viewport e posicionamento da toolbar |
| `src/renderer/overlay/Overlay.tsx` | alterar | Composição do canvas também no modo `area`; viewports por monitor; toolbar via `placeToolbar`; render coalescido por rAF |
| `tests/factories/displayCaptureFactory.ts` | **novo** | Massa de dados de `DisplayCapture` (com `dataUrl` PNG 1×1 válido) |
| `tests/factories/displayInfoFactory.ts` | alterar | Adiciona layouts nomeados: DPI misto, alturas diferentes (gap), monitor à esquerda (x negativo) |
| `tests/main/overlayLayout.test.ts` | **novo** | Cobre todo o branching de modo |
| `tests/unit/geometry.test.ts` | alterar | Cobre os helpers novos |
| `tests/renderer/Overlay.test.tsx` | **novo** | Componente: seleção atravessando a fronteira entre monitores, com canvas e `Image` stubados |

**Sem alteração:** `types.ts`, `preload`, `ipc.ts`, `capture.ts`, `settings`, galeria, tela de Configurações.

---

## 4. Modelo de Dados

Nenhuma mudança de contrato. `OverlayInitData` já é `displays: DisplayCapture[]` — no modo `area` passa a vir com **todas** as capturas em vez de uma, exatamente como o modo `all` já faz. Nenhuma migração, nenhum campo novo, nenhuma configuração nova.

---

## 5. Detalhamento

### 5.1 `src/main/overlayLayout.ts` (novo, puro)

```ts
export interface OverlayWindowPlan {
  bounds: Rect
  /** null = a janela recebe TODAS as capturas (composição) */
  displayId: number | null
}

export interface OverlayPlanContext {
  cursorDisplayId: number | null
  primaryDisplayId: number | null
}

export function planOverlayWindows(
  mode: CaptureMode,
  displays: DisplayInfo[],
  ctx: OverlayPlanContext
): OverlayWindowPlan[]

export function pickCapturesForWindow(
  captures: DisplayCapture[],
  displayId: number | null
): DisplayCapture[]
```

Regras de `planOverlayWindows`:

| Modo | Janelas | Bounds | `displayId` |
|---|---|---|---|
| `area` | **1** | `unionRect(todos os bounds)` | `null` (composição) |
| `full` | 1 | bounds do display sob o cursor (fallback: primeiro) | id do display |
| `all` | 1 | bounds do display primário (fallback: primeiro) | `null` (composição) |
| `redit` | 0 | — | — (janela criada pela galeria) |

`displays` vazio ⇒ retorna `[]` (o chamador trata como erro de captura).

Regras de `pickCapturesForWindow`: `displayId === null` ⇒ todas as capturas; caso contrário `[captura com aquele id]`, com fallback para a primeira quando o id não existir (cache de displays desatualizado — cenário FA-1 da feature 0004).

### 5.2 `src/main/overlay.ts`

```ts
const plans = planOverlayWindows(mode, displayInfos, {
  cursorDisplayId: mode === 'full' ? screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).id : null,
  primaryDisplayId: mode === 'all' ? screen.getPrimaryDisplay().id : null
})
```

As chamadas ao SO ficam **sob demanda por modo** — o modo `area`, que é o caminho quente do atalho principal, não paga nenhuma consulta a `screen` além da lista de displays (que vem do cache da feature 0004).

A montagem do `initData` passa a ser uma linha:
```ts
initData = { mode, displays: pickCapturesForWindow(captures, displayId), settings }
```

A janela já é criada com `enableLargerThanScreen: true` e `setAlwaysOnTop(true, 'screen-saver')` — ambos necessários e já presentes. `x`/`y` negativos (monitor à esquerda do primário) são suportados por `BrowserWindow`.

### 5.3 `src/shared/geometry.ts` — helpers novos (puros)

```ts
/** RN-05: escala do canvas composto = maior scaleFactor presente. */
export function pickCompositeScale(scaleFactors: number[]): number

/** RN-03: retângulo de destino de um display no canvas composto, em px de imagem. */
export function displayDestRect(bounds: Rect, union: Rect, scale: number): Rect

/** Converte um rect em DIP para o espaço CSS do overlay (origem = união). */
export function dipRectToOverlayCss(bounds: Rect, union: Rect, cssPerDip: number): Rect

export function rectIntersectionArea(a: Rect, b: Rect): number

/** Viewport (monitor) de maior interseção com o rect; fallback: o primeiro. */
export function findViewportFor(rect: Rect, viewports: Rect[]): Rect

/** RN-10: posiciona a toolbar sempre inteira dentro de um monitor real. */
export function placeToolbar(
  selection: Rect,
  size: { width: number; height: number },
  viewports: Rect[],
  gap: number
): Point
```

Algoritmo de `placeToolbar` (tudo em CSS px do overlay):
1. `vp = findViewportFor(selection, viewports)`
2. **Abaixo** da seleção se couber: `top = sel.y + sel.height + gap`, aceito se `top + size.height <= vp.y + vp.height`
3. Senão **acima**: `top = sel.y - gap - size.height`, aceito se `top >= vp.y`
4. Senão **dentro** da seleção, no topo: `top = clamp(sel.y + gap, vp.y, vp.y + vp.height - size.height)`
5. `left = clamp(sel.x, vp.x, vp.x + vp.width - size.width)`

Quando o viewport é menor que a toolbar, o `clamp` degrada para a borda do viewport (nunca `NaN`).

### 5.4 `src/renderer/overlay/Overlay.tsx`

**Composição.** A condição atual `data.mode === 'all' && data.displays.length > 1` vira `data.displays.length > 1` — `full` e `redit` sempre trazem uma captura só, então a mudança só liga o composto para `area`.

**Fator de escala CSS.** Regra explícita por modo, substituindo o encadeamento atual:

| Modo | `cssPerImage` | Racional |
|---|---|---|
| `all` | `min(innerW/baseW, innerH/baseH, 1)` | janela = 1 display, canvas = união ⇒ precisa caber (fit) |
| `redit` | `min(innerW/baseW, innerH/baseH)` | janela não é fullscreen |
| `area`, `full` | `innerW/baseW` | janela cobre exatamente a área do canvas ⇒ 1:1 |

No modo `area` composto, `innerW/baseW = 1/canvasScale`, então o overlay fica pixel-a-pixel sobre o desktop real. Derivar o fator de `innerWidth` (em vez de assumir `CSS px == DIP`) mantém a conta correta mesmo em DPI misto, onde o `devicePixelRatio` da janela é o de um monitor só.

**Viewports (RN-10).**
```ts
viewportsCssRef.current =
  data.mode === 'area' && data.displays.length > 1
    ? data.displays.map((d) => dipRectToOverlayCss(d.bounds, union, cssPerDip))
    : [{ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }]
```
com `cssPerDip = window.innerWidth / union.width` — mesma fonte de verdade do `cssPerImage`. Nos demais modos a janela é um retângulo único, então o viewport é a própria janela e o comportamento da toolbar fica idêntico ao atual.

**Toolbar.** As expressões `toolbarTop`/`toolbarLeft` (que hoje usam `window.innerHeight` e a constante mágica `760`) são substituídas por `placeToolbar(selCss, TOOLBAR_SIZE_CSS, viewports, TOOLBAR_GAP_CSS)`, com `TOOLBAR_SIZE_CSS = { width: 760, height: 54 }` e `TOOLBAR_GAP_CSS = 10` — mesmos números de hoje, agora nomeados e testáveis.

**Render coalescido (RNF-02).** O `useEffect` de desenho agenda o redraw em `requestAnimationFrame` e cancela o frame pendente na limpeza, garantindo no máximo um redraw do canvas da união por frame durante o arrasto.

**Preenchimento preto (RN-04).** Já existe no caminho composto (`ctx.fillRect` do canvas inteiro antes de desenhar os displays) e passa a valer para `area`.

---

## 6. Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| Janela grande demais degradar o arrasto (RNF-02) | Coalescência por rAF; critério de aceite manual mede a fluidez em layout real |
| DPI misto desalinhar o overlay do desktop real | Todos os fatores derivados de `innerWidth` medido, nunca de `devicePixelRatio` assumido |
| Regressão silenciosa nos modos `full`/`all`/`redit` | `planOverlayWindows` e `pickCapturesForWindow` têm caso de teste dedicado por modo; `cssPerImage` documentado por modo em tabela |
| `x` negativo (monitor à esquerda do primário) | Coberto por caso de teste do plano de janelas e por roteiro manual |
| Memória em 4 monitores 4K | Aceito e registrado na decisão #8 do `ARCHITECTURE.md`; RNF-04 verificado por roteiro manual |

---

## 7. Plano de Implementação

1. `shared/geometry.ts` — helpers puros + testes unitários
2. `main/overlayLayout.ts` — plano de janelas + testes
3. `main/overlay.ts` — passa a consumir o plano
4. `renderer/Overlay.tsx` — composição, viewports, toolbar, rAF
5. Factories + teste de componente do overlay
6. `typecheck` + `lint` + suite completa

# 0008 — Desenho Técnico

**Data:** 2026-08-26 · **Autor:** arc-lider (Momento A, via arc-specfull)

---

## 1. Resumo da Solução

Quatro capacidades, três pontos de extensão já existentes no editor:

| Capacidade | Onde entra |
|---|---|
| **Traço livre** e **tarja sólida** | Dois novos `kind` em `Annotation` + dois `ToolId` + dois ramos em `renderAnnotations`. É a extensão natural do modelo vetorial da decisão #5 — nada de novo na arquitetura |
| **Lupa + conta-gotas** | Componente `Magnifier` novo, alimentado pelo canvas base já existente. O conta-gotas é um `ToolId` que **não** cria anotação: consome a cor lida e a devolve ao estado + clipboard |
| **Embelezar** | `exportSelection` ganha um parâmetro opcional; toda a matemática de acabamento vive em `shared/beautify.ts` (puro) e o desenho em `lib/beautify.ts` (canvas). Decisão #9: acabamento só na exportação |

**Leitura de cor sem penalizar o arrasto (RNF-02):** a cor **não** é lida do canvas base. A lupa já desenha a região ampliada num canvas de ~132 px; o pixel central desse canvas pequeno é o mesmo pixel sob o cursor. `getImageData` roda sobre 132×132, nunca sobre a união de monitores em 4K — que, depois da feature 0007, pode ter 7680×2160.

**Dívida da 0007 quitada de passagem:** a toolbar ganha 4 botões, o que invalida a constante `TOOLBAR_SIZE_CSS = 760`. Em vez de atualizar o número, a toolbar passa a ser **medida** por `ResizeObserver` — fechando a ressalva 🟡 R1 do `06-final-review.md` da feature anterior.

---

## 2. Alternativas Consideradas

| # | Decisão | Alternativa | Por que não |
|---|---|---|---|
| 1 | Cor lida do canvas da lupa | `getImageData` no canvas base a cada `pointermove` | Readback de GPU sobre canvas gigante a cada movimento do mouse; violaria RNF-01/02 |
| 2 | Cor lida do canvas da lupa | `getContext('2d', { willReadFrequently: true })` no canvas base | Força rasterização por software no canvas principal — penaliza o redraw de **todo** frame do arrasto para beneficiar uma leitura pontual |
| 3 | Tarja como `kind` próprio (`redact`) | Reaproveitar `shape` com uma flag `filled` | `shape` é definido por dois pontos e traço; tarja é área opaca. Misturar exigiria condicionais no render de 5 ferramentas para servir 1 |
| 4 | Campos de embelezamento **planos** em `AppSettings` | Objeto aninhado `beautify: {...}` | `mergeSettings` compara `typeof value === typeof base[key]`, e `FieldErrors` é `Partial<Record<keyof AppSettings, string>>`. Objeto aninhado exigiria merge profundo e erros aninhados — refatoração de base para ganho nenhum |
| 5 | Acabamento só na exportação | Compor o acabamento no canvas do overlay | Quebraria o 1:1 entre overlay e desktop, que a decisão #8 tornou essencial; e desligar o embelezamento deixaria de ser trivialmente idêntico ao comportamento antigo (RN-22) |
| 6 | Margem/raio/sombra **proporcionais** | Valores absolutos em px | Um print de 300 px e outro de 3000 px sairiam com acabamentos visualmente incompatíveis (RN-17) |
| 7 | Toolbar **medida** por `ResizeObserver` | Atualizar a constante para ~870 | A constante volta a mentir na próxima ferramenta adicionada. Medir resolve a classe do problema |
| 8 | `roundRectPath` manual com `arcTo` | `ctx.roundRect()` nativo | Nativo existe no Electron 38, mas não no stub de canvas dos testes; e `arcTo` é suportado universalmente |

---

## 3. Componentes Afetados

### Criados
| Arquivo | Descrição |
|---|---|
| `src/shared/beautify.ts` | **Puro.** Presets de fundo, `computeBeautifyLayout`, `pickExportFormat`, `defaultBeautify`, validação dos campos |
| `src/renderer/overlay/lib/beautify.ts` | `applyBeautify(canvas, opts)` — pinta fundo, sombra e cantos; `roundRectPath` |
| `src/renderer/overlay/components/Magnifier.tsx` | Lupa: pixels ampliados, cruz, coordenadas, hexadecimal; reporta a cor lida |
| `src/renderer/overlay/components/BeautifyPanel.tsx` | Painel com preview ao vivo e controles |

### Alterados
| Arquivo | Mudança |
|---|---|
| `src/shared/types.ts` | +2 `Annotation` (`freehand`, `redact`), +3 `ToolId`, +5 campos em `AppSettings`, +`copyColor` na API |
| `src/shared/settings.ts` | Defaults e validação dos 5 campos novos |
| `src/shared/geometry.ts` | +`placeNearCursor` (posiciona a lupa sem sair da tela) |
| `src/renderer/overlay/lib/editor.ts` | Render de `freehand` e `redact`; `exportSelection` com acabamento opcional |
| `src/renderer/overlay/components/Toolbar.tsx` | 3 ferramentas + botão ✨ |
| `src/renderer/overlay/Overlay.tsx` | Rastreio de cursor, estado de cor, arrasto de traço livre e tarja, painel, toolbar medida |
| `src/renderer/overlay/overlay.css` | Estilos da lupa e do painel |
| `src/preload/index.ts` | `copyColor` |
| `src/main/ipc.ts` | Handler `editor:copy-color` |

**Sem alteração:** `capture.ts`, `overlay.ts`, `overlayLayout.ts`, `gallery.ts`, `settingsStore.ts`, `SettingsForm.tsx`, `Gallery.tsx`.

---

## 4. Modelo de Dados

```ts
// shared/types.ts
export type ToolId =
  | 'select' | 'rect' | 'ellipse' | 'arrow' | 'line' | 'highlight'
  | 'blur' | 'redact' | 'pencil' | 'text' | 'step' | 'eyedropper'

export type Annotation =
  | { kind: 'shape'; tool: ShapeTool; start: Point; end: Point; color: string; strokeWidth: number }
  | { kind: 'blur'; rect: Rect }
  | { kind: 'redact'; rect: Rect; color: string }                       // NOVO
  | { kind: 'freehand'; points: Point[]; color: string; strokeWidth: number }  // NOVO
  | { kind: 'text'; ... }
  | { kind: 'step'; ... }
```

`AppSettings` ganha **5 campos planos**:

| Campo | Tipo | Default | Faixa |
|---|---|---|---|
| `beautifyEnabled` | boolean | `false` | — |
| `beautifyBackground` | string | `'graphite'` | id de preset conhecido |
| `beautifyPadding` | number | `6` | inteiro 0–20 (% da menor dimensão) |
| `beautifyRounded` | boolean | `true` | — |
| `beautifyShadow` | boolean | `true` | — |

`beautifyEnabled` nasce **desligado**: RN-22 exige que quem já usa o app não veja mudança nenhuma até optar por ela.

Nenhuma migração: `mergeSettings` já preenche chaves ausentes a partir dos defaults, e `settings.json` de versões anteriores continua válido.

---

## 5. Detalhamento

### 5.1 `shared/beautify.ts` (puro)

```ts
export interface BeautifyOptions {
  enabled: boolean
  background: string
  padding: number
  rounded: boolean
  shadow: boolean
}

export interface BackgroundPreset {
  id: string
  label: string
  type: 'none' | 'solid' | 'gradient'
  colors: string[]
}

export const BACKGROUND_PRESETS: BackgroundPreset[]
export function resolveBackground(id: string): BackgroundPreset   // desconhecido → default
export function computeBeautifyLayout(inner: Size, opts): BeautifyLayout
export function pickExportFormat(format: 'png'|'jpg', opts): 'png'|'jpg'
export function validateBeautify(partial): FieldErrors
```

Presets: `none` (transparente), `graphite` (#18181b), `paper` (#f4f4f5), `sunset`, `ocean`, `forest`, `violet` (gradientes diagonais de dois tons).

`computeBeautifyLayout` (RN-17 — tudo proporcional):
```
base    = min(inner.width, inner.height)
pad     = round(base * padding / 100)
raio    = rounded ? clamp(round(base * 0.025), 6, 48) : 0
sombra  = shadow && pad > 0
            ? { blur: round(pad * 0.5), offsetY: round(pad * 0.18), color: 'rgba(0,0,0,0.35)' }
            : null
saída   = { width: inner.width + 2*pad, height: inner.height + 2*pad }
```

**Sombra exige margem.** Com `pad === 0` a sombra seria recortada pela borda do canvas — então `pad === 0` desliga a sombra em vez de desenhar um artefato.

`pickExportFormat` implementa RN-18: acabamento ligado **e** fundo `none` ⇒ `'png'`, ignorando a preferência de formato (JPG não tem canal alfa e transformaria a transparência em preto).

### 5.2 `renderer/overlay/lib/beautify.ts`

```ts
export function applyBeautify(source: HTMLCanvasElement, opts: BeautifyOptions): HTMLCanvasElement
```

Sequência:
1. `computeBeautifyLayout` → dimensões de saída
2. Fundo: `fillRect` (sólido) ou `createLinearGradient` diagonal (gradiente); `none` deixa transparente
3. Sombra: caminho arredondado preenchido com `shadowBlur`/`shadowOffsetY` ativos — o preenchimento é depois coberto pela imagem
4. `clip()` no mesmo caminho + `drawImage(source, pad, pad)`

`roundRectPath(ctx, x, y, w, h, r)` construído com `arcTo` (ver alternativa #8). Com `r === 0` degenera para um retângulo comum.

### 5.3 `lib/editor.ts`

Dois ramos novos em `renderAnnotations`:

```ts
} else if (a.kind === 'redact') {
  ctx.fillStyle = a.color
  ctx.fillRect(a.rect.x, a.rect.y, a.rect.width, a.rect.height)   // RN-11: opaco
} else if (a.kind === 'freehand') {
  // RN-08: suavização por curvas quadráticas entre pontos médios
  ctx.strokeStyle = a.color; ctx.lineWidth = a.strokeWidth
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ...
}
```

Suavização: em vez de ligar os pontos com retas (que produzem cantos angulosos em movimento rápido), traça-se `quadraticCurveTo` usando cada ponto como ponto de controle e o **ponto médio** entre ele e o seguinte como destino.

`exportSelection` ganha o 6º parâmetro **opcional**:
```ts
export function exportSelection(
  baseCanvas, annotations, selection, format, jpgQuality,
  beautify?: BeautifyOptions
): string
```
Recorta como hoje; se `beautify?.enabled`, passa o recorte por `applyBeautify`; escolhe o formato por `pickExportFormat`. Sem o parâmetro, o comportamento é **idêntico** ao atual (RN-22).

### 5.4 `Magnifier.tsx`

| Prop | Uso |
|---|---|
| `source` | canvas base |
| `point` | posição do cursor em px de imagem |
| `cssPerImage`, `viewport` | posicionamento na tela |
| `onColorRead(hex)` | devolve a cor do pixel central |

Desenha `source` ampliado 8× com `imageSmoothingEnabled = false` (RN-02), cruz no centro, e lê o pixel central com `getImageData(size/2, size/2, 1, 1)` — **canvas de 132 px, não o canvas base** (RNF-02).

Posição por `placeNearCursor(cursorCss, size, offset, viewport)` (novo helper puro em `geometry.ts`): tenta abaixo-direita do cursor; se estourar a borda, espelha para o lado oposto; nunca cobre o cursor (RN-03).

`aria-hidden="true"` — é informação puramente visual, e a cor chega ao usuário pela notificação ao copiar (§10 da spec).

### 5.5 `BeautifyPanel.tsx`

| Prop | Uso |
|---|---|
| `options` | valores atuais |
| `onChange(patch)` | ajuste de qualquer controle |
| `renderPreview(maxWidth)` | função que devolve um dataUrl do resultado |

Controles: interruptor geral, amostras de fundo (`aria-pressed`), deslizante de margem 0–20 (`<input type="range">` com `label` por `id`), caixas de cantos e sombra.

**Preview (RNF-03):** o painel não re-exporta a imagem inteira. Recebe do `Overlay` um recorte já reduzido a ~260 px de largura e aplica `applyBeautify` sobre ele — a margem proporcional faz o resultado reduzido ser fiel ao real (RN-16). Recalculado num `useEffect` sobre as opções.

### 5.6 `Overlay.tsx`

**Rastreio de cursor.** `onPointerMove` hoje sai cedo quando não há arrasto; passa a atualizar `cursorImg` **sempre**, e só então tratar o arrasto. A lupa aparece quando `phase === 'select'` ou `tool === 'eyedropper'` (RN-01).

O canvas principal **não** é redesenhado a cada movimento: o efeito de desenho depende de `[phase, selection, editor, draft, pxScale]`, e `cursorImg` não está nessa lista. Só a lupa redesenha (RNF-01).

**Conta-gotas.** No `pointerdown` com `tool === 'eyedropper'`: `setColor(hoverColor)` + `window.arcanshot.copyColor(hoverColor)`. Nenhuma anotação criada (RN-05), nenhum arrasto iniciado.

**Traço livre.** Novo `DragState` `{ type: 'draft-freehand' }`; o `draft` acumula pontos, filtrando movimentos menores que ~2 px de imagem para não inchar o array. No `pointerup`, menos de 2 pontos ⇒ descartado (RN-09/FA-6).

**Tarja.** Mesmo caminho do desfoque, com `clampRectToBounds` e o mesmo mínimo (RN-13).

**Embelezamento.** Estado local inicializado de `init.settings`; cada ajuste atualiza o estado na hora e agenda a persistência com **debounce de 400 ms** (o deslizante dispararia dezenas de escritas em `settings.json`). Falha na persistência é engolida (RN-20/FA-5). O botão ✨ não é renderizado quando `init.mode === 'redit'` (RN-21).

**Toolbar medida.** `toolbar-wrapper` ganha um `ref`; um `ResizeObserver` alimenta `toolbarSize`, usado por `placeToolbar`. Quando a medição não está disponível (jsdom devolve 0), cai nas constantes atuais — assim o teste de posicionamento da 0007 segue determinístico.

### 5.7 IPC — `editor:copy-color`

```ts
ipcMain.handle('editor:copy-color', (_e, hex: string) => {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return { ok: false, error: 'Cor inválida' }
  clipboard.writeText(hex.toUpperCase())
  notify(ctx.store.load(), 'ArcanShot', `Cor ${hex.toUpperCase()} copiada`)
  return { ok: true }
})
```
Valida no main mesmo o renderer já validando — padrão §9 da arquitetura. **Não** fecha o overlay (diferente de `editor:copy`): o usuário continua anotando.

---

## 6. Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| Lupa engasgar o arrasto | Cor lida do canvas pequeno; canvas principal fora das dependências do redraw; verificado no roteiro manual |
| Tarja dar falsa sensação de segurança | RN-11 exige opacidade total, com teste que verifica `fillRect` sem `globalAlpha`; a spec diz explicitamente que o desfoque **não** serve para dado sensível |
| Fundo transparente virar preto em JPG | `pickExportFormat` força PNG, com teste dedicado (RN-18) |
| Moldura sobre moldura na re-edição | Botão ✨ ausente no modo `redit` (RN-21) |
| Escrita excessiva em `settings.json` | Debounce de 400 ms no deslizante |
| Regressão na exportação sem acabamento | Parâmetro opcional; teste compara dataUrl com e sem o argumento (RN-22) |
| Toolbar maior estourar monitor estreito | Medição real + `placeToolbar` da 0007 já clampa ao monitor |

---

## 7. Plano de Implementação

1. `shared/types.ts` + `shared/settings.ts` + `shared/beautify.ts` + `geometry.placeNearCursor` — com testes unitários
2. `lib/editor.ts` (render de `freehand`/`redact`, `exportSelection`) + `lib/beautify.ts`
3. `Magnifier.tsx` e `BeautifyPanel.tsx`
4. `Toolbar.tsx` (3 ferramentas + ✨)
5. `Overlay.tsx` (cursor, conta-gotas, traço, tarja, painel, toolbar medida)
6. `preload` + `ipc` (`copyColor`)
7. Factories, testes de componente e a11y
8. `typecheck` + `lint` + suite + `build`

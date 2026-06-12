# 0001 — Desenho Técnico

**Data:** 2026-06-12 · **Autor:** arc-lider (Momento A, via arc-specfull)

## 1. Resumo da Abordagem
Ao acionar a captura, o main process fotografa todos os displays via `desktopCapturer`
(resolução física, por display) e abre janelas overlay frameless cobrindo cada monitor
com a imagem congelada. O renderer do overlay implementa seleção + editor de anotações
**vetorial** sobre `<canvas>`: anotações são objetos re-renderizados a cada frame, o que
dá undo/redo e edição não destrutiva de graça. Exportação recorta a seleção + anotações
num canvas offscreen e devolve dataURL ao main, que copia ao clipboard e/ou salva em
disco com nome gerado pelo padrão configurado. Configurações ficam em JSON no `userData`,
com validação compartilhada (`src/shared`) entre formulário (feedback imediato) e main
(autoridade final). Toda lógica pura (tokens de nome, geometria, validação, modelo do
editor) vive em `src/shared` — testável sem Electron.

## 2. Alternativas Consideradas
| Alternativa | Decisão | Motivo |
|---|---|---|
| Desenho rasterizado direto no canvas (sem objetos) | ❌ | Sem undo/redo decente nem mover/editar anotação |
| SVG para anotações | ❌ | Export exige re-render p/ canvas de qualquer forma; blur de região é canvas-only |
| Uma única janela overlay esticada por todos os monitores | ❌ | Quebra com DPI misto no Windows; janela por display é o padrão robusto (Flameshot faz igual) |
| `getDisplayMedia` no renderer p/ captura | ❌ | Abre picker do SO; `desktopCapturer` no main é silencioso e por display |
| electron-store p/ settings | ❌ | Dependência desnecessária; JSON próprio com merge de defaults é trivial e testável |

## 3. Reutilização
`COMPONENTS.md` está vazio (primeira feature). Componentes novos previstos para registro:
`SettingsForm` (não reutilizável — específico), **`Toolbar`** e **`editor.ts` (modelo de
anotações)** registráveis como reutilizáveis para uma futura feature de "histórico/reabrir editor".

## 4. Modelo de Dados
Sem banco. Tipos centrais (`src/shared/types.ts`):

```ts
type CaptureMode = 'area' | 'full' | 'all'
interface AppSettings {
  saveDir: string; filenamePattern: string;
  imageFormat: 'png' | 'jpg'; jpgQuality: number;
  hotkeyArea: string; hotkeyFull: string; hotkeyAll: string;
  launchOnStartup: boolean; copyOnSave: boolean; showNotifications: boolean;
}
interface DisplayCapture { displayId: number; bounds: Rect /*DIP*/; scaleFactor: number; dataUrl: string /*PNG físico*/ }
interface OverlayInitData { mode: CaptureMode; displays: DisplayCapture[]; settings: AppSettings }
type Annotation =
  | { kind: 'shape'; tool: 'rect'|'ellipse'|'arrow'|'line'|'highlight'; start: Point; end: Point; color: string; strokeWidth: number }
  | { kind: 'blur'; rect: Rect }
  | { kind: 'text'; x: number; y: number; text: string; color: string; fontSize: number }
  | { kind: 'step'; x: number; y: number; n: number; color: string }
```

Persistência: `settings.json` (escrita atômica: `.tmp` + `rename`). Corrompido ⇒ defaults (RN7).

## 5. Contratos de API (IPC)
| Canal | Direção | Payload → Resposta |
|---|---|---|
| `settings:get` | R→M | — → `AppSettings` |
| `settings:save` | R→M | `Partial<AppSettings>` → `{ok:true, settings}` \| `{ok:false, fieldErrors}` |
| `settings:pick-dir` | R→M | — → `{ok:true, path?}` (cancelado ⇒ sem path) |
| `capture:start` | R→M | `CaptureMode` → `{ok}` |
| `overlay:init` | R→M | — → `OverlayInitData` (resolvida pelo `webContents.id` chamador) |
| `overlay:begin-edit` | R→M | — → `{ok}` (fecha overlays dos outros displays) |
| `overlay:cancel` | R→M | — → `{ok}` (fecha todos os overlays) |
| `editor:copy` | R→M | `{dataUrl}` → `{ok}` (clipboard + fecha + notifica) |
| `editor:save` | R→M | `{dataUrl}` → `{ok, filePath}` \| `{ok:false, error}` (overlay fica aberto — 5g) |
| `editor:save-as` | R→M | `{dataUrl}` → `{ok, filePath?}` (cancelado ⇒ ok sem path) |
| `app:version` | R→M | — → `string` |

Erros nunca lançam para o renderer: sempre `{ok:false, error|fieldErrors}`.

## 6. Arquitetura da Solução
- **main/index.ts**: single-instance lock, tray (menu: 3 capturas, Configurações, Sair), registro de hotkeys (re-registro ao salvar settings; falha ⇒ notificação — 5f), `setLoginItemSettings`.
- **main/capture.ts**: `captureAllDisplays()` — uma chamada `desktopCapturer.getSources` por display com `thumbnailSize` no tamanho físico exato; match por `display_id`, fallback por índice.
- **main/overlay.ts**: cria janelas por modo (area: N janelas; full: 1 no display do cursor; all: 1 no primário com todas as imagens); guarda `OverlayInitData` por `webContents.id`.
- **main/settingsStore.ts**: classe com `baseDir` injetado (testável); `load()` merge defaults, `save(partial)` atômico.
- **main/saveImage.ts**: `dataUrlToBuffer`, `uniquePath` (RN2), `saveCapture` (mkdir -p — RN8).
- **renderer/overlay**: máquina de estados `select → edit`; canvas em px físico, CSS em DIP (fator = scaleFactor); modo `all` compõe displays num canvas único na disposição real com `canvasScale = max(scaleFactor)` e zoom-fit (RN10: fundo preto).
- **renderer/overlay/lib/editor.ts**: estado `{annotations, undoStack, redoStack}`, `renderScene(ctx, …)`, `exportSelection(...) → dataURL`; pixelização: região → canvas reduzido (bloco ≥ 8 px — RN6) → de volta com `imageSmoothingEnabled=false`.
- **renderer/settings**: formulário controlado; validação local com `shared/settings.validateSettings` + autoridade no main; preview ao vivo do padrão de nome com `shared/filenamePattern`.

## 7. Integrações Externas
Nenhuma. Fronteira para mock em testes: APIs Electron (`desktopCapturer`, `clipboard`, `dialog`) e, no renderer, `window.arcanshot` (preload).

## 8. Eventos / Jobs / Filas
N/A.

## 9. Cache e Performance
- Imagem congelada desenhada 1× num canvas base; anotações re-renderizadas só em mudança (requestAnimationFrame coalescido).
- Captura usa PNG dataURL (sem reencode no main).
- Overlay deve abrir < 600 ms: nenhuma espera de rede; janelas criadas com `show:false` + `ready-to-show`.

## 10. Segurança e LGPD
`contextIsolation:true`, `sandbox:true`, `nodeIntegration:false`; preload expõe API mínima tipada; nomes de arquivo sanitizados (sem `..` e caracteres ilegais); nada sai da máquina.

## 11. Frontend — `data-testid` e ARIA
Prefixos: `settings-*` e `editor-*`.

| Elemento | data-testid | ARIA |
|---|---|---|
| Form configurações | `settings-form` | — |
| Campo pasta | `settings-save-dir` | `label[for=save-dir]` |
| Botão escolher pasta | `settings-pick-dir` | `aria-label="Escolher pasta"` |
| Campo padrão de nome | `settings-filename-pattern` | `aria-describedby` ajuda+erro |
| Preview do nome | `settings-filename-preview` | `role="status"` |
| Select formato | `settings-image-format` | label |
| Qualidade JPG | `settings-jpg-quality` | `aria-describedby` erro; `disabled` quando png |
| Atalhos (3) | `settings-hotkey-{area,full,all}` | labels |
| Checkboxes (3) | `settings-{launch-on-startup,copy-on-save,show-notifications}` | labels |
| Botão salvar | `settings-save` | — |
| Msg sucesso | `settings-success` | `role="status"` |
| Erro por campo | `settings-error-{campo}` | `id` referenciado pelo campo |
| Toolbar | `editor-toolbar` | `role="toolbar"` + roving tabindex (setas) |
| Botão ferramenta | `editor-tool-{rect,ellipse,arrow,line,highlight,blur,text,step,select}` | `aria-label` + `aria-pressed` |
| Cores | `editor-color-{n}` / `editor-color-custom` | `aria-label` |
| Espessura | `editor-stroke-{s,m,l}` | `aria-label` + `aria-pressed` |
| Undo/Redo | `editor-undo` / `editor-redo` | `aria-label`, `disabled` |
| Ações | `editor-{copy,save,save-as,cancel}` | `aria-label` |
| Caixa de texto da anotação | `editor-text-input` | `aria-label="Texto da anotação"` |

Teclado no overlay: `Esc`, `Ctrl+C`, `Ctrl+S`, `Ctrl+Shift+S`, `Ctrl+Z`, `Ctrl+Y`/`Ctrl+Shift+Z`.

## 12. Estratégia de Testes desta Feature
- **Main integração (sem mock interno):** `SettingsStore` e `saveImage` com **fs real em tmp** — estado do disco verificado pós-operação.
- **Unitário:** `filenamePattern` (tokens, sanitização, validação), `geometry` (normalize, clamp, DIP↔px), `settings` (defaults, merge, validação), `editor` (undo/redo, numeração sequencial — RN5).
- **FE componente:** `SettingsForm` (sucesso E erros: validação local, `fieldErrors` do main, falha de IPC) e `Toolbar` (seleção de ferramenta, aria-pressed, undo desabilitado, navegação por setas). a11y: jest-axe sem violações.
- **FE integração:** formulário completo com `window.arcanshot` mockado na fronteira do preload.
- **E2E (Playwright `_electron`):** app inicia com `ARCANSHOT_USER_DATA` em tmp e `ARCANSHOT_OPEN_SETTINGS=1`; altera padrão de nome; salva; verifica `settings.json` no disco.
- **Factories:** `settingsFactory`, `annotationFactory` (faker). **Seeder:** `seedSettingsFile(dir, overrides)`.

## 13. Arquivos a Criar
`src/shared/{types,settings,filenamePattern,geometry}.ts` · `src/main/{index,ipc,capture,overlay,settingsStore,saveImage}.ts` · `src/preload/index.ts` · `src/renderer/overlay/{index.html,main.tsx,Overlay.tsx,overlay.css,components/{Toolbar.tsx,TextInputLayer.tsx},lib/editor.ts}` · `src/renderer/settings/{index.html,main.tsx,SettingsForm.tsx,settings.css}` · `src/renderer/global.d.ts` · `tests/{setup.ts,unit/*,main/*,renderer/*,factories/*,e2e/*}` · `scripts/gen-icon.mjs` · configs raiz.

## 14. Ordem de Execução
1. shared (tipos + lógica pura) → 2. main (store, saveImage, capture, overlay, ipc, index) → 3. preload → 4. renderer settings → 5. renderer overlay/editor → 6. testes → 7. build/dist.

## 15. Riscos Identificados
- `desktopCapturer` com DPI misto pode devolver thumbnail em tamanho ligeiramente diferente do pedido ⇒ usar dimensões reais da imagem recebida como verdade.
- `PrintScreen` pode estar tomado (OneDrive/Game Bar) ⇒ fluxo 5f.
- `transparent`/fullscreen overlays no Windows têm quirks ⇒ janela opaca com a imagem congelada (sem transparência real).
- Notificações exigem AppUserModelID no Windows ⇒ `app.setAppUserModelId`.

## 16. Pesquisa Realizada
Conhecimento consolidado das APIs estáveis do Electron (desktopCapturer/clipboard/globalShortcut/Tray/screen — estáveis desde v20+) e do padrão de UX do Flameshot. Sem fontes externas adicionais; APIs verificadas contra Electron 38 instalado.

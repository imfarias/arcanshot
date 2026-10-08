# Componentes Reutilizáveis

> Antes de criar componente novo, procure aqui. Se criou um novo reutilizável, registre.

## Frontend
| Nome | Caminho | Propósito | Props principais | Usado em |
|---|---|---|---|---|
| Toolbar | `src/renderer/overlay/components/Toolbar.tsx` | Barra de ferramentas de anotação (role=toolbar, roving tabindex) | tool, color, stroke, canUndo/canRedo + callbacks | 0001 (overlay) |
| TextInputLayer | `src/renderer/overlay/components/TextInputLayer.tsx` | Caixa de digitação posicionada p/ anotação de texto | x, y, color, fontSizeCss, onCommit, onCancel | 0001 (overlay) |
| HotkeyInput | `src/renderer/settings/HotkeyInput.tsx` | Input readonly que captura combinação de teclas e produz acelerador Electron | id, value, onChange + aria props | 0002 (settings) |
| Magnifier | `src/renderer/overlay/components/Magnifier.tsx` | Lupa flutuante: pixels ampliados sem suavização, coordenadas e cor do pixel central | source, point, cssPerImage, viewport, onColorRead | 0008 (overlay) |
| BeautifyPanel | `src/renderer/overlay/components/BeautifyPanel.tsx` | Painel de acabamento com preview ao vivo: fundo, margem, cantos, sombra | options, onChange, renderPreview | 0008 (overlay) |
| Gallery | `src/renderer/gallery/Gallery.tsx` | Galeria de capturas em sequência: thumbnails arraстáveis, salvar em pasta, gerar PDF | Recebe dados via `galleryInit()` IPC | 0005 (gallery) |

## Backend (serviços/utilitários compartilhados)
| Nome | Caminho | Propósito | Assinatura |
|---|---|---|---|
| SettingsStore | `src/main/settingsStore.ts` | Persistência JSON atômica com merge de defaults | `new SettingsStore(baseDir, picturesDir).load()/save(partial)` |
| DisplayCacheStore | `src/main/displayCacheStore.ts` | Cache JSON atômico de `DisplayInfo[]` (best-effort, nunca lança) | `new DisplayCacheStore(baseDir).load()/save(displays)` |
| overlayLayout | `src/main/overlayLayout.ts` | Geometria das janelas de overlay por modo de captura + fatiamento de capturas por janela (puro, sem Electron) | `planOverlayWindows(mode, displays, ctx)` / `pickCapturesForWindow(captures, displayId)` |
| CaptureSession | `src/main/captureSession.ts` | Buffer + timer de detecção de sequência de prints; dispara galeria com ≥ 2 items | `new CaptureSession(getTimeoutMs, onComplete).addCapture(dataUrl)/clearSession()` |
| saveImage | `src/main/saveImage.ts` | Salvamento com padrão de nome + anticolisão | `saveCapture(buf, {saveDir, filenamePattern, imageFormat, now?})` |
| filenamePattern | `src/shared/filenamePattern.ts` | Tokens %Y%m%d%H%M%S + sanitização + validação | `formatFilename(pattern, date)` / `validatePattern(p)` |
| geometry | `src/shared/geometry.ts` | Retângulos: normalize/clamp/scale/union/contains + composição multi-monitor (escala, posicionamento de display, DIP→CSS, viewport, posicionamento de toolbar) | funções puras |
| settings | `src/shared/settings.ts` | Defaults, merge tolerante e validação de AppSettings | `defaultSettings/mergeSettings/validateSettings` |
| beautify (puro) | `src/shared/beautify.ts` | Presets de fundo, geometria proporcional do acabamento e regra de formato | `BACKGROUND_PRESETS/computeBeautifyLayout/pickExportFormat/validateBeautify/beautifyFromSettings` |
| beautify (canvas) | `src/renderer/overlay/lib/beautify.ts` | Aplica fundo, sombra e cantos arredondados sobre um recorte | `applyBeautify(canvas, opts)` / `roundRectPath(ctx, ...)` |
| editor (modelo) | `src/renderer/overlay/lib/editor.ts` | Estado de anotações com undo/redo, render (inclui traço livre e tarja) e export com acabamento opcional | `createEditorState/addAnnotation/undo/redo/drawFreehand/exportSelection` |

## Hooks / Composables / Mixins
| Nome | Caminho | Propósito |
|---|---|---|

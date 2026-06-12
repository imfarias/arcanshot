# Componentes Reutilizáveis

> Antes de criar componente novo, procure aqui. Se criou um novo reutilizável, registre.

## Frontend
| Nome | Caminho | Propósito | Props principais | Usado em |
|---|---|---|---|---|
| Toolbar | `src/renderer/overlay/components/Toolbar.tsx` | Barra de ferramentas de anotação (role=toolbar, roving tabindex) | tool, color, stroke, canUndo/canRedo + callbacks | 0001 (overlay) |
| TextInputLayer | `src/renderer/overlay/components/TextInputLayer.tsx` | Caixa de digitação posicionada p/ anotação de texto | x, y, color, fontSizeCss, onCommit, onCancel | 0001 (overlay) |

## Backend (serviços/utilitários compartilhados)
| Nome | Caminho | Propósito | Assinatura |
|---|---|---|---|
| SettingsStore | `src/main/settingsStore.ts` | Persistência JSON atômica com merge de defaults | `new SettingsStore(baseDir, picturesDir).load()/save(partial)` |
| saveImage | `src/main/saveImage.ts` | Salvamento com padrão de nome + anticolisão | `saveCapture(buf, {saveDir, filenamePattern, imageFormat, now?})` |
| filenamePattern | `src/shared/filenamePattern.ts` | Tokens %Y%m%d%H%M%S + sanitização + validação | `formatFilename(pattern, date)` / `validatePattern(p)` |
| geometry | `src/shared/geometry.ts` | Retângulos: normalize/clamp/scale/union/contains | funções puras |
| settings | `src/shared/settings.ts` | Defaults, merge tolerante e validação de AppSettings | `defaultSettings/mergeSettings/validateSettings` |
| editor (modelo) | `src/renderer/overlay/lib/editor.ts` | Estado de anotações com undo/redo, render e export | `createEditorState/addAnnotation/undo/redo/exportSelection` |

## Hooks / Composables / Mixins
| Nome | Caminho | Propósito |
|---|---|---|

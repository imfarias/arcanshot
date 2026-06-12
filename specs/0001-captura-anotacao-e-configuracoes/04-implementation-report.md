# 0001 — Relatório de Implementação

**Data:** 2026-06-12 · **Autor:** arc-dev (via arc-specfull) · **Status:** ✅ Completo

## 1. Resumo
Feature implementada integralmente conforme o desenho técnico: captura multi-display
congelada com overlay por monitor, editor vetorial de anotações em canvas (8 ferramentas
+ seleção), exportação para clipboard/arquivo com padrão de nome configurável, tray com
atalhos globais e tela de configurações com validação compartilhada. `lint`, `typecheck`
e `build` verdes.

## 2. Arquivos Criados
- `src/shared/`: `types.ts`, `settings.ts` (defaults/merge/validação), `filenamePattern.ts`, `geometry.ts`
- `src/main/`: `index.ts` (tray, hotkeys, single-instance, autostart), `ipc.ts` (todos os canais), `capture.ts`, `overlay.ts`, `settingsStore.ts`, `saveImage.ts`
- `src/preload/index.ts` (contextBridge → `window.arcanshot`)
- `src/renderer/overlay/`: `Overlay.tsx`, `lib/editor.ts`, `components/Toolbar.tsx`, `components/TextInputLayer.tsx`, `overlay.css`, `index.html`, `main.tsx`
- `src/renderer/settings/`: `SettingsForm.tsx`, `settings.css`, `index.html`, `main.tsx`
- `src/renderer/global.d.ts`
- Raiz: `electron.vite.config.ts`, `electron-builder.yml`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.mjs`, `tsconfig.json`, `scripts/gen-icon.mjs`, `README.md`

## 3. Arquivos Alterados
Nenhum (feature inaugural sobre o bootstrap da Etapa 1).

## 4. Migrations
N/A (sem banco). Retrocompatibilidade do `settings.json` garantida por `mergeSettings`.

## 5. Reutilização Aplicada
`COMPONENTS.md` estava vazio. Novos reutilizáveis registrados: `Toolbar`, `editor.ts`
(modelo de anotações), `SettingsStore`, `filenamePattern`, `geometry`.

## 6. IDs e Acessibilidade
Tabela completa de `data-testid` e ARIA implementada exatamente como o design seção 11
(prefixos `settings-*` e `editor-*`). Checklist de teclado:
- [x] Configurações: 100% navegável por Tab; `label[for]` em todos os inputs; erro via `aria-describedby`; foco no primeiro campo inválido; foco visível (outline 2px).
- [x] Toolbar: `role="toolbar"`, `aria-label`, `aria-pressed`, navegação por setas (roving).
- [x] Overlay: Esc cancela; Ctrl+C/S/Shift+S/Z/Y; Enter confirma texto da anotação.

## 7. Variáveis de Ambiente Novas
| Variável | Uso |
|---|---|
| `ARCANSHOT_USER_DATA` | Redireciona userData (testes E2E) |
| `ARCANSHOT_OPEN_SETTINGS` | Abre Configurações no boot (hook de E2E) |

## 8. Comandos para Rodar Localmente
`npm run dev` · `npm test` · `npm run test:e2e` · `npm run lint` · `npm run typecheck` · `npm run dist`

## 9. Decisões Durante Implementação
- Coordenadas: tudo no editor em **pixel físico da imagem**; conversão p/ CSS via fator único `cssPerImage` (1/scaleFactor em area/full; fitScale no modo all) — simplificou DPI misto.
- Validação de settings roda **duas vezes** (renderer p/ UX imediata, main como autoridade) usando o mesmo módulo `shared/settings` — zero divergência.
- `editor:save` com falha **não fecha** o overlay (5g); sucesso fecha e notifica.
- Numeração derivada do estado (count de steps ativos + 1) em vez de contador externo — RN5 sai de graça com undo/redo.
- Ícone gerado proceduralmente (`scripts/gen-icon.mjs`, PNG via zlib) — zero dependência de asset binário no repo.

## 10. Pendências e Débitos Técnicos
- Captura de área cruzando monitores: fora de escopo v1 (modo "all" cobre).
- Sem mover/editar anotação já criada (só undo) — candidata a v1.1.
- Acelerador digitado livre (sem captura de tecla) — campo texto simples.

## 11. Observações para o arc-tester
- `SettingsStore` e `saveCapture` recebem caminhos por parâmetro: testar com fs real em tmp.
- `window.arcanshot` é a fronteira de mock do renderer.
- Hook E2E: `ARCANSHOT_OPEN_SETTINGS=1` + `ARCANSHOT_USER_DATA`.
- Overlay interativo (arrasto de seleção) → roteiro manual; lógica de estado do editor é pura e testável por unidade.

## 12. Bloqueios Encontrados
Nenhum. (Incidente de infra: primeira `npm install` corrompida por TAR_ENTRY_ERROR no
Windows — resolvido limpando `node_modules` e reinstalando.)

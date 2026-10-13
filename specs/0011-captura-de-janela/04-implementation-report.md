# 0011 — Relatório de Implementação

**Data:** 2026-10-13 · **Autor:** arc-dev (via arc-specfull) · **Status:** ✅ Completo

## 1. Resumo
Na seleção de área, `Ctrl` destaca a janela sob o mouse e `Ctrl+clique` a seleciona e abre a edição. A lista de janelas vem do Windows via koffi no início da captura.

## 2. Arquivos Criados
| Arquivo | Conteúdo |
|---|---|
| `src/shared/windowPick.ts` | `selectCaptureWindows`, `pickWindowAt`, `windowToImageRect`, `toImageWindows` (puro) |
| `src/main/windowList.ts` | `listWindows()` via koffi (`EnumWindows`, DWM), carga preguiçosa, nunca lança |
| `tests/unit/windowPick.test.ts`, `tests/main/windowList.test.ts` | testes |

## 3. Arquivos Alterados
| Arquivo | Mudança |
|---|---|
| `src/shared/types.ts` | `WindowInfo`; `OverlayInitData.windows?` |
| `src/main/overlay.ts` | `collectWindows` (antes de criar os overlays) e envio em `windows` |
| `src/renderer/overlay/Overlay.tsx` | estado `windowsImg`/`ctrlHeld`, `hoverWin`, destaque no canvas, Ctrl+clique, dica e etiqueta, lupa oculta |
| `src/renderer/overlay/overlay.css` | `.window-label`, `.overlay-hint` |
| `package.json` / lock | dependência `koffi` |
| `README.md`, `site/web/src/pages/index.astro` | atalho documentado |

## 4. Migrations
Nenhuma.

## 5. Reutilização Aplicada
`unionRect`, `clampRectToBounds`, `findViewportFor`, `size-label`, fluxo `setSelection`+`beginEdit` do arrasto, padrão de módulo puro em `shared/`.

## 6. IDs e Acessibilidade
| Elemento | data-testid | ARIA |
|---|---|---|
| Dica | `editor-window-hint` | `role="note"` |
| Etiqueta da janela | `editor-window-label` | — (decorativa, a seleção é por mouse) |

## 7. Variáveis de Ambiente
Nenhuma.

## 8. Comandos
`npm test` · `npm run build && npx playwright test` · `npx electron-builder --win --dir` (verificar o empacotamento).

## 9. Decisões Durante a Implementação
- **koffi 3** traz o binário num pacote opcional por plataforma (`@koromix/koffi-win32-x64`); o electron-builder o desempacota do asar sozinho (conferido em `release/win-unpacked/resources/app.asar.unpacked`).
- `intptr_t` no lugar de `void *` para `HWND`: chega como `number`, sem conversão de ponteiro.
- A lista é feita **antes** de criar os overlays, então nem precisa excluir janelas do ArcanShot por handle (o parâmetro `excludeHandles` fica disponível, hoje vazio).
- Escala da imagem medida (`base.width / union.width`), igual à 0007: vale em DPI misto.
- A etiqueta mostra o **título da janela** (o que o Windows mostra), não o nome do executável: sem custo nativo extra.

## 10. Pendências
Nenhuma. Observação: o título é exibido apenas no overlay local.

## 11. Observações para o arc-tester
O teste de `listWindows` roda só no Windows (`describe.runIf`); no runner de CI do release (windows-latest) executa de verdade.

## 12. Bloqueios
Nenhum.

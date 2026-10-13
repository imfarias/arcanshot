# 0012 — Relatório de Implementação

**Data:** 2026-10-13 · **Autor:** arc-dev (via arc-specfull) · **Status:** ✅ Completo

## 1. Resumo
Botão "Copiar texto da imagem (OCR)" no editor (e `Ctrl+Shift+C`): lê o texto da seleção com o OCR do Windows e o copia como texto, mantendo o editor aberto.

## 2. Arquivos Criados
| Arquivo | Conteúdo |
|---|---|
| `src/main/ocr.ts` | `recognizeDataUrl` (PowerShell + Windows.Media.Ocr), `parseOcrOutput`, `readPngSize`, `ocrScale` |
| `tests/main/ocr.test.ts` | unitário e integração com o Windows real |
| `tests/fixtures/ocr-texto.png` | imagem com texto conhecido (14 KB) |

## 3. Arquivos Alterados
| Arquivo | Mudança |
|---|---|
| `src/shared/types.ts` | `OcrResult`; `ArcanshotApi.ocrImage` |
| `src/preload/index.ts` | `ocrImage` → `editor:ocr` |
| `src/main/ipc.ts` | handler `editor:ocr`: reconhece e grava o texto no clipboard |
| `src/renderer/overlay/Overlay.tsx` | `handleOcr`, estados do aviso, atalho `Ctrl+Shift+C` |
| `src/renderer/overlay/components/Toolbar.tsx` | botão com `onOcr`/`ocrBusy` opcionais |
| `src/renderer/shared/Icon.tsx`, `overlay.css` | ícone `ocr`; estado desabilitado do botão de ação |
| `tests/renderer/*` | mocks da API com `ocrImage`; testes novos |
| `README.md`, `site/web/src/pages/index.astro` | atalho documentado |

## 4. Migrations
Nenhuma.

## 5. Reutilização Aplicada
`dataUrlToBuffer`, `exportSelection`, posição do aviso da 0011, padrão de nativo opcional da 0011, `imageFactory`.

## 6. IDs e Acessibilidade
| Elemento | data-testid | ARIA |
|---|---|---|
| Botão de OCR | `editor-ocr` | `aria-label` "Copiar o texto da imagem (OCR)", `title` com atalho, `disabled` enquanto lê |
| Aviso | `editor-ocr-status` | `role="status"` |

Teclado: botão na ordem natural da barra (setas); `Ctrl+Shift+C` aciona.

## 7. Variáveis de Ambiente
Apenas as internas do processo filho (`ARCANSHOT_OCR_PATH`, `ARCANSHOT_OCR_SCALE`).

## 8. Comandos
`npm test` · `npm run build && npx playwright test` · `npx electron-builder --win --dir`.

## 9. Decisões Durante a Implementação
- O script usa `Lines` unidas por `\n`; `OcrResult.Text` junta tudo com espaços e perde a estrutura.
- Sem acentos graves no script (`like 'IAsyncOperation*'`, `[char]10`): um template literal com o escape do PowerShell ficava ilegível e frágil.
- O texto é gravado no clipboard **no main** e o renderer só recebe a contagem.
- O botão só existe se `onOcr` for passado: usos antigos da `Toolbar` não mudam.

## 10. Pendências
Nenhuma.

## 11. Observações para o arc-tester
O teste CT-OC-12 usa `ctx.skip()` se o runner não tiver idioma de OCR — o objetivo é não bloquear o release por uma limitação do ambiente.

## 12. Bloqueios
Nenhum.

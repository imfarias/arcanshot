# 0010 — Desenho Técnico: Fundo da Página do PDF por Imagem

**Data:** 2026-10-09 · **Autor:** arc-lider (Momento A, via arc-specfull)

## 1. Resumo da Abordagem

O editor já sabe qual fundo pôs na imagem; o PDF só precisa recebê-lo. O id do preset viaja **com a captura**: `copyImage/saveImage/saveImageAs(dataUrl, background?)` → `CaptureSession.addCapture(dataUrl, background?)` → `GalleryItem.background?` → `buildPdf([{ dataUrl, background }])`. No `pdfBuilder`, `paintPageBackground` pinta a página (sólido = retângulo; degradê = sombreamento axial nativo do PDF); sem fundo, branco.

## 2. Alternativas Consideradas

| Alternativa | Por que não |
|---|---|
| Ler a cor dos cantos da imagem (pixels) | Exige decodificar PNG/JPG no main; para imagem sem embelezar pintaria a página com um pixel qualquer da tela; degradê exigiria amostrar e reconstruir. |
| Usar `settings.beautifyBackground` salvo na hora de gerar o PDF | Diz o fundo **de agora**, não o de cada imagem (o usuário troca de fundo entre prints; "por imagem" é o pedido); e a configuração salva é debounced, pode estar defasada. |
| Degradê como PNG pequeno esticado | Imagem extra por página, interpolação do leitor e eixo errado fora de página quadrada; o sombreamento axial é vetorial e exato. |

## 3. Reutilização

`BACKGROUND_PRESETS`/`resolveBackground` (0008), `planPdfPages`/`buildPdf` (0009). Novo helper puro `pageBackground(id: unknown)` em `shared/beautify.ts`, usado no main (sanitiza) e no editor (decide o que informar).

## 4. Modelo de Dados

`GalleryItem { index; dataUrl; background?: string }`. `PdfInput { dataUrl; background? }`; `buildPdf` aceita `(string | PdfInput)[]` (compatível com os chamadores antigos).

## 5. Contratos de API (IPC)

| Canal | Antes | Depois |
|---|---|---|
| `editor:copy`, `editor:save`, `editor:save-as` | `(dataUrl)` | `(dataUrl, background?)` — no main, `pageBackground(background)?.id` (qualquer coisa fora dos presets pintáveis vira ausente) |
| `gallery:export-pdf` | itens como string | itens como `{ dataUrl, background }` |

## 6. Arquitetura da Solução

`getDataUrl` do editor não muda. Novo `exportedBackground()`: `undefined` se embelezar desligado ou modo `redit` (RN-12); senão `pageBackground(beautify.background)?.id` (transparente → undefined). Na re-edição, `updateGalleryItem` só troca o `dataUrl`, então o item mantém o `background` (FA-3).

PDF: `Coords [0, H, W, 0]` (origem do PDF é embaixo à esquerda) equivale ao `createLinearGradient(0, 0, w, h)` do canvas do embelezar; `C0/C1` vêm de `colors[0]/[1]` do preset; `Extend [true, true]`. O sombreamento entra em `Resources/Shading` e é pintado com `sh` entre `q`/`Q`, antes da imagem.

## 7–10. Integrações, eventos, cache, segurança

Nenhuma integração, evento ou cache novos. O id vem do renderer: validado contra a lista fechada de presets no main.

## 11. Frontend

Sem UI nova. `data-testid` existentes inalterados.

## 12. Estratégia de Testes

- Integração (main): `buildPdf` com pdf-lib real; o PDF é relido e o dicionário de sombreamento (cores C0/C1) e os operadores da página (`sh`, `rg`) são verificados.
- Unitário: `pageBackground`; `CaptureSession` guarda/omite o fundo.
- Componente: Overlay informa o fundo ao copiar/salvar/salvar como; não informa sem embelezar, com transparente ou em re-edição.
- Verificação visual: PDF de exemplo aberto no Chrome (violeta degradê, grafite e branco).

## 13. Arquivos

Alterados: `shared/beautify.ts`, `shared/types.ts`, `preload/index.ts`, `main/ipc.ts`, `main/captureSession.ts`, `main/pdfBuilder.ts`, `renderer/overlay/Overlay.tsx`; testes de `pdfBuilder`, `beautify`, `captureSession`, `Overlay`.

## 14. Ordem

Tipos → helper → session/IPC → pdfBuilder → editor → testes.

## 15. Riscos

| Risco | Mitigação |
|---|---|
| Re-edição que corta a moldura: página segue com o fundo original | Aceito (FA-3); o fundo ainda é o do print. |
| Item sem `background` (sequência montada por versão anterior) | Campo opcional; ausente = branco. |

## 16. Pesquisa

pdf-lib: `context.obj`, `PDFOperatorNames.ShadingFill`; PDF 1.7 §8.7.4.5.3 (ShadingType 2, axial, com Function tipo 2). Código: `lib/beautify.ts` (eixo do degradê).

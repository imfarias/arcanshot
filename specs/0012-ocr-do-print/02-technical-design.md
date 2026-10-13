# 0012 — Desenho Técnico: OCR do Print

**Data:** 2026-10-13 · **Autor:** arc-lider (Momento A, via arc-specfull)

## 1. Resumo da Abordagem

O editor exporta a seleção (com anotações, sem acabamento) como PNG e chama `ocrImage(dataUrl)`. O main grava o PNG num temporário, roda `powershell.exe` com um script embutido que usa `Windows.Media.Ocr`, devolve um JSON UTF-8 e **copia o texto no clipboard**. O renderer recebe só `{ ok, chars, language }` ou o motivo da falha e mostra o aviso.

## 2. Alternativas Consideradas

| Alternativa | Por que não |
|---|---|
| Tesseract embutido (tesseract.js) | +25–35 MB no instalador, 1–3 s por leitura, precisão um pouco menor em texto de tela. Descartada pelo usuário. |
| OCR em nuvem | Quebra a promessa de 100% local e privado do produto. |
| WinRT direto via koffi | Dezenas de interfaces COM/WinRT e `IAsyncOperation` à mão; frágil. O PowerShell já expõe o WinRT. |
| Módulo nativo `@nodert-win10-*` | Abandonado e exige compilação. |
| Devolver o texto ao renderer e copiar lá | O texto trafegaria sem necessidade; `clipboard` do Electron só existe no main. |

## 3. Reutilização
`dataUrlToBuffer` (saveImage), `exportSelection` (editor), `Toolbar`/`Icon`, posição do aviso (mesma da dica da 0011), padrão "nativo opcional que degrada" da 0011, `imageFactory` (0009).

## 4. Modelo de Dados
```ts
type OcrOutcome =                           // main/ocr.ts
  | { ok: true; text: string; language: string }
  | { ok: false; reason: 'empty' | 'unavailable' | 'error'; error?: string }
type OcrResult =                            // shared/types.ts (sem o texto)
  | { ok: true; chars: number; language: string }
  | { ok: false; reason: 'empty' | 'unavailable' | 'error'; error?: string }
```

## 5. Contratos
| Canal | Entrada | Saída |
|---|---|---|
| `editor:ocr` | `dataUrl: string` | `OcrResult` (o texto vai ao clipboard no main) |

Preload: `ocrImage(dataUrl)`.

## 6. Arquitetura da Solução
- `main/ocr.ts`: `recognizeDataUrl` (nunca lança), `parseOcrOutput`, `readPngSize`, `ocrScale` (puros).
- Script (PowerShell 5.1 do sistema, caminho absoluto em `%SystemRoot%`): `-NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand`. O caminho do PNG e a escala vão por **variáveis de ambiente**, nada vai para a linha de comando. Saída: um objeto JSON (`status: ok|unavailable|error`).
- `TryCreateFromUserProfileLanguages`, com fallback para o primeiro idioma de `AvailableRecognizerLanguages`.
- Escala via `BitmapTransform` no decodificador (limite do reconhecedor: 10.000 px; usamos 8.000).
- Linhas do `OcrResult.Lines` unidas por `\n` (não o `.Text`, que junta com espaços).
- Timeout de 30 s com `kill`; temporário removido em `finally`.
- Renderer: `handleOcr` com guarda de "ocupado"; estados `busy|ok|empty|unavailable|error`; aviso por 4 s; atalho `Ctrl+Shift+C`.

## 7–10. Integrações, eventos, cache, segurança
Chamada local ao Windows; nenhum dado sai da máquina. O `dataUrl` vindo do renderer passa por `dataUrlToBuffer` (rejeita o que não é imagem). Temporário com UUID no diretório do usuário, apagado sempre. Texto não é logado.

## 11. Frontend
`editor-ocr` (botão, `aria-label`/`title`), `editor-ocr-status` (`role="status"`). Toolbar ganha `onOcr?`/`ocrBusy?` opcionais (sem o callback o botão não existe: testes e usos antigos intactos).

## 12. Estratégia de Testes
- Unitário (puro): `readPngSize`, `ocrScale`, `parseOcrOutput`.
- Integração (Windows real): `recognizeDataUrl` lendo `tests/fixtures/ocr-texto.png` com o reconhecedor do sistema; tolerante a "sem idioma" (`ctx.skip`) para não travar runner sem pacote de OCR; confere que o temporário é apagado.
- Componente: editor (sucesso, vazio, indisponível, erro, exceção, ocupado, atalho, sem acabamento, aviso some, axe) e Toolbar (botão, desabilitado, axe).
- Empacotado: ponte → PowerShell → clipboard, no app de `electron-builder --dir`.

## 13. Arquivos
Criar: `main/ocr.ts`, `tests/main/ocr.test.ts`, `tests/fixtures/ocr-texto.png`. Alterar: `shared/types.ts`, `preload/index.ts`, `main/ipc.ts`, `Overlay.tsx`, `Toolbar.tsx`, `Icon.tsx`, `overlay.css`, mocks de testes, `README.md`, tabela de atalhos do site.

## 14. Ordem
Módulo → tipos/IPC → UI → testes → docs.

## 15. Riscos
| Risco | Mitigação |
|---|---|
| PowerShell restrito (Constrained Language) em PC corporativo | Resposta `unavailable`/`error` com aviso claro; o editor segue normal. |
| Windows sem idioma de OCR | Fallback para qualquer idioma disponível; senão `unavailable` com instrução. |
| Texto em idioma diferente do instalado | O reconhecedor de letras latinas lê razoavelmente; fora do escopo trocar de idioma. |
| Antivírus reagir a PowerShell | Script só lê um arquivo e usa API do sistema; sem rede. |

## 16. Pesquisa
`Windows.Media.Ocr.OcrEngine` (`TryCreateFromUserProfileLanguages`, `MaxImageDimension` = 10000), `BitmapDecoder.GetSoftwareBitmapAsync` com `BitmapTransform`; padrão `AsTask` por reflexão para aguardar `IAsyncOperation` no PowerShell 5.1. Medido aqui: 0,3 s no PowerShell, ~0,7 s no ciclo completo.

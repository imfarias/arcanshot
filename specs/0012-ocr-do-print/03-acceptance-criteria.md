# 0012 — Critérios de Aceite

**Data:** 2026-10-13 · **Autor:** arc-lider (Momento A, via arc-specfull)

## 1. Critérios Funcionais
- **CA-01:** o botão (e `Ctrl+Shift+C`) lê o texto da seleção e o copia como texto (RN-03).
- **CA-02:** o editor continua aberto e nada é copiado/salvo como imagem (RN-08).
- **CA-03:** a leitura mostra "Lendo…", desabilita o botão e ignora novo pedido (FA-4).
- **CA-04:** o aviso informa quantos caracteres foram copiados e some sozinho.
- **CA-05:** sem texto, indisponível e erro têm mensagens próprias e não alteram o clipboard (FA-1..3).
- **CA-06:** a leitura não inclui o acabamento do embelezar (RN-01).
- **CA-07:** as linhas da imagem viram linhas do texto (RN-05).
- **CA-08:** o arquivo temporário é apagado sempre (RN-06).
- **CA-09:** funciona no app empacotado.
- **CA-10:** `Ctrl+C` continua copiando a imagem.

## 2. Integração (Windows real)
CT-OC-12 lê `ocr-texto.png` e confere o texto, as linhas e o temporário apagado · CT-OC-11 imagem sem texto não é sucesso · CT-OC-10 dataUrl inválido não lança.

## 3. Unitário
CT-OC-01/02 `readPngSize` · CT-OC-03/04 `ocrScale` · CT-OC-05..09 `parseOcrOutput`.

## 4. Componente
CT-FC-70 sucesso e editor aberto · 70b sem acabamento · 71 atalho · 72 ocupado · 73 vazio · 74 indisponível · 75/75b erro e exceção · 76 aviso some · 77 axe · CT-TB-20..22 botão, desabilitado e axe.

## 5. FE integração / 6. E2E
Sem fluxo de configurações novo. Verificação no app empacotado: ponte → PowerShell → clipboard (feita à mão com Playwright; não mantida na suíte por depender do idioma de OCR do runner).

## 7. Massa de Dados
`tests/fixtures/ocr-texto.png` (texto conhecido, gerado com o Chrome) e `imageFactory`.

## 8. Cobertura
`main/ocr.ts`: funções puras 100%; o caminho do processo é coberto pela integração real.

## 9. Definition of Done
- [x] CA-01..CA-10 · [x] testes verdes · [x] lint/typecheck · [x] conferido no app empacotado · [x] README, site, COMPONENTS, MEMORY e INDEX atualizados

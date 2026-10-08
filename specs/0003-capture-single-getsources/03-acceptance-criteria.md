# 0003 — Critérios de Aceite

**Data:** 2026-06-13 · **Autor:** arc-lider (via arc-specfull)

## Critérios Automáticos (estrutura do código)

| ID | Critério | Verificação |
|----|----------|-------------|
| CA1 | `captureAllDisplays` contém exatamente uma chamada a `getSources` | grep `getSources` em `capture.ts` → 1 ocorrência |
| CA2 | `thumbnailSize` usa o máximo de width e height entre todos os displays | leitura do código |
| CA3 | Loop de mapeamento usa array de sources retornado da única chamada | leitura do código |

## Critérios Manuais (roteiro)

| ID | Passos | Esperado |
|----|--------|----------|
| CM1 | Setup 2 monitores → acionar captura (PrintScreen) → cronometrar | Overlay abre visivelmente mais rápido que antes da correção |
| CM2 | Setup 1 monitor → acionar captura | Overlay abre normalmente, imagem correta |
| CM3 | Setup 2 monitores com resoluções diferentes → acionar captura "todas as telas" | Ambos os overlays exibem imagem correta sem distorção |
| CM4 | Anotar e copiar após captura multi-monitor | Cópia no clipboard com conteúdo correto |

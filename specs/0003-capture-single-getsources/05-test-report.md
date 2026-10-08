# 0003 — Relatório de Testes

**Data:** 2026-06-13 · **Autor:** arc-tester (via arc-specfull)

## 1. Cobertura

`capture.ts` usa `desktopCapturer` diretamente — sem teste automatizado possível sem
driver Electron real. A lógica de seleção de source (`find(display_id) ?? sources[i] ?? sources[0]`)
é idêntica à versão anterior e já estava coberta implicitamente pelos testes E2E manuais.

## 2. Suite Geral

```
Test Files: 10 passed (10)
     Tests: 78 passed (78)
  Duration: ~4,3 s
```

Nenhum teste regrediu com a mudança em `capture.ts`.

## 3. Testes Manuais Requeridos (roteiro)

| CM | Passos | Esperado |
|----|--------|----------|
| CM1 | 2 monitores → PrintScreen → cronometrar | Overlay abre sem delay perceptível |
| CM2 | 1 monitor → PrintScreen | Overlay normal, imagem correta |
| CM3 | 2 monitores com tamanhos diferentes → captura "todas as telas" | Ambos exibem imagem correta |
| CM4 | Anotar + copiar após CM3 | Clipboard com conteúdo correto |

## 4. Bugs Encontrados
_Nenhum._

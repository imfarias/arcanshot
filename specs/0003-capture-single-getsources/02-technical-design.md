# 0003 — Desenho Técnico

**Data:** 2026-06-13 · **Autor:** arc-lider (Momento A, via arc-specfull)

## 1. Resumo do Design

| Área | Mudança |
|---|---|
| `src/main/capture.ts` | `Promise.all` com N chamadas → 1 chamada com `thumbnailSize` = max físico entre todos os displays |

**Nenhum outro arquivo alterado.**

## 2. Alternativas Consideradas

### A1 — `Promise.all` N chamadas (0002 — status quo com bug)
Dispara N promises, mas Electron serializa internamente via mutex no processo nativo.
Resultado: N × latência de getSources. **Descartado.**

### A2 — Uma chamada com max physical size ✅ (escolhida)
Uma única chamada com `thumbnailSize = { width: maxW, height: maxH }`.
Electron captura cada fonte ao tamanho requisitado (upscale para displays menores).
O overlay usa `display.bounds × scaleFactor` como dimensões do canvas — o thumbnail
oversized é desenhado na proporção correta via `drawImage`.
Overhead: thumbnails de displays menores têm mais bytes que o necessário, mas são
descartados após o `toDataURL()` — aceitável.

### A3 — Pre-warm (capturar antes do atalho)
Captura em background + polling de validade. Evita latência, mas risco de snapshot
obsoleto e estado global complexo. **Descartado.**

## 3. Algoritmo

```
displays = screen.getAllDisplays()
maxSize  = reduce(displays, max(w×scaleFactor, h×scaleFactor))
sources  = await desktopCapturer.getSources({ types:['screen'], thumbnailSize: maxSize })
return displays.map((display, i) =>
  source = find(display_id) ?? sources[i] ?? sources[0]
  { displayId, bounds, scaleFactor, dataUrl: source.thumbnail.toDataURL() }
)
```

## 4. Impacto em Testes
Nenhum teste existente testa `capture.ts` diretamente (módulo usa `desktopCapturer`,
que requer driver Electron). A correção é verificável via teste manual (roteiro em 03).

# 0011 — Relatório de Testes

**Data:** 2026-10-13 · **Autor:** arc-tester (via arc-specfull)
**Resultado:** ✅ Vitest 369 passando + 1 pulado (só roda fora do Windows); lint e typecheck limpos

## 1. Estratégia
Regras puras testadas isoladas; a ponte nativa testada com o **user32/dwmapi reais**; o editor com a ponte `window.arcanshot` mockada na fronteira do preload (mesmos stubs de canvas/Image/PointerEvent da 0007). Verificação adicional no app **empacotado**.

## 2. Testes Implementados
| Categoria | Arquivo | Novos |
|---|---|---|
| Unitário | `tests/unit/windowPick.test.ts` (CT-WP-01..23) | 16 |
| Integração (Windows real) | `tests/main/windowList.test.ts` (CT-WL-01..04) | 4 (1 pulado no Windows) |
| Componente | `tests/renderer/Overlay.test.tsx` (CT-FC-60..66, com variantes) | 11 |

Factories: janelas fabricadas por teste sobre `displayInfoFactory`/`dualAreaInit`. Seeders: não se aplica.

## 3. Mapeamento Cenário → Teste
Idêntico ao 03 (CT-WL, CT-WP, CT-FC-60..66).

## 4. Cobertura
`windowPick.ts` 100% · `windowList.ts` 94% linhas (resto: ramos de erro nativo e plataforma não-Windows) · `Overlay.tsx` 88%.

## 5. Adicionais
- Janela que cruza monitores e faixa vazia entre monitores (CT-WP-06/07).
- Fronteiras do hit-test (esquerda/superior dentro, direita/inferior fora).
- Enumeração repetida 25× (callback nativo liberado) e limite de 250 ms.
- Conferência no app empacotado: o atalho de área entrega ao overlay 7 janelas reais, na ordem de empilhamento, em DIP.

## 6. Bugs Encontrados
Nenhum.

## 7. Comandos
`npx vitest run --coverage` · `npm run build && npx playwright test` · `npx electron-builder --win --dir`

## 8. Observações para o arc-lider
- Não há E2E permanente do Ctrl+clique: ele dependeria de quais janelas existem no runner e de pointer/teclado reais sobre um overlay em tela cheia; a verificação no empacotado foi manual (script descartável).
- O ajuste visual (destaque azul, etiqueta e dica) foi conferido em capturas do overlay.

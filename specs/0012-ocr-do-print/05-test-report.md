# 0012 — Relatório de Testes

**Data:** 2026-10-13 · **Autor:** arc-tester (via arc-specfull)
**Resultado:** ✅ Vitest 394 passando + 1 pulado (só roda fora do Windows); lint e typecheck limpos

## 1. Estratégia
Regras puras isoladas; leitura **real** com o reconhecedor do Windows contra uma imagem com texto conhecido; editor com a ponte `window.arcanshot` mockada na fronteira do preload; e verificação no app **empacotado** (ponte → PowerShell → clipboard).

## 2. Testes Implementados
| Categoria | Arquivo | Novos |
|---|---|---|
| Unitário | `tests/main/ocr.test.ts` (CT-OC-01..09) | 9 |
| Integração (Windows real) | `tests/main/ocr.test.ts` (CT-OC-10..12) | 3 |
| Componente | `tests/renderer/Overlay.test.tsx` (CT-FC-70..77) | 10 |
| Componente | `tests/renderer/Toolbar.test.tsx` (CT-TB-20..22) | 3 |

Factories/fixtures: `imageFactory` (0009) e `tests/fixtures/ocr-texto.png`. Seeders: não se aplica.

## 3. Mapeamento Cenário → Teste
Idêntico ao 03 (CT-OC, CT-FC-70..77, CT-TB-20..22).

## 4. Cobertura
`main/ocr.ts` 95% linhas (resto: ramos de falha do processo filho e de plataforma não-Windows); funções puras 100%.

## 5. Adicionais
- Aviso some sozinho (CT-FC-76).
- A ponte lançando exceção síncrona/assíncrona (CT-FC-75b).
- Temporário apagado depois da leitura (CT-OC-12).
- Conferência no app empacotado: 669 ms, texto no clipboard com as duas linhas.

## 6. Bugs Encontrados
Nenhum.

## 7. Comandos
`npx vitest run --coverage` · `npm run build && npx playwright test` · `npx electron-builder --win --dir`

## 8. Observações para o arc-lider
- CT-OC-12 depende de um idioma de OCR no Windows; sem ele, é pulado (não falha).
- Não há E2E permanente do fluxo completo (seleção por mouse real + OCR) por depender de idioma/tela do runner.

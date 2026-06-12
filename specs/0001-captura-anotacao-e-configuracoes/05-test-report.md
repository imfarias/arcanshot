# 0001 — Relatório de Testes

**Data:** 2026-06-12 · **Autor:** arc-tester (via arc-specfull) · **Suite:** ✅ verde

## 1. Resumo da Estratégia
Pirâmide conforme ARCHITECTURE seção 11: lógica pura por unidade; módulos do main com
**filesystem real em diretório temporário** (sem mock de código do projeto); componentes
React com Testing Library mockando apenas a fronteira `window.arcanshot`; E2E com
Playwright `_electron` subindo o app empacotado de verdade e verificando persistência
**no disco**. a11y automatizada com jest-axe.

## 2. Testes Implementados
| Categoria | Arquivo | Testes |
|---|---|---|
| Main integração (fs real) | `tests/main/settingsStore.test.ts` | 6 |
| Main integração (fs real) | `tests/main/saveImage.test.ts` | 8 |
| Unitário (shared puro) | `tests/unit/{filenamePattern,geometry,settings,editor}.test.ts` | 39 |
| FE componente | `tests/renderer/SettingsForm.test.tsx` | 9 |
| FE componente | `tests/renderer/Toolbar.test.tsx` | 6 |
| FE integração | `tests/renderer/settingsFlow.test.tsx` | 2 |
| E2E | `tests/e2e/app.spec.ts` | 3 |
| **Total** | | **73** (70 vitest + 3 Playwright) |

Factories/seeders entregues: `settingsFactory` (+ states `.jpg`, `.invalidQuality`),
`annotationFactory.{shape,text,step,blur}`, `seedSettingsFile` — todos com faker.

## 3. Mapeamento Cenário → Teste
Todos os CT-MI-01..09 (exceto N/A), CT-UN-01..10, CT-FC-01..12, CT-FI-01..02 e
CT-E2E-01..03 do `03-acceptance-criteria.md` têm teste homônimo no código (IDs citados
nos nomes dos testes). Observações:
- CT-MI-08 implementado com pasta bloqueada por arquivo (forma confiável de provocar erro de mkdir no Windows).
- CT-FI-02 provoca o erro com o validador real compartilhado (duplicidade de atalho) — o mesmo código que roda no main.

## 4. Cobertura Atingida
- `src/shared`: settings 100% · geometry 100% · filenamePattern 94% (types.ts é só declarações)
- `src/main` testáveis: saveImage 100% · settingsStore 92%
- `src/renderer`: SettingsForm 97% · Toolbar 100% · editor.ts (estado) 100%, (render canvas) não coberto em jsdom
- `Overlay.tsx` (orquestrador de canvas/janela): 0% automatizado — coberto por roteiro manual (seção 8) e pela lógica pura extraída testada por unidade.

## 5. Cenários Adicionais Cobertos
- `mergeSettings` com entrada não-objeto e tipos errados.
- `dataUrlToBuffer` com dataURL não-imagem.
- `uniquePath`/`saveToPath` isolados.
- Toolbar: callbacks de todas as ações de exportação.
- Seeder lido de volta pelo `SettingsStore` real.

## 6. Bugs Encontrados Durante Teste
1 bug de infraestrutura de teste (não de produto): ausência de auto-cleanup do Testing
Library por `globals: false` no Vitest causava vazamento de DOM entre testes → corrigido
habilitando `globals: true` em `vitest.config.ts`. Nenhum bug de implementação
encontrado; não houve retorno à Etapa 5.

## 7. Comandos para Rodar a Suite
```bash
npm test               # unit + main + componente (70)
npm run test:coverage  # com cobertura v8
npm run test:e2e       # builda e roda Playwright _electron (3)
```

## 8. Observações para o arc-lider (Revisão Final)
- Mandamento "sem mock de service" cumprido: testes do main usam fs real; nenhum módulo do projeto é mockado em nenhuma categoria.
- FE cobre erro com mesmo rigor do sucesso (validação local, fieldErrors do main e rejeição de IPC — CT-FC-03/04/05).
- Fluxos interativos do overlay (arrasto, handles, texto/numeração no canvas) dependem de mouse real sobre captura de tela: roteiro manual obrigatório antes do release (DoD item 4); automatizá-los exigiria harness dedicado (sugestão v2).

# 0009 — Revisão Final

**Data:** 2026-10-09 · **Autor:** arc-lider (Momento B, via arc-specfull)

## Veredito: ✅ Aprovado

## 1. Aderência à Especificação

| Item | Situação |
|---|---|
| RN-01/02 páginas iguais, tamanho da maior área (empate: primeira) | ✅ `planPdfPages`; CT-PF-04, CT-PL-02/03 |
| RN-03 sem ampliar nem distorcer | ✅ `min(1, …)` uniforme; CT-PL-04..06 + propriedade |
| RN-04 centralizado, fundo branco | ✅ retângulo branco + centralização; CT-PL-04..06 |
| RN-05 ordem da galeria | ✅ mapeamento 1:1 por índice |
| RN-06 só no PDF | ✅ `gallery:save-all` intocado |
| RN-07 desligado por padrão, sem migração | ✅ CT-ST-01, CT-E2E-04 (nasce desmarcado) |
| RN-08 mesmo dado na galeria e em Configurações | ✅ `pdfUniformSize` único |
| FA-3 falha ao persistir | ✅ valor vai no IPC; CT-GL-23/23b |
| Estado ocupado | ✅ CT-GL-24 |

## 2. Aderência ao Desenho Técnico

Implementado como desenhado: módulo puro `pdfBuilder`, argumento opcional no IPC validado por tipo, preferência plana. Desvio nenhum.

## 3. Aderência à Arquitetura

- Canal `dominio:acao` mantido; retorno `{ ok, error }` mantido.
- Regra nova fora de arquivo dependente de Electron (padrão `overlayLayout`), com 100% de cobertura.
- Campo plano em `AppSettings` (padrão da 0008).

## 4. Reutilização

`dataUrlToBuffer`, `mergeSettings`/`SettingsStore`, padrão de checkbox de Configurações, padrão de persistência melhor-esforço do embelezar. Novo reutilizável `pdfBuilder` registrado em `COMPONENTS.md`; `Gallery` atualizado lá.

## 5. Qualidade dos Testes

- "Backend": pdf-lib real e imagens reais, PDF lido de volta (estado do artefato verificado) — sem mock. ✅
- O teste anterior que **copiava** `buildPdf` foi substituído por import do módulo real. ✅
- FE cobre erro com o mesmo rigor (rejeição, exceção síncrona, erro de exportação, erro ao salvar Configurações). ✅
- `data-testid` e ARIA (`label[for]`, `aria-describedby`) presentes e verificados (CT-GL-20, CT-FC-20). ✅
- a11y automatizada nas duas telas. ✅
- Todos os cenários do 03 mapeados (05, seção 3). ✅

## 6. Achados

- 🔴 Bloqueante: nenhum.
- 🟡 Importante: nenhum.
- 🔵 Sugestão: as páginas usam 1 px = 1 pt (herdado da 0005), então um print de 1920 px vira uma página de ~68 cm; leitores ajustam o zoom, mas a impressão sai reduzida. Um tamanho físico (ex.: A4) foi deixado fora de escopo pelo usuário — candidato a feature futura.
- 🔵 Sugestão: `specs/INDEX.md` não lista a 0006 (a pasta existe); corrigir o índice em separado.

## 7. Próximos Passos

- [ ] Commit da feature sobre o redesenho na branch `feat/app-redesign` e PR (sem push até o usuário pedir).
- [ ] Opcional: tamanhos físicos de página (A4/Carta) numa feature nova.

## 8. Lições para a MEMORY

- Teste que **copia** a função sob teste dá falsa segurança; quando a lógica mora num arquivo excluído da cobertura (Electron), extrair para um módulo puro e importar.
- Opção que vale para uma ação imediata deve viajar **junto** com o pedido da ação (argumento do IPC), não depender da persistência ter terminado.

# 0011 — Critérios de Aceite

**Data:** 2026-10-13 · **Autor:** arc-lider (Momento A, via arc-specfull)

## 1. Critérios Funcionais
- **CA-01:** na seleção de área, com Ctrl, a janela sob o mouse é destacada com título e medida (RN-01, RN-02).
- **CA-02:** `Ctrl+clique` seleciona o retângulo da janela e abre a edição (RN-08).
- **CA-03:** vale a janela de cima quando há sobreposição (RN-02).
- **CA-04:** sem Ctrl, ou com Ctrl fora de janelas, o arrasto de área é o de sempre (FA-1, FA-2).
- **CA-05:** soltar o Ctrl remove o destaque (FA-3).
- **CA-06:** janela parcialmente fora da tela é recortada (FA-5).
- **CA-07:** sem lista de janelas não há dica nem destaque e o app funciona (FA-4).
- **CA-08:** não são alvos área de trabalho, barras de tarefas, janelas sem título, de ferramenta, sem ativação, click-through, minimizadas/ocultas e < 40 px (RN-05).
- **CA-09:** a lupa some enquanto há janela em destaque (RN-07).
- **CA-10:** o recurso funciona no app empacotado (instalador).

## 2. Integração (Windows real)
CT-WL-01 janelas bem formadas · CT-WL-02 chamadas repetidas · CT-WL-03 < 250 ms · CT-WL-04 vazia fora do Windows.

## 3. Unitário
CT-WP-01..08 (`selectCaptureWindows`) · CT-WP-10..12 (`pickWindowAt`) · CT-WP-20..23 (conversões).

## 4. Componente
CT-FC-60/60b dica e ausência · CT-FC-61/61b Ctrl+clique e janela de cima · CT-FC-62/62b/62c destaque, contorno, sem Ctrl · CT-FC-63 arrasto sem Ctrl · CT-FC-64 Ctrl fora de janela · CT-FC-65 recorte · CT-FC-66 axe.

## 5. FE integração / 6. E2E
Sem fluxo novo de tela de configurações. Verificação no app empacotado: atalho de área → overlay recebe a lista de janelas (feita à mão com Playwright, não mantida na suíte porque depende das janelas do runner).

## 7. Massa de Dados
Janelas fabricadas por teste (`RawWindow`/`WindowInfo`) sobre as factories de monitor existentes.

## 8. Cobertura
`shared/windowPick.ts` 100%.

## 9. Definition of Done
- [x] CA-01..CA-10 · [x] testes verdes · [x] lint/typecheck · [x] conferido no app empacotado · [x] README, site, COMPONENTS, MEMORY e INDEX atualizados

# 0002 — Melhoria de Performance, Captura de Atalhos e Correção de Ferramenta Texto

**Status:** Especificado
**Data:** 2026-06-12
**Autor:** arc-requisito (via arc-specfull)

## 1. Contexto e Objetivo
Após testes manuais da feature 0001, foram identificados três problemas:
1. Demora perceptível (~0,5–1 s) ao acionar captura por atalho de teclado.
2. Campos de atalho na tela de configurações aceitam texto livre, devendo capturar a
   combinação real pressionada pelo usuário.
3. A ferramenta de texto no overlay não funciona corretamente: o texto pode não ser
   confirmado ou o overlay fecha em vez de encerrar apenas a entrada de texto.

## 2. Atores e Partes Interessadas
- Usuário: aciona atalhos, edita configurações, usa a ferramenta de texto.

## 3. Requisitos Funcionais

### RF-01: Captura paralela de displays
- O sistema deve capturar todos os displays em paralelo (não sequencial), reduzindo o
  tempo de abertura do overlay.

### RF-02: Campo de atalho com captura de teclas
- Ao clicar num campo de atalho, o campo entra em modo "Escutando".
- O placeholder exibe "Pressione a tecla…".
- Ao pressionar qualquer combinação de tecla + modificadores, o campo exibe o atalho
  no formato Electron (ex.: `Ctrl+PrintScreen`, `Shift+F12`).
- Teclas-só-modificador (Ctrl, Alt, Shift, Meta) são ignoradas.
- Esc cancela a captura (sem alterar o valor) e sai do modo escuta.
- Ao sair do foco, o campo restaura o último valor confirmado.
- Salvar persiste o novo atalho normalmente.

### RF-03: Ferramenta de texto no overlay funcional
- Clicar com a ferramenta texto posiciona um textarea; o usuário digita e confirma com Enter.
- Esc dentro do textarea encerra apenas a entrada de texto (não fecha o overlay).
- O texto confirmado aparece no canvas na posição clicada.
- O textarea deve receber foco automaticamente ao aparecer.

## 4. Requisitos Não-Funcionais
- O tempo entre o acionamento do atalho e a abertura do overlay em single-display deve
  cair de ~500 ms para ~250 ms (em hardware típico).
- O campo de atalho deve ser acessível: `aria-label` descrevendo que é um campo de
  captura de teclas; `aria-live` ou `aria-describedby` para o estado "escutando".

## 5. Restrições Técnicas
- Usa as APIs existentes: `desktopCapturer.getSources`, `Promise.all`, React eventos.
- Sem novos processos, sem nova janela, sem nova dependência.
- O formato do atalho deve ser compatível com o `globalShortcut` do Electron.

## 6. Dúvidas em Aberto
_Nenhuma crítica ao design técnico._

## 7. Critérios de Aceite (sumário)
- CA1: Dois displays capturam em tempo < 1 chamada sequencial equivalente.
- CA2: Clicar no campo de atalho → placeholder "Pressione a tecla…".
- CA3: Pressionar Ctrl+P → campo exibe `Ctrl+P`.
- CA4: Pressionar Esc no campo → cancela sem alterar; sai do modo escuta.
- CA5: Esc no textarea de texto → fecha só o textarea, overlay permanece.
- CA6: Enter no textarea → anotação de texto aparece no canvas.
- CA7: Textarea recebe foco ao aparecer.

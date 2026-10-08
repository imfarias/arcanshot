# 0003 — Captura Paralela Real: getSources Único

**Status:** Especificado
**Data:** 2026-06-13
**Autor:** arc-requisito (via arc-specfull)

## 1. Contexto e Objetivo
A feature 0002 (RF-01) converteu o loop sequencial de capturas para `Promise.all`,
mas `desktopCapturer.getSources` é serializado internamente pelo Electron: mesmo com
`Promise.all`, N displays resultam em N chamadas enfileiradas, mantendo o delay perceptível.

O objetivo é eliminar esse gargalo fazendo **uma única chamada** a `getSources` e
distribuindo os resultados para cada display.

## 2. Atores
- Usuário: aciona captura por atalho global (PrintScreen / atalho configurado).

## 3. Requisitos Funcionais

### RF-01: Captura em única chamada getSources
- `captureAllDisplays` deve fazer exatamente **uma** chamada a `desktopCapturer.getSources`,
  independentemente do número de displays conectados.
- Cada display deve receber o thumbnail correspondente (por `display_id` ou posição no array).
- Displays com resolução física menor que o maior display conectado podem ter thumbnail
  renderizado no tamanho do maior (comportamento de upscale do Electron é aceitável).

## 4. Requisitos Não-Funcionais
- Latência entre acionamento do atalho e abertura do overlay deve ser percebida como
  instantânea em setup multi-monitor (2+ displays).

## 5. Restrições Técnicas
- Alteração restrita a `src/main/capture.ts`.
- Nenhuma nova dependência.
- Sem alteração em contratos IPC ou tipos compartilhados.

## 6. Dúvidas em Aberto
_Nenhuma._

## 7. Critérios de Aceite (sumário)
- CA1: `getSources` é chamado exatamente 1 vez por acionamento de captura,
  independentemente do número de monitors.
- CA2: Todos os displays recebem dataUrl válido (thumbnail não vazio).
- CA3: Setup com displays de tamanhos físicos distintos funciona sem erro.

# 0002 — Critérios de Aceite

**Data:** 2026-06-12 · **Autor:** arc-lider (Momento A, via arc-specfull)

## Testes de Integração Main (CT-MI)
_N/A — mudanças no main (capture.ts) são de infra; o contrato de saída não muda._

## Testes Unitários (CT-UN)
_N/A — sem novos módulos puros._

## Testes de Componente Frontend (CT-HK / CT-FC)

| ID | Cenário | Critério |
|---|---|---|
| CT-HK-01 | Valor inicial | Input exibe `props.value` quando não capturando |
| CT-HK-02 | Modo captura | Focar → placeholder "Pressione a tecla…", value="" |
| CT-HK-03 | Tecla simples | Pressionar PrintScreen → `onChange('PrintScreen')` |
| CT-HK-04 | Combinação | Pressionar Ctrl+P → `onChange('Ctrl+P')` |
| CT-HK-05 | Esc cancela | Esc → `onChange` NÃO chamado; valor anterior restaurado |
| CT-HK-06 | Blur restaura | Perder foco sem pressionar tecla → volta ao valor anterior |
| CT-HK-07 | Modificadores isolados | Pressionar só Ctrl/Alt/Shift → `onChange` NÃO chamado |
| CT-HK-08 | Acessibilidade | `axe(container)` sem violações |
| CT-FC-12 | Acessibilidade form | `axe(container)` sem violações com HotkeyInput integrado |

## Testes de Integração Frontend (CT-FI)

| ID | Cenário | Critério |
|---|---|---|
| CT-FI-02 | Fluxo completo | Focar hotkeyFull + pressionar PrintScreen → erro "duplicado"; focar + Ctrl+Alt+P → salvar com sucesso |

## Testes E2E (CT-E2E)
_Sem novos E2E — cenários afetados (captura, texto) já constam do roteiro manual da 0001._

## Definição de Pronto
- [x] `Promise.all` em `captureAllDisplays`
- [x] `HotkeyInput.tsx` com todos os comportamentos RF-02
- [x] `SettingsForm` usa `HotkeyInput` nos 3 campos de atalho
- [x] `Overlay.tsx` handler de teclado com `textPos` nas deps + guard Esc
- [x] `TextInputLayer` com `autoFocus`
- [x] `.text-input-layer` CSS com `user-select: text`
- [x] Suite 78/78 verde
- [ ] Roteiro manual: abrir textarea de texto → Esc → overlay permanece; Enter → texto no canvas

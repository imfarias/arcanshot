# 0002 — Relatório de Implementação

**Data:** 2026-06-12 · **Autor:** arc-dev (via arc-specfull) · **Status:** ✅ Completo

## 1. Arquivos Criados
| Arquivo | Propósito |
|---|---|
| `src/renderer/settings/HotkeyInput.tsx` | Componente de captura de atalho (RF-02) |
| `tests/renderer/HotkeyInput.test.tsx` | 8 testes CT-HK-01..08 |

## 2. Arquivos Modificados
| Arquivo | Mudança |
|---|---|
| `src/main/capture.ts` | Loop sequencial → `Promise.all` paralelo (RF-01) |
| `src/renderer/settings/SettingsForm.tsx` | 3 `<input>` → `<HotkeyInput>`; import adicionado |
| `src/renderer/overlay/Overlay.tsx` | `textPos` nas deps do keydown useEffect; guard Esc quando textPos ≠ null |
| `src/renderer/overlay/components/TextInputLayer.tsx` | Atributo `autoFocus` adicionado |
| `src/renderer/overlay/overlay.css` | `.text-input-layer` +`user-select: text; pointer-events: auto` |
| `tests/renderer/settingsFlow.test.tsx` | CT-FI-02 atualizado para `user.keyboard` |

## 3. Decisões de Implementação
- `HotkeyInput` é `readOnly` para evitar edição livre. O atributo `value` usa string
  vazia durante captura para mostrar o `placeholder`.
- `mapKey` não cobre teclas raramente usadas como atalho (F13+, PrintScreen em alguns
  layouts, media keys) — suficiente para o domínio.
- `autoFocus` em `TextInputLayer` é marcado com comentário de desabilitar eslint-rule
  jsx-a11y/no-autofocus porque o autofocus é deliberado (overlay modal interativo).
- O guard `if (!textPos) handleCancel()` no handler global é uma defesa extra; o
  `stopPropagation()` no TextInputLayer já previne o evento de chegar ao window em
  condições normais.

## 4. Componente Reutilizável Registrado
`HotkeyInput` adicionado em `COMPONENTS.md`.

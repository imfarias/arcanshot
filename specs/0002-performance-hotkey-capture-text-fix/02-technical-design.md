# 0002 — Desenho Técnico

**Data:** 2026-06-12 · **Autor:** arc-lider (Momento A, via arc-specfull)

## 1. Resumo do Design

| Área | Mudança |
|---|---|
| `src/main/capture.ts` | `captureAllDisplays` sequencial → `Promise.all` paralelo |
| `src/renderer/settings/HotkeyInput.tsx` | Novo componente: `readOnly` input que captura keydown e constrói acelerador Electron |
| `src/renderer/settings/SettingsForm.tsx` | 3 `<input type="text">` de atalho → `<HotkeyInput>` |
| `src/renderer/overlay/Overlay.tsx` | Handler global `keydown`: adicionar `textPos` às deps; guardar Esc quando `textPos` não nulo |
| `src/renderer/overlay/components/TextInputLayer.tsx` | Adicionar `autoFocus` como fallback de foco |
| `src/renderer/overlay/overlay.css` | `.text-input-layer` ganha `user-select: text; pointer-events: auto` |

## 2. Alternativas Consideradas

### A1 (capture.ts) — `Promise.all` vs. cache/pre-warm
`Promise.all` é trivial e não muda contratos. Pre-warm exigiria estado global e risco de
captura obsoleta. Escolhido: `Promise.all`.

### A2 (HotkeyInput) — input readOnly vs. contenteditable div
`<input readOnly>` preserva foco, ARIA e integração com label[for] sem custo extra.
`contenteditable` exigiria CSS extra e perda de comportamento de form.
Escolhido: `<input readOnly>`.

### A3 (text tool) — `textPos` nas deps do useEffect vs. ref de flag
Ref evitaria re-registro do listener; mas a mudança é mínima e manter textPos como dep
garante closure atualizada, que é o comportamento correto.
Escolhido: `textPos` nas deps.

## 3. Fluxo do HotkeyInput

```
foco → capturing=true, value='', placeholder="Pressione a tecla…"
keydown:
  ├── modifier only → nada
  ├── Esc → capturing=false (sem onChange)
  └── outro → buildAccelerator → onChange(acelerador) → capturing=false
blur → capturing=false (restaura props.value)
```

## 4. Conversão DOM key → Electron accelerator

| DOM key | Electron |
|---|---|
| `ArrowLeft/Right/Up/Down` | `Left/Right/Up/Down` |
| `PrintScreen` | `PrintScreen` |
| `Enter` | `Return` |
| ` ` (espaço) | `Space` |
| `F1`–`F12` | `F1`–`F12` |
| char único | uppercase |

Modificadores: `ctrlKey→Ctrl`, `altKey→Alt`, `shiftKey→Shift`, `metaKey→Super`.

## 5. Correção do texto no overlay

**Causa raiz identificada:** O handler global `window.addEventListener('keydown', ...)` em
`Overlay.tsx` não tinha `textPos` nas dependências, portanto a closure ficava stale e o
Esc poderia fechar o overlay inteiro em vez de apenas o textarea — especialmente quando
`stopPropagation()` no `TextInputLayer` falha em ambientes de teste ou em condições de
race (evento nativo x React delegation).

**Fixes complementares:**
- `autoFocus` no textarea como fallback ao `useEffect → focus()`
- `user-select: text; pointer-events: auto` no CSS sobrescrevendo o `user-select: none`
  do `.overlay-root`

## 6. Impacto em Testes

| Arquivo | Mudança |
|---|---|
| `tests/renderer/HotkeyInput.test.tsx` | Novo (8 testes CT-HK-01..08) |
| `tests/renderer/settingsFlow.test.tsx` | CT-FI-02: `user.type` → `user.keyboard` |

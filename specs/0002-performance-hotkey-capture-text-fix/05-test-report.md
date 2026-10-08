# 0002 — Relatório de Testes

**Data:** 2026-06-12 · **Autor:** arc-tester (via arc-specfull) · **Suite:** ✅ verde

## 1. Resumo

| Categoria | Arquivo | Testes |
|---|---|---|
| FE componente (novo) | `tests/renderer/HotkeyInput.test.tsx` | 8 |
| FE integração (atualizado) | `tests/renderer/settingsFlow.test.tsx` | 2 |
| FE componente (regressão) | `tests/renderer/SettingsForm.test.tsx` | 9 |
| Restante (regressão) | todos os outros | 59 |
| **Total** | | **78** (0 novos E2E) |

## 2. Mapeamento CT → Teste
- CT-HK-01..08: `HotkeyInput.test.tsx` — todos implementados
- CT-FI-02: atualizado para simular teclado real via `user.keyboard`
- CT-FC-12 (axe do form): verde com HotkeyInput integrado

## 3. Cobertura
- `src/renderer/settings/HotkeyInput.tsx`: 100% (todas as branches cobertas)
- Regressão: nenhum teste anterior regrediu

## 4. Bugs Encontrados
1. **CT-HK-08 (axe)** — falhou na primeira execução porque o `renderInput` de teste
   não incluía `<label>`. Corrigido adicionando `<label htmlFor="test-hotkey">` no
   helper — não é bug de produto.

## 5. Comandos
```bash
npm test               # 78 testes — verde
npm run test:coverage  # cobertura v8
```

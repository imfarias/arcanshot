# 0004 — Critérios de Aceite

**Data:** 2026-06-13 · **Autor:** arc-lider (Momento A, via arc-specfull)

---

## Critérios Automatizados — `DisplayCacheStore`

| ID | Descrição |
|---|---|
| CT-DC-01 | `load()` retorna `null` quando `display-cache.json` não existe |
| CT-DC-02 | `load()` retorna `null` quando arquivo contém JSON corrompido |
| CT-DC-03 | `load()` retorna `null` quando conteúdo não é array |
| CT-DC-04 | `load()` retorna `null` quando elemento do array não tem campo `id` numérico |
| CT-DC-05 | `load()` retorna `null` quando elemento não tem `bounds.x` numérico |
| CT-DC-06 | `load()` retorna array válido quando arquivo tem estrutura correta |
| CT-DC-07 | `save()` cria `display-cache.json` com conteúdo JSON serializado dos displays |
| CT-DC-08 | Round-trip: `save(displays)` seguido de `load()` retorna dados equivalentes |
| CT-DC-09 | Escrita atômica: após `save()`, nenhum `.tmp` permanece no diretório |
| CT-DC-10 | `save()` não lança quando `baseDir` tem permissão negada (best-effort) |
| CT-DC-11 | `load()` retorna `null` após arquivo ser corrompido manualmente |

---

## Roteiro Manual — Captura com Cache

### Roteiro A — Primeiro uso (sem cache)

1. Limpar `{userData}/display-cache.json` se existir
2. Acionar captura (PrintScreen ou tray)
3. **Verificar:** overlay abre normalmente
4. Cancelar overlay (Esc)
5. **Verificar:** `display-cache.json` foi criado em `{userData}`
6. **Verificar:** conteúdo é array com `id`, `bounds`, `scaleFactor` para cada monitor

### Roteiro B — Captura com cache existente

1. Garantir que `display-cache.json` existe (executar Roteiro A)
2. Acionar captura novamente
3. **Verificar:** overlay abre (funcionamento inalterado)
4. **Verificar:** `display-cache.json` foi atualizado (timestamp modificado)

### Roteiro C — Cache corrompido

1. Editar `display-cache.json` e torná-lo JSON inválido: `{corrompido`
2. Acionar captura
3. **Verificar:** overlay abre normalmente (fallback transparente)
4. **Verificar:** `display-cache.json` foi substituído por conteúdo válido ao final

### Roteiro D — Monitor desconectado entre capturas

1. Com 2 monitores: capturar → `display-cache.json` tem 2 entradas
2. Desconectar o segundo monitor
3. Acionar captura novamente
4. **Verificar:** overlay abre apenas no monitor principal
5. **Verificar:** `display-cache.json` agora tem apenas 1 entrada

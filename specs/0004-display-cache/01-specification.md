# 0004 — Cache de Displays em Arquivo de Configuração

**Data:** 2026-06-13 · **Autor:** arc-requisito (via arc-specfull)  
**Status:** Em andamento

---

## 1. Contexto e Motivação

A cada acionamento de captura, `overlay.ts:startCapture()` chama `screen.getAllDisplays()` (síncrono) para descobrir a lista de displays antes de criar as janelas overlay. Imediatamente após, `capture.ts:captureAllDisplays()` chama `screen.getAllDisplays()` novamente para calcular o `thumbnailSize` e mapear sources. A informação de layout dos monitores (bounds + scaleFactor) raramente muda entre capturas e poderia ser persistida em disco, eliminando chamadas redundantes ao SO e permitindo que janelas overlay comecem a ser criadas antes mesmo do retorno do SO.

---

## 2. Objetivo

Persistir a lista de displays (`id`, `bounds`, `scaleFactor`) em `display-cache.json` no `userData` do app. Após cada captura bem-sucedida, atualizar o cache em background. Na próxima captura, usar o cache como fonte primária de dados de layout dos monitores, com `screen.getAllDisplays()` apenas como fallback.

---

## 3. Atores

| Ator | Papel |
|---|---|
| App (main process) | Persiste e lê o cache; atualiza em background |
| Sistema Operacional | Fonte de verdade para layout real dos displays |
| `desktopCapturer` | Fornece o conteúdo visual dos displays |

---

## 4. Fluxo Principal

**FP-1 — Captura com cache disponível:**
1. Usuário aciona captura (atalho ou tray)
2. `startCapture()` lê `display-cache.json` (sincrono, arquivo local)
3. Cria janelas overlay para cada display usando bounds do cache
4. Em paralelo, `captureAllDisplays()` captura os displays reais via `getSources()`
5. Janelas exibem conteúdo capturado após ambas concluírem
6. Após captura bem-sucedida, `setImmediate` dispara atualização do cache com displays frescos

**FP-2 — Captura sem cache (primeira vez ou arquivo ausente/corrompido):**
1. `startCapture()` detecta ausência de cache válido
2. Chama `screen.getAllDisplays()` para obter layout atual
3. Prossegue com o fluxo normal já existente
4. Ao final, salva o resultado em `display-cache.json`

---

## 5. Fluxo Alternativo

**FA-1 — Cache desatualizado (monitor adicionado/removido desde último cache):**
- `captureAllDisplays()` sempre usa `screen.getAllDisplays()` internamente para garantir precisão do conteúdo capturado
- Janelas overlay podem ter sido criadas com bounds do cache (stale) — aceitável: o overlay é destroyed ao cancelar e recriado na próxima captura com cache atualizado
- O cache é atualizado ao final da captura com dados frescos

---

## 6. Regras de Negócio

| # | Regra |
|---|---|
| RN-01 | O cache é **best-effort**: falha ao ler ou salvar nunca impede a captura |
| RN-02 | O cache nunca substitui `captureAllDisplays()` — apenas a fase de layout pré-janela |
| RN-03 | Atualização do cache sempre ocorre **após** captura bem-sucedida, nunca antes |
| RN-04 | A atualização é fire-and-forget (não bloqueia o retorno de `startCapture`) |
| RN-05 | JSON corrompido ou inválido é tratado como ausência de cache (não lança) |
| RN-06 | Escrita é atômica: `display-cache.json.tmp` → rename → `display-cache.json` |

---

## 7. Dados Persistidos

```json
[
  {
    "id": 12345678,
    "bounds": { "x": 0, "y": 0, "width": 2560, "height": 1440 },
    "scaleFactor": 1.5
  },
  {
    "id": 87654321,
    "bounds": { "x": 2560, "y": 0, "width": 1920, "height": 1080 },
    "scaleFactor": 1.0
  }
]
```

Arquivo: `{userData}/display-cache.json`

---

## 8. Não-funcionais

| Atributo | Requisito |
|---|---|
| Performance | Leitura do cache não adiciona latência perceptível (arquivo < 1 KB, leitura síncrona) |
| Resiliência | Qualquer erro de I/O é silenciado; captura prossegue sem cache |
| Segurança | Nenhum dado sensível no cache; não exposto ao renderer |
| Testabilidade | `DisplayCacheStore` recebe `baseDir` por parâmetro; testável com fs real em tmpdir |

---

## 9. Critérios de Aceite (resumo)

- Após a primeira captura bem-sucedida, `display-cache.json` existe em `userData`
- O conteúdo é um array de objetos com `id`, `bounds`, `scaleFactor`
- Na captura seguinte, o arquivo é lido e usado para criar as janelas overlay
- JSON corrompido não impede a captura
- Monitor removido: na próxima captura o cache é atualizado com o layout atual

---

## 10. Fora do Escopo

- Invalidação de cache por tempo (TTL) — desnecessário; atualiza em cada captura
- Exposição do cache ao renderer via IPC
- Pré-aquecimento de janelas overlay antes do atalho ser acionado

---

## 11. Dependências

- Feature 0003 (captura single `getSources`) — já entregue e no código

---

## 12. Riscos

| Risco | Mitigação |
|---|---|
| Cache com bounds errados em config de monitor muito diferente | RN-01: overlay fecha e reabre; cache atualiza na mesma captura |
| Race condition se dois atalhos disparam simultaneamente | `isCapturing()` guard já existente em `startCapture` impede segunda invocação |

---

## 13. Glossário

- **DisplayInfo**: tipo `{ id, bounds, scaleFactor }` — subconjunto de `Electron.Display`
- **DisplayCacheStore**: classe responsável por ler/escrever `display-cache.json`
- **fire-and-forget**: operação assíncrona disparada sem await; erros silenciados

---

## 14. Dúvidas em Aberto

Nenhuma — requisito autocontido, sem dependência de decisão externa.

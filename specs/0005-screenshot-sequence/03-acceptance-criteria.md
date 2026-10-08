# 0005 — Critérios de Aceite

**Data:** 2026-06-13 · **Autor:** arc-lider (Momento A, via arc-specfull)

---

## Critérios Automatizados — `CaptureSession`

| ID | Descrição |
|---|---|
| CT-CS-01 | `addCapture` acumula dataUrls no buffer |
| CT-CS-02 | `addCapture` com 1 item: timer expira, callback NÃO é chamado |
| CT-CS-03 | `addCapture` com 2 items antes do timer expirar: callback chamado com 2 items após timer |
| CT-CS-04 | `addCapture` em sequência reseta o timer (timer não dispara no meio) |
| CT-CS-05 | `clearSession` cancela timer pendente — callback não é chamado |
| CT-CS-06 | 20 items adicionados sem timer: `onComplete` disparado imediatamente (limite de segurança) |
| CT-CS-07 | Após `onComplete`, buffer é limpo; novos `addCapture` iniciam nova sessão |

## Critérios Automatizados — `Gallery.tsx`

| ID | Descrição |
|---|---|
| CT-GL-01 | Renderiza grid de thumbnails com `alt="Captura N"` para cada item |
| CT-GL-02 | Exibe contagem de capturas no header |
| CT-GL-03 | Botão "Salvar todas em pasta" chama `gallerySaveAll` e exibe feedback de sucesso |
| CT-GL-04 | Botão "Salvar todas em pasta" em falha exibe mensagem de erro |
| CT-GL-05 | Botão "Gerar PDF" chama `galleryExportPdf` e exibe feedback de sucesso |
| CT-GL-06 | Botão "Gerar PDF" em falha exibe mensagem de erro |
| CT-GL-07 | Botão "Fechar" chama `galleryClose` |
| CT-GL-08 | DragStart de thumbnail chama `galleryDragItem(index)` |
| CT-GL-09 | jest-axe: zero violações críticas/sérias na galeria |

## Critérios Automatizados — `buildPdf`

| ID | Descrição |
|---|---|
| CT-PF-01 | PDF gerado com 1 item é um buffer válido (começa com `%PDF`) |
| CT-PF-02 | PDF com N items tem N páginas |
| CT-PF-03 | Cada página tem dimensões da imagem de entrada |

## Critérios Automatizados — Settings

| ID | Descrição |
|---|---|
| CT-ST-01 | `sequenceTimeoutSec` default é 5 |
| CT-ST-02 | `validateSettings` retorna erro para valor < 2 |
| CT-ST-03 | `validateSettings` retorna erro para valor > 60 |
| CT-ST-04 | `validateSettings` retorna erro para valor não-inteiro |
| CT-ST-05 | Campo `sequenceTimeoutSec` renderiza em `SettingsForm` |

---

## Roteiro Manual — Sequência de capturas

### Roteiro A — Sequência simples (2 prints)

1. Pressionar PrintScreen → selecionar área → anotar → Ctrl+C (copy)
2. Dentro de 5 segundos: pressionar PrintScreen novamente → selecionar área → Ctrl+C
3. **Verificar:** janela Galeria abre em ≤ 1 s após segundo copy
4. **Verificar:** Galeria exibe 2 thumbnails numerados
5. Arrastar thumbnail 1 para WhatsApp Desktop
6. **Verificar:** imagem chega no WhatsApp como arquivo

### Roteiro B — Sequência com 3+ prints

1. Tirar 3 prints em sequência (< 5 s entre cada)
2. **Verificar:** Galeria abre com 3 thumbnails
3. Clicar "Salvar todas em pasta" → escolher pasta → confirmar
4. **Verificar:** 3 arquivos criados (sufixo `_001`, `_002`, `_003`)

### Roteiro C — Gerar PDF

1. Tirar 2+ prints em sequência
2. Na galeria, clicar "Gerar PDF" → escolher localização → confirmar
3. **Verificar:** PDF criado
4. Abrir PDF com leitor → **Verificar:** N páginas, cada uma com um screenshot

### Roteiro D — Print único (sem galeria)

1. Tirar 1 print → Ctrl+C (copy)
2. Aguardar 6 segundos (mais que o timeout)
3. **Verificar:** galeria NÃO abre; comportamento idêntico ao anterior

### Roteiro E — Cancel não conta

1. Tirar print → ESC (cancelar overlay)
2. Tirar mais 1 print → Ctrl+C
3. Aguardar 6 segundos
4. **Verificar:** galeria NÃO abre (apenas 1 print completado)

### Roteiro F — Timeout configurável

1. Em Configurações, alterar "Tempo entre prints" para 10 s
2. Tirar 2 prints com 7 s de intervalo
3. **Verificar:** galeria abre (7 s < 10 s)
4. Alterar para 3 s; tirar 2 prints com 4 s de intervalo
5. **Verificar:** galeria NÃO abre (4 s > 3 s)

# 0009 — Critérios de Aceite: Páginas do PDF com o Mesmo Tamanho

**Data:** 2026-10-09 · **Autor:** arc-lider (Momento A, via arc-specfull)

---

## 1. Critérios de Aceite Funcionais

- **CA-01:** Com a opção ligada, o PDF gerado tem todas as páginas com o tamanho da captura de maior área (RN-01, RN-02).
- **CA-02:** Nenhum print é ampliado ou distorcido; prints maiores que a página em alguma dimensão são reduzidos proporcionalmente (RN-03).
- **CA-03:** Cada print fica centralizado; o fundo da página é branco (RN-04).
- **CA-04:** A ordem das páginas segue a ordem da galeria (RN-05).
- **CA-05:** Com a opção desligada, o PDF é idêntico ao comportamento anterior (FA-1).
- **CA-06:** *Salvar todas* não muda (RN-06).
- **CA-07:** A opção nasce desligada; `settings.json` antigo sem o campo é lido com `false` (RN-07).
- **CA-08:** Marcar na galeria persiste a preferência; Configurações mostra e salva o mesmo valor (RN-08, FA-2).
- **CA-09:** Falha ao persistir pela galeria não impede gerar o PDF com o valor marcado (FA-3).
- **CA-10:** A opção da galeria fica desabilitada enquanto salva/gera.
- **CA-11:** Ambas as telas sem violações axe; opção acessível por teclado com rótulo visível.

## 2. Cenários de "Backend" — Integração (main, `pdf-lib` real, sem mock)

| ID | Cenário | Verificação |
|---|---|---|
| CT-PF-01 | 1 item → buffer começa com `%PDF` | bytes |
| CT-PF-02 | N itens → N páginas | `PDFDocument.load().getPageCount()` |
| CT-PF-03 | Desligado: cada página com o tamanho da sua imagem (prints 300×200, 120×400) | tamanhos das páginas |
| CT-PF-04 | Ligado: todas as páginas do tamanho da maior área (300×200, 120×400, 800×600 → 800×600) | tamanhos |
| CT-PF-05 | Ligado com JPG e PNG misturados | páginas iguais, sem erro |
| CT-PF-06 | Ligado, todas iguais → mesmo resultado que desligado | tamanhos |
| CT-PF-07 | dataUrl inválido → rejeita (handler converte em `{ok:false}`) | `rejects` |

## 3. Cenários de Unitário (puro)

| ID | Cenário |
|---|---|
| CT-PL-01 | `planPdfPages(…, false)` → página = imagem, desenho em (0,0) tamanho cheio |
| CT-PL-02 | Ligado: referência = maior área |
| CT-PL-03 | Empate de área → a primeira |
| CT-PL-04 | Print menor que a página → escala 1, centralizado |
| CT-PL-05 | Print mais largo que a página (área menor) → reduzido pela largura, proporção preservada, centralizado |
| CT-PL-06 | Print mais alto que a página → reduzido pela altura |
| CT-PL-07 | Lista vazia → `[]` |
| CT-ST-01 | `defaultSettings` tem `pdfUniformSize: false`; `mergeSettings` sem o campo → `false`; com `true` → `true`; com tipo errado → default |

## 4. Cenários de Frontend — Componente

| ID | Componente | Cenário |
|---|---|---|
| CT-GL-20 | Gallery | Opção renderiza com o valor salvo (`true` e `false`) |
| CT-GL-21 | Gallery | Marcar chama `saveSettings({ pdfUniformSize: true })` |
| CT-GL-22 | Gallery | *Gerar PDF* envia `{ uniformSize }` igual ao marcado |
| CT-GL-23 | Gallery | `saveSettings` rejeitando: opção continua marcada e o PDF sai com `uniformSize: true` (erro) |
| CT-GL-24 | Gallery | Durante a geração (`busy`), opção desabilitada |
| CT-GL-25 | Gallery | Exportar falha → mensagem de erro existente, opção preservada (erro) |
| CT-GL-26 | Gallery | axe sem violações com a opção |
| CT-FC-20 | SettingsForm | Checkbox presente, com o valor carregado e ajuda vinculada |
| CT-FC-21 | SettingsForm | Marcar e salvar envia `pdfUniformSize: true` no payload |
| CT-FC-22 | SettingsForm | axe sem violações (cenário existente CT-FC-12 continua verde) |

## 5. Cenários de Frontend — Integração

| ID | Cenário |
|---|---|
| CT-FI-10 | Fluxo de settings (settingsFlow): erro do main → corrigir → salvar → `pdfUniformSize` preservado no payload |

## 6. Cenários E2E

| ID | Cenário |
|---|---|
| CT-E2E-04 | Abrir Configurações no Electron, marcar a opção, salvar → `settings.json` em disco contém `"pdfUniformSize": true` |

## 7. Massa de Dados — Factories & Seeders

- `settingsFactory` com `pdfUniformSize` aleatório + state `settingsFactory.uniformPdf()`.
- `tests/factories/imageFactory.ts`: `pngDataUrl(width, height, rgb?)` e `jpgDataUrl()` (JPEG real fixo de 16×8, gerado uma vez e embutido) — imagens reais decodificáveis pelo `pdf-lib`.
- `seedSettings` inalterado (o campo vem do default).

## 8. Cobertura Mínima Esperada

- `src/main/pdfBuilder.ts`: 100% linhas/ramos.
- Arquivos tocados no renderer: sem queda em relação ao atual.

## 9. Definition of Done

- [ ] CA-01..CA-11 atendidos
- [ ] Todos os cenários acima implementados e verdes
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npx playwright test` verdes
- [ ] `COMPONENTS.md` com `pdfBuilder`; `MEMORY.md` atualizado
- [ ] `04`, `05`, `06` gerados

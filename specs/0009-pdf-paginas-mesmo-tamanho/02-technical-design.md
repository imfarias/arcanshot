# 0009 — Desenho Técnico: Páginas do PDF com o Mesmo Tamanho

**Data:** 2026-10-09 · **Autor:** arc-lider (Momento A, via arc-specfull)

---

## 1. Resumo da Abordagem

- Novo campo plano `pdfUniformSize: boolean` em `AppSettings` (default `false`, RN-07). Sem migração: `mergeSettings` preenche o default em `settings.json` antigo (padrão da 0008).
- A montagem do PDF sai de `src/main/ipc.ts` para um módulo próprio **`src/main/pdfBuilder.ts`**, sem `import 'electron'` (padrão `overlayLayout.ts`), com:
  - `planPdfPages(sizes, uniform)` — função pura que devolve, por captura, o tamanho da página e o retângulo do desenho (RN-01..05);
  - `buildPdf(dataUrls, { uniformSize })` — embute as imagens com `pdf-lib`, aplica o plano e devolve o `Buffer`.
- `gallery:export-pdf` passa a aceitar `{ uniformSize?: boolean }`. A galeria envia o valor marcado na tela (fonte da verdade daquele clique, FA-3); sem argumento, o main usa o valor salvo.
- Galeria: checkbox "Páginas do mesmo tamanho" no rodapé, persistida via `saveSettings({ pdfUniformSize })` (melhor-esforço). Configurações: checkbox no grupo *Comportamento*.

## 2. Alternativas Consideradas

| Alternativa | Por que não |
|---|---|
| Main lê **só** o valor salvo (sem argumento no IPC) | Corrida: marcar e clicar *Gerar PDF* logo em seguida pode exportar antes de o `settings:save` terminar; e com falha de persistência (FA-3) o PDF contrariaria a tela. |
| Reamostrar os prints menores/maiores num canvas antes de embutir | Perde qualidade e custa CPU; o PDF já escala o desenho sem tocar nos pixels (`drawImage` com `width/height`). |
| Página = envelope (maior largura × maior altura) | Pode gerar página maior que qualquer captura e com muito branco; o usuário escolheu "tamanho da maior captura". |
| Manter `buildPdf` em `ipc.ts` | `ipc.ts` é excluído da cobertura (depende de Electron) e o teste atual **copia** a função em vez de importá-la — um teste que não exercita o código real. Extrair resolve os dois. |

## 3. Reutilização

| Componente (COMPONENTS.md) | Uso |
|---|---|
| `settings` (`src/shared/settings.ts`) | default + merge do novo campo; sem validação extra (booleano tipado pelo merge) |
| `SettingsStore` | persistência do campo, sem mudança |
| `Gallery` | ganha a opção e passa o argumento ao exportar |
| `SettingsForm` | ganha a checkbox (mesmo padrão `.field.checkbox` das demais) |
| `dataUrlToBuffer` (`src/main/saveImage.ts` ou onde estiver) | decodificação do dataUrl, reaproveitada no `pdfBuilder` |

Novo reutilizável: **`pdfBuilder`** (backend) — registrar em `COMPONENTS.md`.

## 4. Modelo de Dados

```ts
interface AppSettings {
  // ...
  /** PDF da sequência com todas as páginas do tamanho da maior captura (0009). */
  pdfUniformSize: boolean
}
```

```ts
// src/main/pdfBuilder.ts
export interface Size { width: number; height: number }
export interface PdfPagePlan { page: Size; draw: { x: number; y: number; width: number; height: number } }
export function planPdfPages(sizes: Size[], uniform: boolean): PdfPagePlan[]
export async function buildPdf(dataUrls: string[], opts?: { uniformSize?: boolean }): Promise<Buffer>
```

Coordenadas do PDF têm origem no canto inferior esquerdo; com centralização simétrica `y = (H − h) / 2` é igual nos dois sistemas, então não há inversão a fazer.

## 5. Contratos de API (IPC)

| Canal | Antes | Depois |
|---|---|---|
| `gallery:export-pdf` | `invoke()` → `{ ok, filePath?, error? }` | `invoke(options?: { uniformSize?: boolean })` → mesmo retorno |

Preload: `galleryExportPdf: (options?) => ipcRenderer.invoke('gallery:export-pdf', options)`. Tipo em `ArcanshotApi`: `galleryExportPdf(options?: { uniformSize?: boolean }): Promise<...>`.
No main: `uniform = typeof options?.uniformSize === 'boolean' ? options.uniformSize : settings.pdfUniformSize` (entrada do renderer não é confiável: qualquer outro tipo cai no valor salvo).

## 6. Arquitetura da Solução

```
Gallery (checkbox) ──saveSettings({pdfUniformSize})──▶ settings:save ─▶ SettingsStore
Gallery (Gerar PDF) ──galleryExportPdf({uniformSize})──▶ gallery:export-pdf
                                                     └▶ pdfBuilder.buildPdf(dataUrls, {uniformSize})
                                                          └▶ planPdfPages(tamanhos, uniform)
```

`planPdfPages`:
1. `uniform=false` ou lista vazia → página = tamanho do print, desenho em (0,0) tamanho cheio.
2. `uniform=true` → `ref` = maior `width*height` (primeiro em empate); para cada print: `s = min(1, ref.w/w, ref.h/h)`, `dw = w*s`, `dh = h*s`, `x = (ref.w−dw)/2`, `y = (ref.h−dh)/2`.

`buildPdf` desenha um retângulo branco do tamanho da página antes da imagem quando `uniform` (RN-04; PNG com transparência não pode deixar o fundo indefinido).

Erros: `buildPdf` lança; o handler já converte em `{ ok: false, error }` (convenção).

## 7. Integrações Externas

Nenhuma. `pdf-lib` é dependência local existente.

## 8. Eventos / Jobs / Filas

Nenhum.

## 9. Cache e Performance

Embutir cada imagem uma vez (`embedPng/embedJpg`) e reaproveitar `img.width/height` para o plano — sem decodificar duas vezes. Custo igual ao atual.

## 10. Segurança e LGPD

Sem dado pessoal novo. Argumento do IPC validado por tipo no main.

## 11. Frontend

### Galeria (`Gallery.tsx`)
- Estado `uniform` inicializado de `data.settings.pdfUniformSize` (também ao receber `gallery:refresh`).
- Checkbox antes da barra, dentro do rodapé:
  - `<input type="checkbox" id="gallery-pdf-uniform" data-testid="gallery-pdf-uniform">` + `<label htmlFor="gallery-pdf-uniform">Páginas do mesmo tamanho</label>`
  - `title`/`aria-describedby` com "Todas as páginas do PDF ficam do tamanho da maior captura".
  - `disabled={busy}`.
- Ao mudar: `setUniform(v)`; persistência melhor-esforço com `try/catch` + `Promise.resolve(...).catch(() => {})` (Pontos de Atenção da MEMORY).
- *Gerar PDF*: `galleryExportPdf({ uniformSize: uniform })`.

### Configurações (`SettingsForm.tsx`)
- `.field.checkbox` após o tempo da sequência: `id="pdfUniformSize"`, `data-testid="settings-pdf-uniform-size"`, `aria-describedby="pdfUniformSize-help"`.

### data-testid e ARIA
| Elemento | data-testid | ARIA |
|---|---|---|
| Checkbox galeria | `gallery-pdf-uniform` | label visível + `aria-describedby` |
| Checkbox configurações | `settings-pdf-uniform-size` | label visível + `aria-describedby` |

## 12. Estratégia de Testes desta Feature

- **"Backend" integração (main, sem Electron):** `pdfBuilder.buildPdf` real com `pdf-lib` real, lendo o PDF gerado com `PDFDocument.load` e verificando páginas/tamanhos (estado do artefato pós-operação). Sem mock.
- **Unitário:** `planPdfPages` (puro) — cenários de RN-01..05; `mergeSettings` com o campo novo/ausente.
- **Frontend componente:** Gallery (render da opção com valor salvo, toggle persiste, exportar envia o valor, falha ao persistir não quebra, desabilitada quando ocupada, axe) e SettingsForm (campo presente, salva no payload, axe).
- **Factories:** `settingsFactory` ganha o campo + state nomeado `settingsFactory.uniformPdf`; nova `imageFactory` (`pngDataUrl(w, h)`) gerando PNG real de tamanho arbitrário via `pdf-lib`-independente (encoder mínimo com `zlib`) para os testes de PDF.
- **E2E:** fluxo existente de settings cobre persistência em disco; acrescentar verificação de que `pdfUniformSize` salvo pela tela chega ao `settings.json`.

## 13. Arquivos a Criar / Alterar

| Ação | Arquivo |
|---|---|
| Criar | `src/main/pdfBuilder.ts` |
| Alterar | `src/main/ipc.ts` (usa `pdfBuilder`, argumento novo) |
| Alterar | `src/preload/index.ts`, `src/shared/types.ts` |
| Alterar | `src/shared/settings.ts` (default) |
| Alterar | `src/renderer/gallery/Gallery.tsx`, `gallery.css` |
| Alterar | `src/renderer/settings/SettingsForm.tsx` |
| Alterar | `tests/main/pdfBuilder.test.ts` (passa a importar o módulo real) |
| Criar | `tests/factories/imageFactory.ts` |
| Alterar | `tests/factories/settingsFactory.ts`, testes de Gallery/SettingsForm/settings, E2E |

## 14. Ordem de Execução Recomendada

1. Tipo + default → 2. `pdfBuilder` (plan + build) → 3. IPC/preload → 4. Galeria → 5. Configurações → 6. Testes → 7. Docs (COMPONENTS, MEMORY).

## 15. Riscos Identificados

| Risco | Mitigação |
|---|---|
| Print enorme (multi-monitor 7680×2160) define página gigante | Aceito: é o tamanho da maior captura por definição (RN-02); PDF já usa esse tamanho hoje. |
| PNG com transparência mostra fundo do leitor | Retângulo branco explícito (RN-04). |
| Corrida toggle → exportar | Valor enviado no próprio IPC (seção 2). |

## 16. Pesquisa Realizada

- `pdf-lib` — `PDFPage.drawImage({x,y,width,height})` escala sem reamostrar; `drawRectangle({color: rgb(1,1,1)})` para fundo; origem inferior esquerda. (documentação da biblioteca já usada no projeto, `node_modules/pdf-lib`).
- Código existente: `buildPdf` em `src/main/ipc.ts:44`, `tests/main/pdfBuilder.test.ts` (cópia local da função).

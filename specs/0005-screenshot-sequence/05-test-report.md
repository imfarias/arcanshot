# 0005 — Relatório de Testes

**Data:** 2026-06-13 · **Autor:** arc-tester (via arc-specfull)  
**Status:** ✅ Suite verde

---

## Resultado Geral

| Categoria | Arquivos | Testes | Resultado |
|---|---|---|---|
| Main — CaptureSession (fake timers) | 1 novo | 8 novos | ✅ |
| Main — pdfBuilder | 1 novo | 3 novos | ✅ |
| Renderer — Gallery (componente + a11y) | 1 novo | 10 novos | ✅ |
| Regressão (suite completa) | 14 total | 111 total | ✅ |

---

## Novos Testes — `captureSession.test.ts`

| CT | Descrição | Resultado |
|---|---|---|
| CT-CS-01 | `addCapture` acumula no buffer sem disparar callback antes do timer | ✅ |
| CT-CS-02 | 1 item no buffer — callback NÃO disparado ao expirar | ✅ |
| CT-CS-03 | 2 items — callback com 2 GalleryItems corretos após timer | ✅ |
| CT-CS-04 | Segundo `addCapture` reseta timer — callback dispara uma vez ao final | ✅ |
| CT-CS-05 | `clearSession` cancela timer — callback não chamado | ✅ |
| CT-CS-06 | 20 items → `onComplete` imediato (limite de segurança) | ✅ |
| CT-CS-07 | Após `onComplete`, nova sequência reinicia com índices do zero | ✅ |
| Extra | Sequência de 3 items mantém índices 1, 2, 3 | ✅ |

## Novos Testes — `pdfBuilder.test.ts`

| CT | Descrição | Resultado |
|---|---|---|
| CT-PF-01 | Buffer começa com `%PDF` | ✅ |
| CT-PF-02 | N items → N páginas | ✅ |
| CT-PF-03 | Dimensões da página == dimensões da imagem | ✅ |

## Novos Testes — `Gallery.test.tsx`

| CT | Descrição | Resultado |
|---|---|---|
| CT-GL-01 | Thumbnails com `alt="Captura N"` | ✅ |
| CT-GL-02 | Header com contagem correta | ✅ |
| CT-GL-03 | "Salvar todas" → `gallerySaveAll` → feedback sucesso | ✅ |
| CT-GL-04 | "Salvar todas" em falha → feedback erro | ✅ |
| CT-GL-05 | "Gerar PDF" → `galleryExportPdf` → feedback sucesso | ✅ |
| CT-GL-06 | "Gerar PDF" em falha → feedback erro | ✅ |
| CT-GL-07 | "Fechar" → `galleryClose` | ✅ |
| CT-GL-08 | DragStart → `galleryDragItem(index)` | ✅ |
| CT-GL-09 | jest-axe: zero violações | ✅ |
| Extra | Loading enquanto `galleryInit` não resolve | ✅ |

---

## Bugs Encontrados e Corrigidos

| # | Bug | Causa | Correção |
|---|---|---|---|
| 1 | `CT-GL-08` falhou com `DragEvent is not defined` | jsdom não implementa `DragEvent` nativo | Substituído por `fireEvent.dragStart` do Testing Library |

---

## Notas

- `pdfBuilder.test.ts` usa PNG sintético 1×1 pixel real (base64 inline) — válido como PNG e embeddável em `pdf-lib` sem mock
- `CaptureSession` testada com `vi.useFakeTimers()` — zero sleep real, timer preciso
- `Gallery.tsx` não tem estado persistido nem chamadas assíncronas além de `galleryInit` — todos os outros mocks são imediatos

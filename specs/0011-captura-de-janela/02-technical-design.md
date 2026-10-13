# 0011 — Desenho Técnico: Captura de Janela por Ctrl+clique

**Data:** 2026-10-13 · **Autor:** arc-lider (Momento A, via arc-specfull)

## 1. Resumo da Abordagem

No início da captura de área, o main lista as janelas abertas pelo Windows (`user32`/`dwmapi` via koffi), filtra o que não é alvo, converte para DIP do desktop e entrega ao overlay em `OverlayInitData.windows`. O overlay converte para px da imagem e faz o hit-test com Ctrl pressionado: destaque azul + etiqueta; `Ctrl+clique` define a seleção e entra na edição. A imagem é a mesma captura congelada: o recorte é do que está visível (RN-04), sem segunda captura.

## 2. Alternativas Consideradas

| Alternativa | Por que não |
|---|---|
| PowerShell/`Add-Type` | 0,3–1 s para subir, sujeito a políticas de empresa/antivírus; atrasaria o atalho principal. |
| Captura por janela (`desktopCapturer` com `types: ['window']`) | Pega a janela inteira mesmo coberta, mas falha com minimizadas/protegidas, não dá posição (ainda exigiria API nativa) e custa uma captura extra. Fora de escopo por decisão do usuário. |
| Detectar bordas por análise da imagem | Impreciso e caro; sem título. |
| Listar janelas em cada `pointermove` | IPC por movimento; a lista não muda durante a seleção (a tela está congelada). |

## 3. Reutilização
`planOverlayWindows`/`startCapture` (0007), `unionRect`, `clampRectToBounds`, `findViewportFor`, `size-label` do tema, fluxo `setSelection` + `beginEdit` do arrasto.
Novos: `shared/windowPick.ts` (puro), `main/windowList.ts` (nativo).

## 4. Modelo de Dados
```ts
interface WindowInfo extends Rect { title: string }          // DIP do desktop
interface OverlayInitData { …; windows?: WindowInfo[] }       // só modo 'area'
interface RawWindow { handle; title; className; exStyle; rect } // px físicos (main)
```

## 5. Contratos
Nenhum canal novo: a lista viaja em `overlay:init`. Sem mudança no preload.

## 6. Arquitetura da Solução
- `windowList.listWindows()` — `EnumWindows` + `IsWindowVisible`/`IsIconic`/`DwmGetWindowAttribute(CLOAKED)`; retângulo por `DWMWA_EXTENDED_FRAME_BOUNDS` (cai para `GetWindowRect`); título, classe e estilos estendidos. Carga preguiçosa e `try/catch` em tudo; fora do Windows ou com erro → `[]`.
- `selectCaptureWindows(raw, { excludeHandles, screens })` — filtros da RN-05 + recorte às telas.
- `overlay.collectWindows` — roda **antes** de criar os overlays (nenhuma janela do ArcanShot na lista; empilhamento igual ao da imagem); `screen.dipToScreenRect` nas telas e `screenToDipRect` nas janelas (DPI por monitor).
- `Overlay.tsx` — `toImageWindows(windows, union, base.width / union.width)` (escala medida na imagem, como na 0007); `hoverWin` derivado de `ctrlHeld` + `cursorImg`; o efeito de desenho acende `selection ?? hoverWin`.

## 7–10. Integrações, eventos, cache, segurança
Integração nativa apenas local. Nenhum dado sai da máquina; o título é exibido só no overlay. Entrada nativa tratada como não confiável (valores finitos, recorte, descarte de tamanho mínimo).

## 11. Frontend
Dica `editor-window-hint` (`role="note"`); etiqueta `editor-window-label`; contorno azul no canvas. Teclado: Ctrl rastreado por `keydown/keyup/blur` e por `ctrlKey` do ponteiro.

## 12. Estratégia de Testes
- Unitário (puro): `selectCaptureWindows`, `pickWindowAt`, conversões de coordenadas.
- Integração (Windows real, koffi): `listWindows` bem formada, repetível e rápida; vazia fora do Windows.
- Componente: dica, destaque, Ctrl+clique, fallback, recorte, sem lista, axe.
- Verificação manual automatizada no app **empacotado**: atalho de área → overlay recebe a lista.

## 13. Arquivos
Criar: `shared/windowPick.ts`, `main/windowList.ts`. Alterar: `shared/types.ts`, `main/overlay.ts`, `renderer/overlay/Overlay.tsx`, `overlay.css`, `package.json`. Docs: `README.md`, tabela de atalhos do site.

## 14. Ordem
Tipos → puro → nativo → overlay main → editor → testes → docs.

## 15. Riscos
| Risco | Mitigação |
|---|---|
| Janela invisível em tela cheia no topo engole o clique | Filtros da RN-05 (cloaked, sem título, sem ativação, click-through); o arrasto normal continua disponível. |
| `koffi` não carregar no instalador | O binário (`@koromix/koffi-win32-x64`) é desempacotado do asar pelo electron-builder; verificado no app empacotado; falha cai em "recurso desligado". |
| Antivírus reclamar de chamadas nativas | Só `user32`/`dwmapi` de leitura. |

## 16. Pesquisa
Win32: `EnumWindows`, `DwmGetWindowAttribute` (`DWMWA_EXTENDED_FRAME_BOUNDS`=9, `DWMWA_CLOAKED`=14), estilos `WS_EX_*`. Electron: `screen.screenToDipRect`/`dipToScreenRect` (Windows). koffi 3: `proto`/`register` para callbacks, dependência opcional por plataforma.

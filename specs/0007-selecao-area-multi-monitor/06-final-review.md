# 0007 — Revisão Final

**Data:** 2026-08-26 · **Autor:** arc-lider (Momento B, via arc-specfull)
**Veredito:** ⚠️ **Aprovado com ressalvas**

---

## 1. Aderência à especificação

| Regra | Como foi atendida | Verificação |
|---|---|---|
| RN-01 seleção atravessa monitores | Janela única na união — o arrasto é um gesto só | CT-OL-01/02, CT-FC-23 |
| RN-02 área = união dos monitores | `unionRect` sobre todos os bounds | CT-OL-02/04/05, CT-FC-20 |
| RN-03 posição relativa preservada | `displayDestRect` por display | CT-UN-22/23/24, CT-FC-22 |
| RN-04 região vazia em preto | `fillRect` do canvas antes dos displays | CT-FC-21 |
| RN-05 maior DPI | `pickCompositeScale` | CT-UN-20/21, CT-FC-20b |
| RN-06 sem regressão em monitor único | Caminho não-composto intocado | CT-FC-26/29 |
| RN-07 modo `full` inalterado | Ramo próprio em `planOverlayWindows` | CT-OL-07/08 |
| RN-08 modo `all` inalterado | Ramo próprio; `cssPerImage` de fit preservado | CT-OL-09 |
| RN-09 cancelar fecha tudo | Uma janela só; `closeAllOverlays` inalterado | CT-FC-28 |
| RN-10 toolbar dentro de monitor real | `placeToolbar` + viewports por monitor | CT-UN-29→35 |
| RN-11 indicador de tamanho | Inalterado, agora sobre seleção composta | CT-FC-23 |
| RN-12 `redit` inalterado | Ramo retorna `[]`; caminho da galeria intocado | CT-OL-10 |

**Todas as 12 regras de negócio atendidas e cobertas por teste.**

---

## 2. Aderência à arquitetura

| Critério | Avaliação |
|---|---|
| Lógica pura em `shared/` | ✅ Os 7 helpers novos são puros e sem dependência de Electron/DOM |
| `overlayLayout.ts` puro no main | ✅ Decisão correta: contorna a exclusão de `overlay.ts` da cobertura sem mockar Electron |
| Contrato IPC | ✅ Zero mudança — `OverlayInitData` já suportava múltiplas capturas |
| Convenções de nome e erro | ✅ Seguidas |
| Testes sem mock de módulo interno | ✅ Stubs restritos à fronteira do browser (canvas, `Image`, `PointerEvent`, preload) |
| Decisão arquitetural registrada | ✅ #4 marcada como superada, #8 registrada com trade-off explícito |
| `data-testid` e a11y | ✅ Preservados; `jest-axe` limpo (CT-FC-30) |

---

## 3. Qualidade do código

**Pontos fortes**
- A causa raiz foi atacada na estrutura (uma janela em vez de N), não contornada com sincronização de eventos — a solução tem menos código e menos estado que a anterior.
- A condição de composição passou a depender do **dado** (`displays.length > 1`) e não do modo: um caminho a menos para divergir.
- Números mágicos (`760`, `64`, `10`) viraram constantes nomeadas e testáveis.
- `cssPerDip` derivado de `innerWidth` medido em vez de `devicePixelRatio` assumido — a única forma correta em DPI misto, e está comentado no código explicando por quê.
- `Overlay.tsx` saiu de **0% para 72% de cobertura**: a feature deixou o arquivo mais testável do que encontrou.

**Sem 🔴.** Nenhum bloqueador identificado.

---

## 4. Ressalvas

### 🟡 R1 — Largura da toolbar é constante assumida, não medida
`TOOLBAR_SIZE_CSS.width = 760` reproduz o número que já estava no código, mas a toolbar é um flex de botões: a largura real varia com o conteúdo. O clamp de RN-10 usa esse valor, então num monitor estreito a barra pode sobrar alguns pixels ou ser empurrada mais do que o necessário.

*Não é regressão* — o mesmo `760` era usado antes. Correção, se incomodar na prática: medir por `ref.getBoundingClientRect()` e recalcular a posição num `useLayoutEffect`.

### 🟡 R2 — RNF-04 (memória) não verificado em 4 monitores 4K
O canvas da união em 4× 4K chegaria a ~265 MB por canvas, com dois canvases em memória. O trade-off está registrado na decisão #8, mas só foi validado por raciocínio, não por medição. Em 1–2 monitores, que é o cenário do usuário, o consumo é confortável.

### 🔵 R3 — Portão de lint vermelho por causa pré-existente
`TextInputLayer.tsx:40` referencia a regra `jsx-a11y/no-autofocus` sem o plugin instalado. Vem da feature 0006 (ainda não commitada) e não foi tocado aqui. Correção de uma linha — ver §6 do `04-implementation-report.md`.

### 🔵 R4 — Roteiros manuais dependem de hardware
Os roteiros A–H (DPI misto, monitor à esquerda, fluidez do arrasto) precisam de dois monitores físicos. A geometria está toda coberta por teste; o alinhamento visual precisa dos seus monitores.

---

## 5. Portões

| Portão | Resultado |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run build` | ✅ |
| `npm run test` | ✅ 163/163 (baseline 117) |
| `npm run lint` | ⚠️ 1 erro pré-existente (R3) |
| Cobertura dos arquivos novos | ✅ 100% |

---

## 6. Veredito

⚠️ **Aprovado com ressalvas.** A feature está completa, coberta e sem bloqueador. As ressalvas R1 e R2 são melhorias opcionais; R3 é dívida de outra feature; R4 só o hardware fecha.

**Recomendação:** rodar os roteiros A–G nos seus dois monitores antes de commitar. Se o Roteiro F (toolbar em posições difíceis) apontar sobra ou folga, aí sim vale aplicar R1.

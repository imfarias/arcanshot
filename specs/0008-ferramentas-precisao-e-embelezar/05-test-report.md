# 0008 — Relatório de Testes

**Data:** 2026-08-26 · **Autor:** arc-tester (via arc-specfull)
**Status:** ✅ Suíte verde

---

## 1. Resumo

| Métrica | Antes | Depois |
|---|---|---|
| Arquivos de teste | 16 | **20** |
| Testes | 163 | **273** |
| Testes novos desta feature | — | **110** |
| Falhas | 0 | 0 |
| Cobertura agregada | 67,5% | **77,1%** |

---

## 2. Testes por área

### `tests/unit/beautify.test.ts` — 22 testes (módulo puro)

Cobre presets, geometria do acabamento e regra de formato.

| ID | Cenário | Status |
|---|---|---|
| CT-BE-01 | Presets íntegros; cores coerentes com o tipo | ✅ |
| CT-BE-02/03 | `resolveBackground` resolve; id desconhecido cai no padrão sem lançar | ✅ |
| CT-BE-04 | Margem é % da **menor** dimensão | ✅ |
| CT-BE-05/06 | Saída = interna + 2× margem; margem 0 preserva o tamanho | ✅ |
| CT-BE-07/08 | Raio proporcional entre 6 e 48; `rounded: false` zera | ✅ |
| CT-BE-09/10 | Sombra `null` quando desligada **ou** quando a margem é 0 | ✅ |
| CT-BE-11 | Print de 300 px e de 3000 px recebem acabamento proporcional (RN-17) | ✅ |
| CT-BE-12→14 | `pickExportFormat`: `none` força PNG; opaco respeita; desligado não interfere | ✅ |
| CT-BE-15→17 | `validateBeautify` rejeita margem/fundo inválidos, aceita parcial válido | ✅ |
| — | Ids únicos; margem fora da faixa é limitada; `beautifyFromSettings` | ✅ |

### `tests/unit/settings.test.ts` — +7 testes

| ID | Cenário | Status |
|---|---|---|
| CT-UN-40/41 | Nasce desligado; 5 campos com os defaults previstos | ✅ |
| CT-UN-42 | **`settings.json` de versão anterior recebe os defaults no merge** — sem migração | ✅ |
| CT-UN-43/44 | Validação rejeita margem e fundo inválidos | ✅ |
| — | Erros novos convivem com os antigos no mesmo `FieldErrors` | ✅ |

### `tests/unit/geometry.test.ts` — +6 testes

`placeNearCursor` (CT-UN-45 a CT-UN-49): abaixo-direita, espelhamento em cada borda, canto inferior direito, **e a garantia de nunca cobrir o cursor** verificada em 4 posições. Viewport menor que a lupa degrada sem `NaN`.

### `tests/unit/editor.test.ts` — +3 testes

CT-UN-50 a CT-UN-52: traço livre e tarja entram em desfazer/refazer; o traço volta **inteiro** (não em pedaços); `nextStepNumber` ignora os dois tipos novos.

### `tests/renderer/editorRender.test.ts` — 24 testes (**arquivo novo**)

O stub de canvas registra as chamadas **com o estado das propriedades no momento**, o que permite afirmar o que foi desenhado, não só que nada quebrou.

| ID | Cenário | Status |
|---|---|---|
| CT-RN-01/02 | Tarja: `fillRect` com a cor certa, `globalAlpha` intacto em 1 (RN-11) | ✅ |
| — | **Contraste explícito:** o desfoque redesenha a imagem (`drawImage`), a tarja não — prova a diferença de garantia | ✅ |
| CT-RN-03/04 | Traço: curvas quadráticas, espessura, `lineCap`/`lineJoin` redondos | ✅ |
| — | Traço de 1 ponto e traço vazio não quebram | ✅ |
| CT-RN-09→11 | `applyBeautify`: fundo antes da imagem; `none` não pinta; imagem deslocada pela margem | ✅ |
| — | Recorte por `clip`; sombra projetada; gradiente; origem nunca alterada | ✅ |
| CT-RN-05/06 | **Exportação sem o parâmetro e com acabamento desligado produzem resultado idêntico (RN-22)** | ✅ |
| CT-RN-07 | Acabamento ligado cresce o canvas (200→240) | ✅ |
| CT-RN-08 | Fundo transparente exporta PNG mesmo com formato jpg | ✅ |
| — | `roundRectPath`: 4 `arcTo`, raio 0 válido, raio limitado a metade do lado | ✅ |

### `tests/renderer/Magnifier.test.tsx` — 10 testes (**arquivo novo**)

| ID | Cenário | Status |
|---|---|---|
| CT-MG-01 | Amplia com `imageSmoothingEnabled = false` | ✅ |
| CT-MG-02/03 | Coordenadas e `#RRGGBB` maiúsculo; zero à esquerda preservado | ✅ |
| CT-MG-04 | Reporta a cor via `onColorRead` | ✅ |
| CT-MG-05 | **Prova do RNF-02:** todo canvas em que `getImageData` foi chamado tem 132 px — nunca o canvas base | ✅ |
| CT-MG-06 | Reposiciona-se na borda direita | ✅ |
| CT-MG-07 | `aria-hidden` (decorativa) | ✅ |
| — | Sem canvas de origem não quebra; `getImageData` que lança degrada para `#000000` | ✅ |

### `tests/renderer/BeautifyPanel.test.tsx` — 12 testes (**arquivo novo**)

CT-BP-01 a CT-BP-10, cobrindo **sucesso e erro com o mesmo rigor** (§11 da arquitetura): amostras, cada controle emitindo `onChange`, `aria-pressed`, regeneração do preview, **preview que lança exibindo estado de erro sem derrubar o painel**, preview nulo com mensagem neutra, rótulos acessíveis e `jest-axe` limpo.

### `tests/renderer/Toolbar.test.tsx` — +8 testes

CT-TB-10 a CT-TB-16: as 3 ferramentas novas com `aria-label`, `onToolChange` por ferramenta, `aria-pressed`, botão ✨ emitindo e refletindo estado, **ausência do botão quando não oferecido (RN-21)**, navegação por setas e `jest-axe`.

### `tests/renderer/Overlay.test.tsx` — +18 testes

| ID | Cenário | Status |
|---|---|---|
| CT-FC-40→42 | Lupa na seleção, some na edição, volta com o conta-gotas | ✅ |
| CT-FC-43 | `copyColor` chamado com o hexadecimal lido | ✅ |
| CT-FC-44 | Conta-gotas **não** cria anotação (desfazer segue desabilitado) | ✅ |
| CT-FC-45 | A cor lida vira a cor ativa | ✅ |
| CT-FC-46/47 | Traço com vários pontos gera curvas; clique sem arrasto não cria nada | ✅ |
| CT-FC-48/49 | Tarja criada; tarja minúscula descartada | ✅ |
| CT-FC-50 | `Ctrl+Z` desfaz a tarja inteira | ✅ |
| CT-FC-51 | Painel abre e fecha | ✅ |
| CT-FC-52 | Ajuste persistido via `saveSettings` **após o debounce** | ✅ |
| CT-FC-53 | `saveSettings` rejeitando não quebra a tela e o ajuste vale na captura atual | ✅ |
| CT-FC-54 | Copiar com acabamento aplica o recorte de cantos (`clip`) | ✅ |
| CT-FC-55 | Modo `redit` sem o botão ✨ | ✅ |
| — | **Modo `redit` não aplica acabamento na exportação** (nenhum `clip`) | ✅ |
| CT-FC-56 | Ferramentas antigas seguem funcionando | ✅ |

---

## 3. Massa de dados

| Factory | Novidade |
|---|---|
| `annotationFactory` | +`redact()` (cor escura, como no uso real) e +`freehand()` (3–12 pontos); helper `rect()` extraído do `blur` |
| `settingsFactory` | +5 campos; +`beautified()` e +`transparentBeautify()` (que exercita a regra de forçar PNG) |

---

## 4. Fronteiras de mock

Conforme §11 da arquitetura, **nenhum módulo interno foi mockado**. Os stubs ficam na fronteira do browser que o jsdom não implementa:

| Stub | Por quê |
|---|---|
| `getContext('2d')` | Registra chamadas **e o estado das propriedades** — permite afirmar opacidade, espessura, ordem de desenho |
| `toDataURL` | jsdom não implementa; codifica as dimensões no dataUrl, o que deixa o tamanho final verificável |
| `getImageData` | Devolve uma cor ajustável por teste, e **registra em qual canvas foi chamado** (prova do RNF-02) |
| `Image` | jsdom não decodifica `data:` URLs |
| `window.PointerEvent` | Não implementado; aliasado para `MouseEvent` |
| `window.arcanshot` | Fronteira do preload |

---

## 5. Bugs encontrados na implementação

**1 bug real, corrigido na Etapa 5** (detalhado em §5 do `04-implementation-report.md`):

> A persistência com debounce fazia `saveSettings(...).catch()` dentro de um `setTimeout`. Quando `saveSettings` não devolve uma `Promise`, isso lança `TypeError` **fora do ciclo do React** — uma exceção não capturada, violando a RN-20 ("falha ao persistir não interrompe a captura"). Encontrado por CT-FC-53. Corrigido com `try/catch` + `Promise.resolve`.

Além disso, 3 ajustes em **código de teste** (não em produção):
1. `renderOverlay` esperava a classe do cursor mudar — inválido no modo `redit`, onde o cursor já nasce `default`. Trocado por um sinal válido em todos os modos.
2. Faltava stub de `toDataURL`, o que fazia a exportação devolver vazio e as ações de copiar nunca dispararem.
3. `fireEvent.change` em vez de atribuir `.value` — o React rastreia o valor internamente e não dispara `onChange` de outra forma.

---

## 6. Não coberto por automação

| Item | Por quê | Como validar |
|---|---|---|
| Fluidez da lupa no arrasto (RNF-01) | Exige GPU e percepção humana | Roteiro A |
| Fidelidade visual do preview (RN-16) | Comparação visual entre miniatura e resultado colado | Roteiro D, passo 5 |
| Irreversibilidade da tarja (RN-11) | O teste prova que o pixel é sobrescrito; a verificação com brilho/contraste no máximo é visual | Roteiro C, passo 4 |
| Persistência real entre reinícios do app | O teste cobre a chamada a `saveSettings`; a gravação em disco é do `SettingsStore`, já coberto na 0001 | Roteiro D, passo 6 |

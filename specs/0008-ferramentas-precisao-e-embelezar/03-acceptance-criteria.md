# 0008 — Critérios de Aceite

**Data:** 2026-08-26 · **Autor:** arc-lider (Momento A, via arc-specfull)

---

## Critérios Automatizados — `shared/beautify` (`tests/unit/beautify.test.ts`)

| ID | Descrição | Regra |
|---|---|---|
| CT-BE-01 | `BACKGROUND_PRESETS` contém `none`, e todo preset tem `id`, `label`, `type` e cores coerentes com o tipo | — |
| CT-BE-02 | `resolveBackground` devolve o preset pedido | — |
| CT-BE-03 | `resolveBackground` com id desconhecido devolve o preset padrão (não lança) | — |
| CT-BE-04 | `computeBeautifyLayout` calcula margem como percentual da **menor** dimensão | RN-17 |
| CT-BE-05 | Saída = interna + 2× margem, em ambos os eixos | RN-17 |
| CT-BE-06 | Margem 0 produz saída idêntica à interna | RN-17 |
| CT-BE-07 | Raio dos cantos é proporcional e fica entre 6 e 48 | RN-17 |
| CT-BE-08 | `rounded: false` produz raio 0 | — |
| CT-BE-09 | Sombra é `null` quando `shadow: false` | — |
| CT-BE-10 | Sombra é `null` quando a margem é 0, mesmo com `shadow: true` | RN-17 |
| CT-BE-11 | Print pequeno e print grande recebem acabamento proporcionalmente equivalente | RN-17 |
| CT-BE-12 | `pickExportFormat('jpg', {enabled:true, background:'none'})` retorna `'png'` | RN-18 |
| CT-BE-13 | `pickExportFormat('jpg', {enabled:true, background:'graphite'})` retorna `'jpg'` | RN-18 |
| CT-BE-14 | `pickExportFormat('jpg', {enabled:false, background:'none'})` retorna `'jpg'` | RN-22 |
| CT-BE-15 | `validateBeautify` rejeita margem fora de 0–20 e não inteira | — |
| CT-BE-16 | `validateBeautify` rejeita id de fundo desconhecido | — |
| CT-BE-17 | `validateBeautify` aceita um parcial válido sem erros | — |

## Critérios Automatizados — `shared/settings` (`tests/unit/settings.test.ts`)

| ID | Descrição | Regra |
|---|---|---|
| CT-UN-40 | `defaultSettings` traz `beautifyEnabled: false` (compatibilidade) | RN-22 |
| CT-UN-41 | `defaultSettings` traz os 5 campos de embelezamento com os defaults previstos | RN-19 |
| CT-UN-42 | `mergeSettings` preenche os campos novos a partir do default quando ausentes em `settings.json` antigo | RN-19 |
| CT-UN-43 | `validateSettings` rejeita `beautifyPadding` inválido | — |
| CT-UN-44 | `validateSettings` rejeita `beautifyBackground` desconhecido | — |

## Critérios Automatizados — `shared/geometry` (`tests/unit/geometry.test.ts`)

| ID | Descrição | Regra |
|---|---|---|
| CT-UN-45 | `placeNearCursor` posiciona abaixo-direita quando há espaço | RN-03 |
| CT-UN-46 | Espelha para a esquerda ao encostar na borda direita | RN-03 |
| CT-UN-47 | Espelha para cima ao encostar na borda inferior | RN-03 |
| CT-UN-48 | Espelha nos dois eixos no canto inferior direito | RN-03 |
| CT-UN-49 | Nunca devolve posição que sobreponha o cursor | RN-03 |

## Critérios Automatizados — `lib/editor` (`tests/unit/editor.test.ts`)

| ID | Descrição | Regra |
|---|---|---|
| CT-UN-50 | Anotação `freehand` entra em desfazer/refazer como as demais | RN-10 |
| CT-UN-51 | Anotação `redact` entra em desfazer/refazer como as demais | RN-14 |
| CT-UN-52 | `nextStepNumber` ignora `freehand` e `redact` na contagem | — |

## Critérios Automatizados — Render e exportação (`tests/renderer/editorRender.test.ts`)

| ID | Descrição | Regra |
|---|---|---|
| CT-RN-01 | `redact` desenha `fillRect` com a cor da anotação | RN-11, RN-12 |
| CT-RN-02 | `redact` não altera `globalAlpha` (opacidade total) | RN-11 |
| CT-RN-03 | `freehand` desenha um traço contínuo passando pelos pontos | RN-08 |
| CT-RN-04 | `freehand` usa `lineCap`/`lineJoin` arredondados e a espessura da anotação | RN-07 |
| CT-RN-05 | `exportSelection` **sem** o parâmetro de acabamento produz o mesmo resultado de antes | RN-22 |
| CT-RN-06 | `exportSelection` com acabamento desligado produz o mesmo resultado | RN-22 |
| CT-RN-07 | `exportSelection` com acabamento ligado produz canvas maior que o recorte | RN-15 |
| CT-RN-08 | `exportSelection` com fundo `none` exporta como PNG mesmo com formato jpg | RN-18 |
| CT-RN-09 | `applyBeautify` preenche o fundo antes de desenhar a imagem | RN-15 |
| CT-RN-10 | `applyBeautify` com fundo `none` não pinta fundo algum | RN-18 |
| CT-RN-11 | `applyBeautify` desenha a imagem deslocada pela margem | RN-15 |

## Critérios Automatizados — `Magnifier` (`tests/renderer/Magnifier.test.tsx`)

| ID | Descrição | Regra |
|---|---|---|
| CT-MG-01 | Desenha a região ampliada com suavização desligada | RN-02 |
| CT-MG-02 | Exibe as coordenadas do ponto em pixels da imagem | RN-02 |
| CT-MG-03 | Exibe a cor em `#RRGGBB` maiúsculo | RN-02 |
| CT-MG-04 | Reporta a cor lida via `onColorRead` | RN-04 |
| CT-MG-05 | Lê o pixel do **próprio canvas** da lupa, nunca do canvas base | RNF-02 |
| CT-MG-06 | Reposiciona-se ao encostar na borda | RN-03 |
| CT-MG-07 | É `aria-hidden` (decorativo) | §10 |

## Critérios Automatizados — `BeautifyPanel` (`tests/renderer/BeautifyPanel.test.tsx`)

| ID | Descrição | Regra |
|---|---|---|
| CT-BP-01 | Renderiza uma amostra por preset, incluindo "nenhum" | RN-18 |
| CT-BP-02 | Clicar num fundo emite `onChange` com o id correspondente | RN-19 |
| CT-BP-03 | Mover o deslizante emite `onChange` com a margem | RN-19 |
| CT-BP-04 | Alternar cantos e sombra emite `onChange` | RN-19 |
| CT-BP-05 | O interruptor geral emite `onChange` com `enabled` | RN-15 |
| CT-BP-06 | O fundo ativo é marcado com `aria-pressed` | §10 |
| CT-BP-07 | O preview é atualizado quando as opções mudam | RN-16 |
| CT-BP-08 | Falha ao gerar o preview não quebra o painel (estado de erro) | robustez |
| CT-BP-09 | Todos os controles têm rótulo acessível associado | §10 |
| CT-BP-10 | `jest-axe` sem violações sérias/críticas | §10 |

## Critérios Automatizados — `Toolbar` (`tests/renderer/Toolbar.test.tsx`)

| ID | Descrição | Regra |
|---|---|---|
| CT-TB-10 | As 3 ferramentas novas são renderizadas com `aria-label` | §10 |
| CT-TB-11 | Clicar em cada ferramenta nova emite `onToolChange` com o id certo | — |
| CT-TB-12 | A ferramenta ativa recebe `aria-pressed="true"` | §10 |
| CT-TB-13 | O botão ✨ emite `onToggleBeautify` | RN-15 |
| CT-TB-14 | O botão ✨ **não** é renderizado quando o embelezamento não é oferecido | RN-21 |
| CT-TB-15 | Navegação por setas alcança os controles novos | §10 |
| CT-TB-16 | `jest-axe` sem violações após as adições | §10 |

## Critérios Automatizados — `Overlay` (`tests/renderer/Overlay.test.tsx`)

| ID | Descrição | Regra |
|---|---|---|
| CT-FC-40 | A lupa aparece durante a seleção de área | RN-01 |
| CT-FC-41 | A lupa some ao entrar em edição | RN-01 |
| CT-FC-42 | A lupa reaparece ao ativar o conta-gotas | RN-01 |
| CT-FC-43 | Clicar com o conta-gotas chama `copyColor` com o hexadecimal lido | RN-04 |
| CT-FC-44 | Clicar com o conta-gotas **não** cria anotação | RN-05 |
| CT-FC-45 | Clicar com o conta-gotas passa a cor lida a ser a cor ativa | RN-04 |
| CT-FC-46 | Arrastar com traço livre cria uma anotação `freehand` com vários pontos | RN-07 |
| CT-FC-47 | Clique sem arrasto com traço livre não cria anotação | RN-09, FA-6 |
| CT-FC-48 | Arrastar com tarja cria anotação `redact` | RN-11 |
| CT-FC-49 | Tarja menor que o mínimo é descartada | RN-13 |
| CT-FC-50 | Traço livre e tarja são desfeitos por `Ctrl+Z` | RN-10, RN-14 |
| CT-FC-51 | O botão ✨ abre e fecha o painel | RN-15 |
| CT-FC-52 | Ajuste no painel persiste via `saveSettings` | RN-19 |
| CT-FC-53 | Falha em `saveSettings` não interrompe o fluxo nem quebra a tela | RN-20, FA-5 |
| CT-FC-54 | Copiar com acabamento ligado envia dataUrl maior que o recorte | RN-15 |
| CT-FC-55 | Em modo `redit`, o botão ✨ não aparece | RN-21 |
| CT-FC-56 | Sem regressão: as ferramentas antigas seguem criando suas anotações | — |

---

## Roteiro Manual

### Roteiro A — Lupa e conta-gotas
1. Acionar captura de área → **verificar:** a lupa acompanha o cursor com pixels ampliados, coordenadas e hexadecimal
2. Levar o cursor até cada borda da tela → **verificar:** a lupa se reposiciona e nunca sai da área visível
3. Selecionar uma área e soltar → **verificar:** a lupa some
4. Escolher o conta-gotas → **verificar:** a lupa volta
5. Clicar sobre uma cor conhecida (ex.: um botão azul) → **verificar:** notificação "Cor #XXXXXX copiada"
6. Colar em qualquer editor de texto → **verificar:** o hexadecimal está correto
7. Desenhar um retângulo → **verificar:** saiu na cor capturada

### Roteiro B — Traço livre
1. Escolher traço livre e desenhar um círculo à mão → **verificar:** o traço acompanha o movimento sem cantos angulosos
2. Trocar espessura e cor, desenhar de novo → **verificar:** o novo traço respeita as escolhas
3. `Ctrl+Z` → **verificar:** o último traço inteiro some (não pedaços)
4. `Ctrl+Y` → **verificar:** volta inteiro
5. Dar um clique único sem mover → **verificar:** nada é criado

### Roteiro C — Tarja sólida
1. Capturar uma tela com texto sensível visível
2. Escolher tarja e arrastar sobre o texto → **verificar:** a região fica totalmente opaca
3. Salvar e abrir o arquivo em um editor de imagem
4. **Verificar:** aumentando o brilho/contraste ao máximo, nada do texto reaparece
5. Comparar com o desfoque na mesma imagem → **verificar:** a diferença de garantia fica evidente

### Roteiro D — Embelezar
1. Em edição, clicar em ✨ → **verificar:** o painel abre com preview
2. Trocar de fundo → **verificar:** o preview muda na hora
3. Mover a margem → **verificar:** o preview acompanha
4. Alternar cantos e sombra → **verificar:** refletido no preview
5. `Ctrl+C` e colar → **verificar:** o resultado colado é igual ao preview
6. Fechar o app, capturar de novo e abrir o painel → **verificar:** as preferências foram lembradas
7. Escolher fundo "nenhum" com formato JPG configurado, salvar → **verificar:** o arquivo saiu `.png` com transparência
8. Desligar o embelezamento e salvar → **verificar:** imagem sem moldura, como antes

### Roteiro E — Sem regressão
1. Testar as 8 ferramentas antigas → **verificar:** todas funcionam
2. Capturar atravessando dois monitores (feature 0007) → **verificar:** lupa e ferramentas funcionam na área composta
3. Fazer 2 capturas seguidas para abrir a galeria → **verificar:** galeria normal
4. Re-editar um item da galeria → **verificar:** o botão ✨ **não** aparece
5. Abrir Configurações → **verificar:** nenhum campo novo, tudo salva normalmente

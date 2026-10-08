# 0007 — Critérios de Aceite

**Data:** 2026-08-26 · **Autor:** arc-lider (Momento A, via arc-specfull)

---

## Critérios Automatizados — `overlayLayout` (`tests/main/overlayLayout.test.ts`)

| ID | Descrição | Regra |
|---|---|---|
| CT-OL-01 | `planOverlayWindows('area', ...)` retorna **exatamente 1** janela | RN-01 |
| CT-OL-02 | No modo `area`, os bounds da janela são a união dos bounds de todos os displays | RN-02 |
| CT-OL-03 | No modo `area`, `displayId` é `null` (janela recebe todas as capturas) | RN-03 |
| CT-OL-04 | No modo `area` com monitor à esquerda do primário, a união tem `x` negativo e cobre os dois | RN-02 |
| CT-OL-05 | No modo `area` com alturas diferentes, a altura da união é a do monitor mais alto | RN-02 |
| CT-OL-06 | Com **um único** display, o modo `area` produz janela com os bounds desse display | FA-3 |
| CT-OL-07 | `planOverlayWindows('full', ...)` retorna 1 janela com os bounds do display sob o cursor | RN-07 |
| CT-OL-08 | No modo `full`, `cursorDisplayId` inexistente cai no primeiro display (cache desatualizado) | RN-07 |
| CT-OL-09 | `planOverlayWindows('all', ...)` retorna 1 janela nos bounds do display primário, `displayId` `null` | RN-08 |
| CT-OL-10 | `planOverlayWindows('redit', ...)` retorna lista vazia | RN-12 |
| CT-OL-11 | Lista de displays vazia retorna lista vazia em qualquer modo | — |
| CT-OL-12 | `pickCapturesForWindow(captures, null)` retorna **todas** as capturas, na ordem | RN-03 |
| CT-OL-13 | `pickCapturesForWindow(captures, id)` retorna apenas a captura daquele display | RN-07 |
| CT-OL-14 | `pickCapturesForWindow(captures, idInexistente)` cai na primeira captura | RN-07 |

---

## Critérios Automatizados — `shared/geometry` (`tests/unit/geometry.test.ts`)

| ID | Descrição | Regra |
|---|---|---|
| CT-UN-20 | `pickCompositeScale` retorna o maior `scaleFactor` da lista | RN-05 |
| CT-UN-21 | `pickCompositeScale` com lista vazia retorna `1` | RN-05 |
| CT-UN-22 | `displayDestRect` posiciona o display primário na origem do canvas | RN-03 |
| CT-UN-23 | `displayDestRect` desloca o display secundário pela distância real entre eles, multiplicada pela escala | RN-03 |
| CT-UN-24 | `displayDestRect` normaliza união com origem negativa (monitor à esquerda) para coordenadas ≥ 0 | RN-03 |
| CT-UN-25 | `dipRectToOverlayCss` converte bounds em DIP para CSS relativo à origem da união | RN-10 |
| CT-UN-26 | `rectIntersectionArea` retorna `0` para retângulos disjuntos e a área correta para sobrepostos | RN-10 |
| CT-UN-27 | `findViewportFor` escolhe o monitor com maior interseção quando a seleção cruza dois | RN-10 |
| CT-UN-28 | `findViewportFor` retorna o primeiro viewport quando não há interseção com nenhum (região vazia) | RN-04 |
| CT-UN-29 | `placeToolbar` posiciona a toolbar **abaixo** da seleção quando há espaço no monitor | RN-10 |
| CT-UN-30 | `placeToolbar` posiciona **acima** quando não cabe abaixo dentro do monitor | RN-10 |
| CT-UN-31 | `placeToolbar` posiciona **dentro** da seleção quando não cabe nem acima nem abaixo | RN-10 |
| CT-UN-32 | `placeToolbar` nunca ultrapassa a borda direita do monitor escolhido | RN-10 |
| CT-UN-33 | `placeToolbar` nunca ultrapassa a borda esquerda do monitor escolhido | RN-10 |
| CT-UN-34 | Seleção no monitor secundário posiciona a toolbar dentro **daquele** monitor, não do primário | RN-10 |
| CT-UN-35 | Seleção que cruza dois monitores mantém a toolbar inteira dentro de um deles | RN-10 |

---

## Critérios Automatizados — Componente `Overlay` (`tests/renderer/Overlay.test.tsx`)

| ID | Descrição | Regra |
|---|---|---|
| CT-FC-20 | Com duas capturas no modo `area`, o canvas base tem as dimensões da união na maior escala | RN-02, RN-05 |
| CT-FC-21 | O canvas composto é preenchido de preto antes de desenhar os displays (região vazia) | RN-04 |
| CT-FC-22 | Cada captura é desenhada na posição relativa correta do canvas composto | RN-03 |
| CT-FC-23 | Arrasto do monitor 1 ao monitor 2 produz seleção cuja largura ultrapassa a largura do monitor 1 | RN-01 |
| CT-FC-24 | O indicador de tamanho exibe as dimensões da seleção composta | RN-11 |
| CT-FC-25 | Ao soltar o arrasto cross-display, o overlay entra em modo de edição e a toolbar aparece | RN-01 |
| CT-FC-26 | Arrasto contido em um monitor só continua funcionando (sem regressão) | RN-06 |
| CT-FC-27 | Arrasto menor que o mínimo é descartado e o overlay permanece em seleção | FA-5 |
| CT-FC-28 | `Esc` durante a seleção chama `cancelOverlay` | RN-09 |
| CT-FC-29 | Com uma única captura no modo `area`, o canvas tem o tamanho dessa captura (sem composição) | FA-3 |
| CT-FC-30 | Sem violações de acessibilidade sérias/críticas (`jest-axe`) no modo de edição | §10 |

---

## Roteiro Manual — 2 monitores

### Roteiro A — Seleção atravessando monitores (caso central)

1. Com 2 monitores lado a lado, acionar o atalho de **seleção de área**
2. **Verificar:** os dois monitores escurecem ao mesmo tempo, com cursor em cruz em ambos
3. Pressionar o botão no meio do monitor 1 e arrastar até o meio do monitor 2
4. **Verificar:** o retângulo acompanha o cursor **sem travar** na borda entre as telas
5. **Verificar:** o indicador de tamanho cresce além da largura do monitor 1
6. Soltar o botão
7. **Verificar:** a barra de ferramentas aparece **inteira**, dentro de um dos monitores
8. `Ctrl+C`
9. Colar em qualquer editor de imagem
10. **Verificar:** o print contém os pedaços dos dois monitores, alinhados corretamente

### Roteiro B — Sem regressão em monitor único

1. Acionar seleção de área e selecionar uma região inteiramente dentro do monitor 1
2. Salvar com `Ctrl+S`
3. **Verificar:** enquadramento e nitidez idênticos aos de antes da feature
4. **Verificar:** as dimensões do arquivo batem com as do indicador de tamanho

### Roteiro C — Região vazia (RN-04)

1. Configurar monitores com alturas diferentes (ex.: 1440p e 1080p lado a lado)
2. Selecionar uma área que inclua a faixa vazia abaixo do monitor menor
3. **Verificar:** a região sem monitor aparece **preta** no print, sem artefato ou imagem duplicada

### Roteiro D — Monitor à esquerda do primário

1. Nas configurações de vídeo do Windows, posicionar o monitor 2 **à esquerda** do primário
2. Acionar seleção de área e arrastar do monitor 2 para o primário
3. **Verificar:** o overlay cobre os dois e a seleção atravessa normalmente
4. **Verificar:** o print sai na ordem correta (conteúdo do monitor 2 à esquerda)

### Roteiro E — DPI misto (RN-05)

1. Configurar o monitor 1 em 150% e o monitor 2 em 100%
2. Selecionar área atravessando os dois
3. **Verificar:** o overlay fica alinhado ao conteúdo real das telas (sem deslocamento do cursor)
4. **Verificar:** o texto do monitor de maior DPI permanece nítido no print

### Roteiro F — Toolbar em posições difíceis (RN-10)

1. Selecionar uma área colada na **borda inferior** do monitor 2 → **verificar:** toolbar aparece acima, dentro do monitor 2
2. Selecionar uma área colada na **borda direita** do monitor 2 → **verificar:** toolbar não sai da tela
3. Selecionar uma área que ocupe quase todo um monitor → **verificar:** toolbar aparece dentro da seleção, clicável

### Roteiro G — Cancelamento e modos preservados

1. Acionar seleção de área e pressionar `Esc` → **verificar:** os dois monitores voltam ao normal, sem janela residual
2. Acionar o atalho **tela inteira** → **verificar:** captura apenas o monitor sob o cursor (RN-07)
3. Acionar o atalho **todas as telas** → **verificar:** comportamento inalterado (RN-08)
4. Abrir a galeria de sequência e re-editar um item → **verificar:** comportamento inalterado (RN-12)

### Roteiro H — Performance (RNF-01, RNF-02, RNF-04)

1. Acionar a seleção de área e cronometrar até o escurecimento das telas → **verificar:** abaixo de ~0,6 s
2. Arrastar rapidamente atravessando os monitores → **verificar:** o retângulo acompanha sem engasgo perceptível
3. **Verificar:** no Gerenciador de Tarefas, o consumo do processo de overlay não dispara a ponto de travar a máquina

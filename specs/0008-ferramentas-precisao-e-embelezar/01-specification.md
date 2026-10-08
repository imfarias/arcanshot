# 0008 — Ferramentas de Precisão e Embelezamento para Compartilhar

**Data:** 2026-08-26 · **Autor:** arc-requisito (via arc-specfull)
**Status:** Em andamento

---

## 1. Contexto e Motivação

O editor do ArcanShot tem 8 ferramentas de anotação (retângulo, elipse, seta, linha, marcador, desfoque, texto, numeração) e exporta a seleção crua. Três lacunas aparecem no uso diário:

1. **Não dá para mirar em pixel.** A seleção é feita "no olho": não há zoom, não há coordenadas, não há leitura da cor sob o cursor. Quem trabalha com interface precisa constantemente saber *que cor é aquela* — e hoje precisa capturar, salvar e abrir noutro programa para descobrir.
2. **Faltam duas ferramentas básicas.** Não há desenho à mão livre, e não há tarja opaca. O desfoque atual **pixeliza** (`pixelateRegion` em `editor.ts`), o que reduz mas não elimina a informação — texto pixelizado em bloco grande pode ser parcialmente recuperado. Para dado sensível de verdade (token, CPF, e-mail) o correto é tapar.
3. **O print sai cru.** Ao mandar uma captura para outra pessoa, ela chega como um retângulo solto, sem respiro, colado no fundo do chat. Ferramentas de compartilhamento modernas resolvem isso com margem, cantos arredondados, sombra e um fundo — o que torna o print legível e apresentável sem editor externo.

---

## 2. Objetivo

Entregar quatro capacidades no editor de captura:

| # | Capacidade |
|---|---|
| A | **Lupa + conta-gotas** — ampliação dos pixels sob o cursor, com coordenadas e cor em hexadecimal; clicar captura a cor |
| B | **Traço livre** — desenho à mão livre com a cor e espessura atuais |
| C | **Tarja sólida** — retângulo opaco para ocultar dado sensível de forma irreversível |
| D | **Embelezar** — margem, cantos arredondados, sombra e fundo aplicados na exportação, com preview ao vivo e preferências lembradas |

---

## 3. Atores

| Ator | Papel |
|---|---|
| Usuário | Seleciona a área, mira com a lupa, anota e escolhe o acabamento antes de copiar/salvar |
| Editor (renderer) | Amplia pixels, lê cores, desenha anotações e compõe a imagem final |
| App (main process) | Persiste as preferências de embelezamento e escreve a cor no clipboard |

---

## 4. Fluxos Principais

**FP-1 — Mirar com a lupa e capturar uma cor:**
1. Usuário aciona a captura de área
2. Ao mover o cursor, uma lupa acompanha o ponteiro mostrando os pixels ampliados, uma cruz no pixel exato, as coordenadas e o hexadecimal da cor
3. Usuário arrasta e solta a seleção → entra em edição, a lupa desaparece
4. Usuário escolhe a ferramenta **conta-gotas** → a lupa reaparece
5. Usuário clica sobre a cor desejada
6. A cor passa a ser a cor ativa das anotações **e** o hexadecimal vai para o clipboard
7. Uma notificação confirma a cor copiada

**FP-2 — Desenhar à mão livre:**
1. Em modo de edição, usuário escolhe **traço livre**
2. Pressiona o botão e move o mouse; o traço acompanha o movimento em tempo real
3. Ao soltar, o traço vira uma anotação (sujeita a desfazer/refazer como qualquer outra)

**FP-3 — Tapar dado sensível:**
1. Em modo de edição, usuário escolhe **tarja sólida**
2. Arrasta sobre a região sensível
3. A região fica coberta por retângulo **totalmente opaco** na cor ativa
4. Ao soltar, vira anotação desfazível

**FP-4 — Embelezar antes de compartilhar:**
1. Em modo de edição, usuário clica no botão **✨**
2. Abre um painel com: miniatura de preview, fundos disponíveis, controle de margem, cantos arredondados e sombra
3. Cada ajuste atualiza a miniatura imediatamente
4. Usuário copia (`Ctrl+C`) ou salva (`Ctrl+S`) → a imagem sai com o acabamento escolhido
5. Na próxima captura, o painel já vem com as mesmas preferências

---

## 5. Fluxos Alternativos

**FA-1 — Conta-gotas sobre região sem imagem:** em layout multi-monitor com região vazia (preta), a cor lida é a do preenchimento (`#000000`). Comportamento normal, sem erro.

**FA-2 — Lupa junto às bordas:** ao aproximar o cursor da borda da tela, a lupa é reposicionada para o lado oposto do cursor, permanecendo inteiramente visível.

**FA-3 — Fundo transparente com formato JPG:** JPG não suporta transparência. Quando o fundo escolhido é "nenhum", a exportação usa **PNG** independentemente do formato configurado.

**FA-4 — Embelezar na re-edição da galeria:** um item da galeria já é resultado de uma exportação; embelezar de novo criaria moldura sobre moldura. No modo de re-edição o botão ✨ **não é oferecido**.

**FA-5 — Falha ao salvar as preferências:** se a persistência falhar, o ajuste continua valendo para a captura atual e o erro é silencioso (não interrompe o fluxo de captura).

**FA-6 — Traço livre com clique sem arrasto:** um clique único sem movimento não gera anotação (evita pontos acidentais).

---

## 6. Regras de Negócio

### Lupa e conta-gotas
| # | Regra |
|---|---|
| RN-01 | A lupa aparece durante a **seleção de área** e durante a edição **enquanto o conta-gotas estiver ativo** |
| RN-02 | A lupa mostra: pixels ampliados sem suavização, cruz no pixel central, coordenadas em pixels da imagem e cor em `#RRGGBB` maiúsculo |
| RN-03 | A lupa nunca cobre o cursor nem sai da área visível (reposiciona-se perto das bordas) |
| RN-04 | O clique com o conta-gotas define a cor ativa das anotações **e** copia o hexadecimal para o clipboard |
| RN-05 | O conta-gotas não cria anotação alguma |
| RN-06 | A cor lida é a da imagem capturada (não da máscara escura do overlay) |

### Traço livre
| # | Regra |
|---|---|
| RN-07 | O traço usa a cor e a espessura ativas no momento do desenho |
| RN-08 | O traço acompanha o movimento em tempo real e é suavizado (sem cantos angulosos) |
| RN-09 | Traço com menos de 2 pontos distintos é descartado |
| RN-10 | O traço é uma anotação como as outras: entra em desfazer/refazer e é exportado |

### Tarja sólida
| # | Regra |
|---|---|
| RN-11 | A tarja é um retângulo **100% opaco** — nenhuma informação do que está embaixo permanece na imagem exportada |
| RN-12 | A tarja usa a cor ativa; o preto é o padrão sugerido |
| RN-13 | Tarja menor que o mínimo (mesmo critério do desfoque) é descartada |
| RN-14 | A tarja é desfazível como anotação, mas uma vez exportada a informação coberta não é recuperável |

### Embelezar
| # | Regra |
|---|---|
| RN-15 | O embelezamento é aplicado **na exportação** (copiar, salvar, salvar como) — nunca altera a captura original nem a seleção |
| RN-16 | A miniatura de preview reflete fielmente o resultado final, em escala reduzida |
| RN-17 | Margem, raio dos cantos e sombra são **proporcionais** ao tamanho da captura, para que o resultado pareça igual em prints grandes e pequenos |
| RN-18 | Fundo "nenhum" produz transparência e **força o formato PNG** (RN de FA-3) |
| RN-19 | As preferências (ligado/desligado, fundo, margem, cantos, sombra) são persistidas e reaplicadas nas capturas seguintes |
| RN-20 | Falha ao persistir não interrompe a captura |
| RN-21 | O embelezamento não é oferecido no modo de re-edição da galeria |
| RN-22 | Com o embelezamento desligado, a imagem exportada é **byte-a-byte equivalente** à de antes desta feature |

---

## 7. Interface / Experiência

**Barra de ferramentas** ganha 3 ferramentas e 1 ação:

| Controle | Ícone | Posição |
|---|---|---|
| Traço livre | ✎ | Grupo de ferramentas, após "linha" |
| Tarja sólida | █ | Grupo de ferramentas, junto ao desfoque |
| Conta-gotas | ◉ | Grupo de ferramentas, ao final |
| Embelezar | ✨ | Grupo de ações, antes de copiar |

**Lupa:** quadro flutuante de ~140 px junto ao cursor, com borda clara, os pixels ampliados (~8×), cruz central e duas linhas de texto (`x, y` e `#RRGGBB`).

**Painel de embelezar:** abre ancorado ao botão ✨, contendo:
- Miniatura de preview (máx. ~260 px de largura)
- Fundos: amostras clicáveis, incluindo a opção "nenhum" (transparente)
- Margem: controle deslizante
- Cantos arredondados: caixa de seleção
- Sombra: caixa de seleção
- Interruptor geral ligado/desligado

**Sem alteração na tela de Configurações.** As preferências de embelezamento são editadas no próprio painel e persistidas de forma transparente.

---

## 8. Estados

| Estado | Descrição |
|---|---|
| Seleção com lupa | Arrastando a seleção, lupa seguindo o cursor |
| Edição | Ferramentas disponíveis; lupa só com conta-gotas ativo |
| Painel aberto | Painel de embelezar visível, preview atualizando a cada ajuste |
| Embelezamento desligado | Painel acessível, mas exportação sem acabamento (RN-22) |

---

## 9. Mensagens ao Usuário

| Situação | Mensagem |
|---|---|
| Cor capturada | `Cor #RRGGBB copiada` (notificação, respeitando a preferência de notificações) |
| Falha ao persistir preferências | Nenhuma — silencioso (FA-5) |

---

## 10. Acessibilidade

- Todos os botões novos com `aria-label` descritivo e `aria-pressed` quando alternáveis
- O painel de embelezar é navegável por teclado; controles com `label` associado por `id`
- A caixa de seleção e o deslizante expõem seus valores a leitores de tela
- A lupa é decorativa e informativa por natureza visual: recebe `aria-hidden`, e a informação de cor chega ao usuário por outro caminho (notificação ao copiar)
- O contraste dos textos da lupa e do painel atende AA
- `jest-axe` sem violações sérias/críticas nos componentes novos

---

## 11. Requisitos Não-Funcionais

| # | Requisito |
|---|---|
| RNF-01 | A lupa não pode degradar o arrasto: alvo de 16 ms por quadro mantido (meta da 0007) |
| RNF-02 | A leitura de cor não deve provocar leitura de pixels do canvas grande a cada movimento do mouse |
| RNF-03 | O preview do painel deve responder em menos de ~100 ms a cada ajuste |
| RNF-04 | Nenhuma dependência nova de terceiros |

---

## 12. Fora de Escopo

- Editar/mover anotação já criada (feature própria, discutida à parte)
- Paleta de cores recentes / histórico de cores capturadas
- Fundos personalizados por imagem ou upload de fundo
- Exportar com moldura de janela (barra de título falsa, estilo macOS)
- Marca d'água
- Borracha para apagar parte de um traço livre

---

## 13. Critérios de Sucesso

1. É possível descobrir a cor de qualquer pixel da tela sem sair do ArcanShot
2. Dado sensível pode ser tapado de forma irreversível
3. Um print pode ser deixado apresentável para compartilhar sem editor externo
4. Nenhuma regressão nas 8 ferramentas existentes nem na exportação sem embelezamento

---

## 14. Dúvidas em Aberto

*(Resolvidas com o usuário no checkpoint da Etapa 0)*

| # | Dúvida | Resolução |
|---|---|---|
| 1 | Como o embelezar aparece na interface? | **Painel com preview ao vivo**, aberto pelo botão ✨ |
| 2 | As preferências persistem? | **Sim, em `settings.json`** |
| 3 | O que o conta-gotas faz com a cor? | **Define a cor ativa e copia o hexadecimal** |
| 4 | Quando a lupa aparece? | **Sempre durante a seleção de área** (+ com conta-gotas ativo) |

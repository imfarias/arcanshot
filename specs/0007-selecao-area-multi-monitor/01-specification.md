# 0007 — Seleção de Área Atravessando Múltiplos Monitores

**Data:** 2026-08-26 · **Autor:** arc-requisito (via arc-specfull)
**Status:** Em andamento

---

## 1. Contexto e Motivação

No modo de captura **"seleção de área"** (`mode: 'area'`), o ArcanShot abre **uma janela overlay por monitor**, cada uma exibindo apenas a imagem congelada do seu próprio display. Como cada overlay é uma janela independente, o gesto de arrasto do mouse pertence a uma única janela: ao chegar na borda do monitor, a seleção é travada (`clampRectToBounds` limita ao canvas daquele display) e o retângulo não continua no monitor vizinho.

O usuário relatou: *"quando tiro print com seleção de área, não consigo selecionar parte de 2 monitores"*. É um cenário real e frequente — janelas lado a lado, planilha esticada entre telas, comparação de dois documentos abertos em monitores diferentes.

Hoje a única saída é o modo **"todas as telas"** (`mode: 'all'`), que captura o conjunto inteiro sem permitir recorte fino, obrigando o usuário a recortar depois em outro programa.

Esta feature reverte a **Decisão Arquitetural #4** (`ARCHITECTURE.md` §14): *"Seleção de área limitada a 1 display por vez — seleção cruzando monitores fica p/ v2"*.

---

## 2. Objetivo

Permitir que, no modo de seleção de área, o usuário arraste um retângulo **contínuo através de todos os monitores conectados**, obtendo um print único que combina os pedaços de cada tela na posição correta, respeitando o layout físico configurado no Windows.

---

## 3. Atores

| Ator | Papel |
|---|---|
| Usuário | Aciona a captura por atalho/tray e arrasta a seleção atravessando telas |
| App (main process) | Cria a superfície de seleção que cobre todos os monitores e entrega as capturas |
| Sistema Operacional | Define o layout dos monitores (posição relativa, resolução, escala/DPI) |

---

## 4. Fluxo Principal

**FP-1 — Seleção atravessando dois monitores:**
1. Usuário aciona a captura de área (atalho global ou item da bandeja)
2. O app congela a imagem de todos os monitores e exibe **uma única superfície de seleção** que cobre a área total ocupada pelas telas, escurecida
3. Usuário pressiona o botão do mouse no monitor A e arrasta até o monitor B, sem interrupção ao cruzar a borda
4. O retângulo claro acompanha o cursor continuamente, atravessando a fronteira entre as telas
5. O indicador de tamanho mostra as dimensões totais da seleção
6. Ao soltar o botão, o app entra em modo de edição com a seleção composta já definida
7. Usuário anota (opcional) e copia (`Ctrl+C`), salva (`Ctrl+S`) ou salva como (`Ctrl+Shift+S`)
8. A imagem resultante contém os pedaços dos dois monitores lado a lado, na posição relativa correta

**FP-2 — Seleção dentro de um único monitor (comportamento preservado):**
1. Idêntico a FP-1, mas o arrasto começa e termina no mesmo monitor
2. O resultado é indistinguível do comportamento atual — mesmo enquadramento, mesma resolução, mesma nitidez

---

## 5. Fluxos Alternativos

**FA-1 — Seleção cobre região sem monitor (gap de layout):**
Monitores de alturas ou resoluções diferentes deixam regiões vazias dentro do retângulo que une as telas (ex.: monitor 1080p ao lado de um 1440p deixa uma faixa vazia embaixo).
- A seleção **pode** cobrir essas regiões livremente (sem travas de mouse)
- No print final, a região vazia aparece **preta** — mesmo comportamento já adotado no modo "todas as telas" (RN10 da feature 0001)

**FA-2 — Monitores com DPI/escala diferentes:**
- O print composto é gerado na **maior escala entre os monitores**
- O monitor de menor densidade é ampliado para casar geometricamente; o de maior densidade preserva a nitidez original

**FA-3 — Um único monitor conectado:**
- Comportamento exatamente igual ao atual; a superfície de seleção cobre a única tela

**FA-4 — Cancelamento:**
- `Esc` ou botão Cancelar fecha a superfície inteira de uma vez, sem sobra de janela em nenhum monitor

**FA-5 — Arrasto pequeno demais:**
- Arrasto abaixo do mínimo (4 DIP) é ignorado e a seleção descartada, permanecendo em modo de seleção (RN9 da 0001, preservada)

---

## 6. Regras de Negócio

| # | Regra |
|---|---|
| RN-01 | No modo de área, a seleção pode iniciar em qualquer monitor e terminar em qualquer outro, sem travamento nas bordas |
| RN-02 | A área selecionável total é o retângulo que envolve todos os monitores conectados (união dos limites) |
| RN-03 | Cada pedaço de tela aparece no print na sua posição relativa real, conforme o layout do Windows |
| RN-04 | Regiões dentro da seleção que não pertencem a nenhum monitor são preenchidas de **preto** |
| RN-05 | O print composto usa a **maior escala (DPI)** entre os monitores; monitores de menor escala são ampliados |
| RN-06 | Seleção contida em um único monitor produz resultado equivalente ao comportamento anterior (sem regressão de nitidez ou enquadramento) |
| RN-07 | O modo "tela inteira" (`full`) permanece inalterado: captura apenas o monitor sob o cursor |
| RN-08 | O modo "todas as telas" (`all`) permanece inalterado e disponível como atalho de captura total sem arrasto |
| RN-09 | Cancelar encerra a captura por completo — nenhuma superfície residual em qualquer monitor |
| RN-10 | A barra de ferramentas de edição deve permanecer **inteiramente visível dentro de um monitor real**, nunca sobre região vazia nem partida entre duas telas |
| RN-11 | O indicador de tamanho exibe as dimensões da seleção em pixels da imagem final |
| RN-12 | A re-edição de itens da galeria (`redit`) permanece inalterada |

---

## 7. Interface / Experiência

**Tela de seleção (modo área):**
- Superfície escurecida cobrindo **todos os monitores simultaneamente**
- Cursor em cruz (`crosshair`) em qualquer ponto de qualquer monitor
- Retângulo de seleção com borda tracejada branca, contínuo ao cruzar telas
- Indicador de dimensões junto ao canto superior esquerdo da seleção
- Ao soltar: alças de redimensionamento nos 8 pontos e barra de ferramentas

**Barra de ferramentas:**
- Posicionada abaixo da seleção quando couber; acima caso contrário
- **Novo:** o cálculo de posição considera os limites do **monitor onde está o canto da seleção**, não a superfície inteira — evita a barra cair em faixa preta ou aparecer partida entre monitores

**Sem novos controles e sem novas configurações.** A feature não adiciona campo algum à tela de Configurações.

---

## 8. Estados

| Estado | Descrição |
|---|---|
| Carregando | Superfície criada, imagens dos monitores ainda sendo compostas |
| Seleção | Superfície escura sobre todos os monitores, aguardando arrasto |
| Edição | Seleção definida (podendo abranger vários monitores), ferramentas disponíveis |
| Cancelado | Superfície fechada, nenhuma imagem produzida |

---

## 9. Mensagens ao Usuário

Nenhuma mensagem nova. As notificações existentes de cópia/salvamento permanecem idênticas.

---

## 10. Acessibilidade

- Preservados todos os atalhos de teclado do editor: `Esc`, `Ctrl+C`, `Ctrl+S`, `Ctrl+Shift+S`, `Ctrl+Z`, `Ctrl+Y`
- A barra de ferramentas permanece com `role="toolbar"`, navegação por setas e `aria-label` em todos os botões-ícone
- RN-10 é também requisito de acessibilidade: barra parcialmente fora de tela é inoperável por mouse

---

## 11. Requisitos Não-Funcionais

| # | Requisito |
|---|---|
| RNF-01 | Superfície de seleção visível em < 600 ms após o atalho (mantém a meta da 0002) |
| RNF-02 | Arrasto fluido (< 16 ms por frame) mesmo com a composição de 2–4 monitores |
| RNF-03 | Suporte a 1–4 monitores com escalas distintas |
| RNF-04 | Consumo de memória do overlay não deve inviabilizar a captura em layout 2× 4K |

---

## 12. Fora de Escopo

- Seleção por janela específica (window picker)
- Captura com rolagem (scrolling capture)
- Remoção do modo "todas as telas"
- Recorte automático das faixas pretas em layouts irregulares
- Configuração da cor da região vazia

---

## 13. Critérios de Sucesso

1. Usuário consegue, em um único gesto, selecionar uma área que começa no monitor 1 e termina no monitor 2
2. O print resultante mostra o conteúdo dos dois monitores alinhado corretamente
3. Nenhuma regressão nas capturas de monitor único
4. Barra de ferramentas sempre clicável, em qualquer posição da seleção

---

## 14. Dúvidas em Aberto

*(Resolvidas com o usuário no checkpoint da Etapa 0)*

| # | Dúvida | Resolução |
|---|---|---|
| 1 | Como tratar regiões sem monitor dentro da seleção? | **Preencher de preto** — coerente com o modo "todas as telas" já existente |
| 2 | Qual resolução usar com DPI misto? | **Maior escala entre as telas** — preserva nitidez; a captura já é feita nesse tamanho hoje |
| 3 | Manter o modo "todas as telas"? | **Sim, inalterado** — continua útil como captura total de 1 clique |

# 0011 — Captura de Janela por Ctrl+clique

**Data:** 2026-10-13 · **Autor:** arc-requisito (via arc-specfull)
**Status:** Aprovado
**Relacionada a:** 0001 (captura de área), 0007 (multi-monitor)

## 1. Contexto e Objetivo

Para capturar um aplicativo inteiro hoje é preciso arrastar o retângulo à mão, acertando as bordas. O pedido: apertar PrintScreen e, **na hora de selecionar a área**, segurar **Ctrl** para escolher uma janela aberta; o clique a captura inteira.

## 2. Atores
Usuário; main process (lista as janelas); editor de captura (destaque e seleção).

## 3. Pré-condições
Windows; captura de área iniciada (`PrintScreen` ou o atalho configurado) e overlay na fase de seleção.

## 4. Fluxo Principal
1. O usuário aperta `PrintScreen`. A tela congela e a seleção de área abre; no topo aparece a dica "Segure Ctrl e clique numa janela para capturá-la inteira".
2. Segurando `Ctrl`, a janela sob o mouse é destacada: fora dela a tela escurece, com contorno azul e a etiqueta "título · largura × altura".
3. Mover o mouse com `Ctrl` pressionado troca o destaque para a janela de cima sob o cursor.
4. `Ctrl+clique` seleciona o retângulo da janela e abre o editor, como se a área tivesse sido arrastada.
5. Daí em diante vale tudo da edição: ajustar a seleção pelas alças, anotar, embelezar, copiar, salvar.

## 5. Fluxos Alternativos
- **FA-1 — Sem Ctrl:** o arrasto de área funciona exatamente como antes.
- **FA-2 — Ctrl+clique fora de qualquer janela:** vira arrasto de área normal.
- **FA-3 — Soltar o Ctrl:** o destaque some; a seleção por arrasto segue.
- **FA-4 — Lista de janelas indisponível** (falha nativa, sem Windows): sem dica e sem destaque; o resto do app funciona normalmente.
- **FA-5 — Janela parcialmente fora da tela ou entre monitores:** o retângulo é recortado ao que está na tela.
- **FA-6 — Esc:** cancela como sempre.

## 6. Tela(s)

Sem tela nova; elementos dentro do overlay:

| # | Elemento | Texto | Tipo | Obrigatório | Acessibilidade | Observações |
|---|---|---|---|---|---|---|
| 1 | Dica | "Segure Ctrl e clique numa janela para capturá-la inteira" | nota | Não | `role="note"`, `data-testid="editor-window-hint"` | Topo e centro do monitor do cursor; some com Ctrl pressionado, ao selecionar ou sem lista de janelas |
| 2 | Etiqueta da janela | "{título} · {L} × {A}" | rótulo | Não | `data-testid="editor-window-label"` | Azul de seleção; título truncado com reticências; medida em px da imagem |
| 3 | Contorno da janela | — | desenho no canvas | Não | — | Azul cheio (o tracejado branco significa "selecionado") |

### Estados
Ocioso (dica) → Ctrl pressionado sobre janela (destaque, sem lupa) → selecionado (edição normal).

## 7. Regras de Negócio
- **RN-01:** só há captura de janela na fase de seleção do modo "Capturar área".
- **RN-02:** vale a janela de cima no empilhamento sob o cursor.
- **RN-03:** o retângulo é a borda visível da janela (sem as bordas invisíveis de redimensionamento do Windows).
- **RN-04:** o print contém o que está **visível na tela**: se outra janela cobre parte da escolhida, essa parte aparece (decisão do usuário, 2026-10-13).
- **RN-05:** não são alvos: área de trabalho, barras de tarefas, janelas sem título, janelas de ferramenta, janelas que não ativam (dicas de overlays), janelas que deixam o clique passar, janelas minimizadas ou ocultas, janelas menores que 40 px.
- **RN-06:** a lista é um instantâneo do momento em que a captura começa (a mesma da imagem congelada).
- **RN-07:** a lupa não aparece enquanto uma janela está em destaque.
- **RN-08:** o retângulo selecionado é editável como qualquer seleção (alças, mover).

## 8. Permissões
Usuário local único. Nenhuma permissão extra do Windows.

## 9. Dados
Lista de janelas `{ x, y, largura, altura, título }` em memória, repassada ao overlay; nada é gravado.

## 10. Requisitos Não-Funcionais
- Listar janelas não pode atrasar o atalho de forma perceptível (alvo: poucos ms).
- Falha nativa nunca derruba a captura (recurso degrada para "desligado").
- Funciona em monitores com DPI misto.

## 11. Dependências
Feature 0007; biblioteca `koffi` (binário pré-compilado, N-API) para chamar `user32`/`dwmapi`.

## 12. Fora de Escopo
Capturar a janela inteira quando coberta por outra; janelas minimizadas; capturar o conteúdo interno (um controle ou painel dentro da janela); Ctrl+clique nos modos "tela atual" e "todos os monitores"; outros sistemas operacionais.

## 13. Glossário
**Janela candidata:** janela destacada pelo Ctrl sob o cursor. **Borda visível:** retângulo do quadro da janela sem as margens invisíveis.

## 14. Dúvidas em Aberto
Nenhuma. Decisões do usuário em 2026-10-13: conteúdo = o visível na tela; posição das janelas via koffi; Ctrl destaca e Ctrl+clique captura (clique simples não captura janela).

# 0009 — Páginas do PDF com o Mesmo Tamanho

**Data:** 2026-10-09 · **Autor:** arc-requisito (via arc-specfull)
**Status:** Aprovado
**Relacionada a:** 0005 (Sequência de Capturas com Galeria)

---

## 1. Contexto e Objetivo

Na sequência de capturas (feature 0005), o botão **Gerar PDF** cria uma página por print, cada uma com o tamanho exato do print. Como cada recorte tem um tamanho diferente, o PDF fica irregular: ao rolar, as páginas mudam de largura e altura, o leitor de PDF reajusta o zoom a cada página e a impressão sai desencontrada.

**Objetivo:** oferecer a opção **"Padronizar tamanho dos prints"**. Ligada, todas as páginas do PDF passam a ter o mesmo tamanho: o da maior captura da sequência. Cada print é centralizado na página e só é reduzido quando não cabe, nunca esticado nem distorcido; o espaço que sobra fica branco.

## 2. Atores

| Ator | Papel |
|---|---|
| Usuário | Liga/desliga a opção na galeria ou em Configurações e gera o PDF |
| Main process | Monta o PDF respeitando a opção |
| Renderer (galeria, configurações) | Exibe e persiste a opção |

## 3. Pré-condições

- Uma sequência com 2 ou mais capturas foi detectada e a galeria está aberta (0005), **ou** o usuário está na janela de Configurações.

## 4. Fluxo Principal — Gerar PDF padronizado

1. Na galeria, o usuário marca **"Páginas do mesmo tamanho"** (ao lado de *Gerar PDF*).
2. A escolha é salva nas configurações imediatamente (vale para as próximas sequências).
3. O usuário clica **Gerar PDF** → escolhe onde salvar.
4. O sistema calcula o tamanho de página: o da captura de **maior área** da sequência.
5. Para cada captura, na ordem da galeria, cria uma página desse tamanho, com fundo branco, e desenha o print centralizado — no tamanho original se couber; reduzido proporcionalmente se for maior que a página em alguma dimensão.
6. O PDF é salvo e a galeria mostra "PDF salvo em {caminho}" (mensagem existente).

## 5. Fluxos Alternativos

- **FA-1 — Opção desligada (padrão):** comportamento atual inalterado — cada página com o tamanho exato do seu print.
- **FA-2 — Ligar/desligar em Configurações:** a opção aparece no grupo *Comportamento* e é salva com o botão *Salvar*, como os demais campos. A galeria aberta depois disso já nasce com o valor salvo.
- **FA-3 — Falha ao salvar a preferência pela galeria:** a opção continua marcada na tela e o PDF gerado nesta galeria respeita o que está marcado; nenhuma mensagem de erro bloqueia o uso (a persistência é melhor-esforço, como no embelezar da 0008).
- **FA-4 — Todas as capturas do mesmo tamanho:** o resultado é idêntico ao FA-1.
- **FA-5 — Cancelar a escolha do arquivo / erro ao gravar:** comportamento existente da 0005 (cancelar não mostra nada; erro mostra a mensagem do erro).

## 6. Tela(s)

### 6.1 Galeria — rodapé

Ao lado esquerdo da barra de ações, antes do grupo *Salvar todas / Gerar PDF*, uma caixa de seleção com rótulo visível. Não altera *Salvar todas*.

### 6.2 Configurações — grupo Comportamento

Nova caixa de seleção logo após "Tempo entre prints na sequência", com texto de ajuda.

### 6.3 Campos

| # | Campo | Label | Tipo | Tamanho/Máscara | Obrigatório | Default | Validação | Acessibilidade | Observações |
|---|---|---|---|---|---|---|---|---|---|
| 1 | pdfUniformSize (galeria) | Páginas do mesmo tamanho | checkbox | — | Não | valor salvo em configurações | booleano | `id` estável + `label[for]`; `title` explicando o efeito; foco visível | Persiste ao mudar; vale para o próximo *Gerar PDF* |
| 2 | pdfUniformSize (configurações) | Padronizar o tamanho das páginas do PDF da sequência | checkbox | — | Não | desligado | booleano | `id="pdfUniformSize"` + `label[for]`; `aria-describedby` → ajuda | Ajuda: "Todas as páginas ficam do tamanho da maior captura. As menores ficam centralizadas, sem esticar." |

### 6.4 Estados

- Galeria carregando: a opção não aparece (estado de carregamento existente).
- Galeria ocupada (salvando/gerando): a opção fica desabilitada junto dos botões, para o PDF em andamento não mudar de regra no meio.

### 6.5 Mensagens

Nenhuma mensagem nova. Reaproveita "PDF salvo em {caminho}" e as mensagens de erro existentes.

## 7. Regras de Negócio

- **RN-01:** com a opção ligada, todas as páginas têm exatamente o mesmo tamanho.
- **RN-02:** o tamanho da página é o da captura de maior área (largura × altura). Empate: a primeira na ordem da galeria.
- **RN-03:** o print nunca é ampliado nem distorcido: escala = mín(1, larguraPágina/larguraPrint, alturaPágina/alturaPrint), aplicada igual nos dois eixos.
- **RN-04:** o print é centralizado na página nos dois eixos; o espaço restante é branco.
- **RN-05:** a ordem das páginas é a ordem da galeria (inalterada).
- **RN-06:** a opção vale **só para o PDF**; *Salvar todas* continua gravando as imagens no tamanho original.
- **RN-07:** opção desligada por padrão; quem já usa o app não vê mudança até optar.
- **RN-08:** o valor da galeria e o de Configurações são o mesmo dado (uma preferência só).

## 8. Permissões

Usuário local único; sem controle de acesso.

## 9. Dados

- **Entrada:** lista de capturas da sessão (dataUrl PNG/JPG, com largura e altura intrínsecas) e a opção (booleano).
- **Saída:** arquivo PDF; preferência `pdfUniformSize` persistida em `settings.json`.

## 10. Requisitos Não-Funcionais

- Sem perda de qualidade: imagens embutidas na resolução original (a redução é só de desenho na página).
- Geração do PDF padronizado no mesmo tempo da atual (ordem de grandeza): sem reprocessar pixels.
- Acessibilidade WCAG 2.1 AA nas duas telas (axe sem violações).

## 11. Dependências

- Feature 0005 (galeria, `gallery:export-pdf`), `pdf-lib` já presente.

## 12. Fora de Escopo

- Tamanhos de página fixos (A4, Carta), orientação, margens configuráveis, cor de fundo.
- Ampliar prints pequenos para preencher a página.
- Padronizar as imagens de *Salvar todas*.

## 13. Glossário Específico

- **Página padronizada:** página do PDF com o tamanho comum definido pela RN-02.
- **Maior captura:** a de maior área (largura × altura) na sequência.

## 14. Dúvidas em Aberto

Nenhuma. Decididas com o usuário em 2026-10-09: método "página da maior captura", opção na galeria + Configurações, só no PDF.

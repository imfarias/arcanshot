---
name: ArcanShot
description: O site como uma captura em andamento — tela sob o véu, a área que importa selecionada, iluminada e anotada.
colors:
  veil: "#0f0f13"
  screen-wallpaper: "#27272f"
  rule: "#26262e"
  chrome: "#18181b"
  chrome-line: "#3f3f46"
  chrome-text: "#e4e4e7"
  on-veil: "#ececf1"
  on-veil-2: "#c4c4cc"
  on-veil-nav: "#d4d4d8"
  muted: "#a1a1aa"
  paper: "#f8fafc"
  paper-white: "#ffffff"
  ink: "#0f172a"
  ink-2: "#475569"
  paper-rule: "#e2e8f0"
  key-line: "#cbd5e1"
  select: "#2563eb"
  select-hover: "#1d4ed8"
  select-soft: "#93c5fd"
  mark: "#ef4444"
  highlight: "rgba(250, 204, 21, 0.92)"
  size-label-bg: "rgba(17, 17, 17, 0.9)"
typography:
  display:
    fontFamily: "'Bricolage Grotesque Variable', 'Segoe UI Variable Display', 'Segoe UI', sans-serif"
    fontSize: "clamp(3rem, 6vw, 5.6rem)"
    fontWeight: 760
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "'Bricolage Grotesque Variable', 'Segoe UI Variable Display', 'Segoe UI', sans-serif"
    fontSize: "clamp(2.2rem, 4.4vw, 3.6rem)"
    fontWeight: 720
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  title:
    fontFamily: "'Bricolage Grotesque Variable', 'Segoe UI Variable Display', 'Segoe UI', sans-serif"
    fontSize: "clamp(1.9rem, 3.2vw, 2.7rem)"
    fontWeight: 720
    lineHeight: 1.06
    letterSpacing: "-0.028em"
  title-sm:
    fontFamily: "'Bricolage Grotesque Variable', 'Segoe UI Variable Display', 'Segoe UI', sans-serif"
    fontSize: "1.18rem"
    fontWeight: 620
    lineHeight: 1.35
  body:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  lead:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "clamp(1.1rem, 1.5vw, 1.3rem)"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.97rem"
    fontWeight: 600
    lineHeight: 1
  measure:
    fontFamily: "'Cascadia Mono', 'Cascadia Code', Consolas, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "\"tnum\""
rounded:
  code: "4px"
  label: "6px"
  control: "8px"
  control-lg: "10px"
  toolbar: "12px"
  full: "50%"
spacing:
  toolbar-gap: "4px"
  toolbar-pad: "6px"
  gutter: "16px"
  row: "22px"
  heading-gap: "44px"
  section: "clamp(80px, 10vw, 136px)"
  container: "min(1200px, 100% - 32px)"
components:
  button-primary:
    backgroundColor: "{colors.select}"
    textColor: "{colors.paper-white}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.select-hover}"
  button-primary-lg:
    backgroundColor: "{colors.select}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.control-lg}"
    padding: "0 28px"
    height: "56px"
  button-toolbar:
    backgroundColor: "transparent"
    textColor: "{colors.chrome-text}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-toolbar-hover:
    backgroundColor: "{colors.chrome-line}"
    textColor: "{colors.paper-white}"
  button-ghost:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  toolbar:
    backgroundColor: "{colors.chrome}"
    rounded: "{rounded.toolbar}"
    padding: "6px"
  selection-size-label:
    backgroundColor: "{colors.size-label-bg}"
    textColor: "{colors.paper-white}"
    typography: "{typography.measure}"
    rounded: "{rounded.label}"
    padding: "5px 8px"
  selection-handle:
    backgroundColor: "{colors.paper-white}"
    size: "10px"
  captured-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "0"
    padding: "clamp(20px, 3vw, 34px)"
  step-badge:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.full}"
    size: "30px"
  step-badge-active:
    backgroundColor: "{colors.select}"
    textColor: "{colors.paper-white}"
  step-tab-active:
    backgroundColor: "{colors.chrome}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.control-lg}"
    padding: "12px 14px"
  kbd:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    typography: "{typography.measure}"
    rounded: "{rounded.label}"
    padding: "4px 8px"
  input-copy:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
---

# Design System: ArcanShot

## Overview

**Creative North Star: "O site como uma captura"**

O site inteiro é o momento em que o ArcanShot está aberto sobre a tela: tudo o que não importa fica sob o véu escuro do overlay, e o que importa é *selecionado* — claro, nítido, com borda tracejada, alças nos cantos e a medida real em pixels. Não há uma "marca" sobreposta ao produto; o vocabulário visual é o próprio vocabulário do app: chrome de barra de ferramentas, retângulo vermelho de anotação, marcador amarelo, círculos de passo azuis.

A densidade é de ferramenta, não de vitrine: superfícies planas, linhas finas de 1px, raios pequenos, texto direto. A profundidade vem do contraste véu/papel, não de sombras ou brilhos. O sistema recusa explicitamente o template SaaS escuro: texto em degradê, grade de cards com ícone em ladrilho, brilhos coloridos.

**Key Characteristics:**
- Fundo é o véu (#0f0f13); conteúdo de prova vive em regiões "capturadas" claras dentro de uma moldura de seleção.
- A moldura de seleção (tracejado branco, alças brancas com borda azul, etiqueta `W × H` em mono) é a assinatura reutilizável.
- As cores de acento são as cores das ferramentas do app: azul de seleção, vermelho de anotação, amarelo de marcador.
- Display expressivo (Bricolage Grotesque) contra corpo nativo do Windows (Segoe UI Variable); mono só para medidas e teclas.
- Movimento raro e narrativo: a seleção é arrastada uma vez, as anotações são traçadas uma vez.

## Colors

Paleta de overlay: neutros quase pretos de um lado, papel frio de outro, e três cores de ferramenta usadas como ferramentas.

### Primary
- **Azul de Seleção** (select): a cor de agir. Botão principal (Baixar), borda das alças da seleção, círculo do passo ativo, `::selection` (a 55%). Hover escurece para **Azul de Seleção Profundo** (select-hover).
- **Azul Claro de Link** (select-soft): links sobre o véu, ícones da lista de contribuição, cursor de texto.

### Secondary
- **Vermelho de Anotação** (mark): o retângulo traçado em volta de "Anote." e o ícone de coração em "Apoie". Sempre como traço de anotação ou ícone, nunca como preenchimento de superfície.

### Tertiary
- **Amarelo Marcador** (highlight): a faixa de marca-texto sob "Capture." — uma faixa de 0.2em a 88% da altura, nunca um fundo de bloco.

### Neutral
- **Véu** (veil): fundo do site e `theme-color`; é literalmente o overlay do app sobre a tela.
- **Papel de Parede da Tela** (screen-wallpaper): fundo da "tela" no hero e nos rasters; sob o véu de 80% resulta exatamente no Véu.
- **Linha do Véu** (rule): divisórias de 1px entre itens de lista, FAQ e rodapé.
- **Chrome** (chrome) e **Borda de Chrome** (chrome-line): barra de ferramentas, aba de passo ativa, modal do vídeo, separadores, hover de botão de barra, scrollbar.
- **Texto de Chrome** (chrome-text): rótulos dos botões da barra e do modal.
- **Texto sobre o Véu** (on-veil), **Texto Secundário** (on-veil-2), **Texto de Navegação** (on-veil-nav) e **Esmaecido** (muted): títulos e corpo; o secundário é o corpo longo, o esmaecido é metadado (datas, versão, nota "Dados fictícios.").
- **Papel** (paper) e **Branco** (paper-white): regiões capturadas e superfícies de controle claras (kbd, input, botão fantasma, alças).
- **Tinta** (ink) e **Tinta Secundária** (ink-2): texto sobre papel; a secundária para rótulos (dt, th).
- **Linha do Papel** (paper-rule) e **Linha de Tecla** (key-line): divisórias dentro do papel; contorno de kbd, input e botão fantasma.

### Named Rules
**A Regra do Véu.** Todo fundo escuro é o véu. A tela do hero usa o papel de parede #27272f sob `rgba(9, 9, 12, 0.8)`, que dá exatamente #0f0f13: a borda entre a tela e o resto do site não pode aparecer, nem onde a imagem não cobre.

**A Regra das Ferramentas.** Acentos são as cores das ferramentas do app e têm o papel da ferramenta: azul seleciona e age, vermelho anota, amarelo marca. Nenhuma cor de acento vira fundo decorativo.

**A Regra do Roxo.** Roxo (#7c3aed) não entra no chrome do site. Aparece só no logo e dentro dos rasters, onde é o acento da interface fictícia retratada (gráfico, botão "Compartilhar") — conteúdo da captura, não do site.

## Typography

**Display Font:** Bricolage Grotesque Variable (auto-hospedada via @fontsource-variable, eixo opsz com `font-optical-sizing: auto`; fallback Segoe UI Variable Display, Segoe UI)
**Body Font:** Segoe UI Variable Text (com Segoe UI, system-ui)
**Label/Mono Font:** Cascadia Mono (com Cascadia Code, Consolas) — apenas medidas, teclas e código

**Character:** um display grotesco, apertado e pesado, que fala alto no véu, contra o corpo nativo do Windows que faz o site parecer parte do sistema onde o app roda.

### Hierarchy
- **Display** (760, clamp(3rem, 6vw, 5.6rem), 0.98, -0.035em): só o slogan do hero, uma palavra por linha, branco.
- **Headline** (720, clamp(2.2rem, 4.4vw, 3.6rem), 1.02, -0.03em): títulos de seção, máx. 20ch. Na dupla Contribua/Apoie desce para clamp(1.9rem, 3vw, 2.5rem).
- **Title** (720, clamp(1.9rem, 3.2vw, 2.7rem), 1.06, -0.028em): títulos das três razões.
- **Title pequeno** (620–650, 1.1–1.2rem, 1.2–1.35, display): perguntas do FAQ, nomes de release, abas de passo, itens de contribuição.
- **Body** (400, 1rem, 1.6): corpo; textos de razão a 1.1rem/1.65 com máx. 46ch, FAQ máx. 70ch. **Lead** do hero a clamp(1.1rem, 1.5vw, 1.3rem), máx. 34ch.
- **Label** (600, 0.97rem, 1): botões. Metadados a 0.88rem com algarismos tabulares.
- **Medida** (mono 600, 0.75rem, tabular): a etiqueta `W × H`; kbd a 0.8rem; input do Pix a 0.8rem/500.

### Named Rules
**A Regra da Mono Medida.** Cascadia Mono existe para números de máquina: medidas em pixels, teclas, caminhos e o código Pix. Nunca em títulos, rótulos ou texto corrido.

**A Regra do Display Nomeado.** Títulos usam a Bricolage auto-hospedada; nunca a face de sistema como display. Títulos sempre com `text-wrap: balance`.

## Layout

Container único de `min(1200px, 100% - 32px)`. Seções com respiro vertical de clamp(80px, 10vw, 136px) e títulos a 44px do conteúdo. O hero ocupa clamp(660px, 100svh, 940px) em grade 5fr/7fr (texto à esquerda no véu, seleção à direita); as razões alternam 5fr/6fr com o lado da prova invertido a cada item e espaçamento de clamp(88px, 10vw, 136px) entre elas. O antes/depois usa coluna de abas de 240px + moldura.

Listas (releases, FAQ, contribuição) não são cards: são linhas separadas por 1px de Linha do Véu com 18–22px de respiro, máx. 860px.

Em 960px tudo vira uma coluna; as abas de passo viram uma linha horizontal. Em 640px a barra de ferramentas ocupa a largura toda com o botão principal em linha própria, os dois primeiros links da navegação somem, kbd e atalhos empilham, e o QR do Pix desce para baixo do código. No hero estreito (<700px) a tela fictícia vira um "monitor" escurecido em volta da seleção em vez de cobrir tudo.

## Elevation & Depth

Plano por padrão. A profundidade é o contraste véu/papel: o que está "capturado" é claro e o resto está escurecido. Sombras existem só onde o objeto real as tem.

### Shadow Vocabulary
- **Barra flutuante** (`box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45)`): só a barra de ferramentas, que flutua sobre a tela como no app.
- **Amostra de fundo** (`box-shadow: 0 6px 14px rgba(15, 23, 42, 0.16)`): as amostras de preset do embelezar, imitando a sombra que o recurso aplica.
- **Tecla** (`box-shadow: inset 0 -2px 0 #cbd5e1`): o chanfro inferior do kbd.

### Named Rules
**A Regra Sem Brilho.** Nenhum glow colorido, nenhuma sombra em painéis capturados. O papel se destaca porque o véu está escuro, não porque flutua.

## Shapes

Geometria de ferramenta: regiões capturadas têm canto vivo (0px) — uma seleção é um retângulo. Controles têm raios pequenos: 4px (código inline), 6px (etiqueta de medida, kbd), 8px (botões, input, amostras), 10px (botão grande, aba de passo), 12px (barra de ferramentas, modal). Círculos só nos badges de passo. Linhas são de 1px; tracejado de 1.5px é exclusivo da moldura de seleção e do foco. Ícones SVG próprios em grade 24×24, traço 1.75, pontas e junções arredondadas; o GitHub é a marca oficial preenchida.

## Components

### Moldura de seleção (assinatura)
O retângulo do app em volta do que importa.
- **Borda:** tracejado de 1.5px em branco a 92%, em `inset: -1px`, acima do conteúdo.
- **Alças:** quatro quadrados de 10px, fundo branco, borda sólida de 1.5px em Azul de Seleção, deslocadas 6px para fora nos cantos.
- **Etiqueta de medida:** acima do canto superior esquerdo (9px de distância), fundo quase preto a 90%, texto branco em mono tabular, raio 6px. Mostra a medida real do elemento (`Math.round(w) × Math.round(h)`), atualizada por ResizeObserver; o HTML entrega `0 × 0` e é `aria-hidden`.
- **Tons:** claro (padrão) pinta o interior de Papel com texto Tinta e troca o foco para Tinta; escuro deixa o interior transparente (sobre o véu, sobre rasters).

### Painel capturado
Região de prova clara dentro de uma moldura de seleção: Papel, Tinta, canto vivo, padding clamp(20px, 3vw, 34px), linhas internas em Linha do Papel. Usado para configurações (dl), atalhos (tabela com kbd), presets, Pix e o fechamento.

### Barra de ferramentas (grupo de CTA)
O chrome do app como grupo de chamadas.
- **Container:** Chrome a 96%, borda 1px Borda de Chrome, raio 12px, padding 6px, gap 4px, sombra de barra flutuante. Separador vertical de 1px × 24px.
- **Botão de barra:** transparente, Texto de Chrome, 600, mín. 44px, raio 8px; hover Borda de Chrome + branco; 160ms ease-out.
- **Primário:** Azul de Seleção, branco; hover Azul Profundo. Variante grande 56px/raio 10px no fechamento. Ícone de 20–22px à esquerda.
- **Fantasma (sobre papel):** branco, Tinta, borda Linha de Tecla; hover #f1f5f9.
- **Ícone:** 40×40, para fechar o modal.

### Abas de passo e badges
Abas verticais (horizontais em telas estreitas) com rótulo em display 650. Badge de 30px circular, borda 2px #52525b e número Esmaecido; na aba ativa, fundo Azul de Seleção, borda branca, número branco — o mesmo círculo de passo da ferramenta de numeração. Aba ativa ganha fundo Chrome e borda Borda de Chrome, raio 10px.

### Teclas (kbd)
Branco, Tinta, borda 1px Linha de Tecla, raio 6px, chanfro inferior de 2px, mono 600 0.8rem. Combinações com gap de 4px; alternativas separadas por "ou".

### Campo (copiar Pix)
Branco, borda 1px Linha de Tecla, raio 8px, mono 500 0.8rem, somente leitura, com botão fantasma ao lado.

### Navegação
Logo (ícone 28px com raio 7px + "ArcanShot" em display 700) à esquerda; links em 500 Texto de Navegação, hover branco sublinhado. Sem barra de fundo: a navegação flutua no véu do hero.

### Anotações do título
"Capture." com faixa de marcador amarelo; "Anote." contornado por retângulo SVG vermelho de traço 4 (non-scaling, raio 4). São as ferramentas marcador e retângulo do app aplicadas ao próprio slogan.

### Foco, seleção de texto e scrollbar
- **Foco:** contorno tracejado branco de 2px, offset 4px, raio 2px — o tracejado da seleção. Dentro de papel, troca para Tinta.
- **`::selection`:** Azul de Seleção a 55%, texto branco.
- **Scrollbar:** polegar Borda de Chrome sobre trilho Véu.

### Movimento
Uma curva só: ease-out exponencial `cubic-bezier(0.16, 1, 0.3, 1)` (no JS, `1 - 2^(-10t)`).
- **Entrada do hero (uma vez, só com o topo visível):** a área iluminada é arrastada do canto em 1100ms (início 250ms); a faixa amarela cresce em 650ms (atraso 550ms); o retângulo vermelho é traçado em 700ms (atraso 850ms); barra, metadado e alças aparecem em 400ms (atraso 1000ms).
- **Antes/depois (uma vez):** ao entrar 60% na tela, avança sozinho para o passo 2 (1.2s) e 3 (3s) e para; qualquer clique ou tecla cancela. Troca de imagem por opacidade em 520ms.
- **Estados:** 160–200ms em cor de fundo, cor e borda; seta do FAQ gira em 200ms.
- **Reduced motion:** sem entrada, sem avanço automático, transições zeradas, rolagem sem suavização. Sem JS, a tela cobre o hero escurecida e a área iluminada não aparece.

## Do's and Don'ts

### Do:
- **Do** colocar toda prova (configuração, atalho, preset, QR) dentro de uma moldura de seleção com etiqueta de medida real.
- **Do** manter o fundo no Véu (#0f0f13) e usar o papel de parede #27272f sob `rgba(9, 9, 12, 0.8)` para qualquer "tela" que precise se fundir ao site.
- **Do** usar o Azul de Seleção como única cor de ação; vermelho e amarelo só como anotação.
- **Do** usar o tracejado branco de 2px como foco em todo elemento interativo, trocando para Tinta sobre papel.
- **Do** separar listas com linhas de 1px em vez de cards.
- **Do** gerar rasters de produto pelo `renderStill` de `site/promo/promo.js`, com dados fictícios e o sidecar de proveniência ao lado.
- **Do** desligar todo movimento em `prefers-reduced-motion` e garantir que o site funcione sem `site.js`.

### Don't:
- **Don't** usar texto em degradê.
- **Don't** usar ícones dentro de ladrilhos ou grades de cards com ícone.
- **Don't** usar brilhos/glows coloridos ou sombras em painéis capturados.
- **Don't** usar roxo no chrome do site; roxo é do logo e da interface retratada nos rasters.
- **Don't** usar mono fora de medidas, teclas, caminhos e códigos.
- **Don't** usar o tracejado de 1.5px para decoração: ele significa "selecionado".
- **Don't** arredondar regiões capturadas.

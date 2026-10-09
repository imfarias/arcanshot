# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

> O produto principal é um app desktop para **Windows 10 e 11**, feito em Electron (interface em HTML/CSS/React),
> residente na bandeja do sistema. Há também um site institucional (`site/web`, Astro) e um vídeo de
> apresentação (`site/promo`). Não há versão para macOS, Linux ou celular.

## Users

Quem precisa mostrar algo da tela para outra pessoa, rápido e com clareza. Quatro públicos, todos confirmados:

- **Devs e QA**: registram bugs e estados de tela para anexar em issues e pull requests, com setas e numeração.
- **Suporte e atendimento**: respondem clientes com passo a passo visual, escondendo dados sensíveis.
- **Quem faz documentação e tutoriais**: manuais, treinamentos e guias com capturas numeradas e prontas para publicar.
- **Usuário comum do Windows**: tira um print e manda no chat (WhatsApp, Discord, Teams), sem configurar nada.

Situação comum a todos: estão no meio de outra tarefa, apertam um atalho e querem voltar ao que faziam em segundos.

## Product Purpose

Capturar uma área, a tela atual ou todos os monitores; anotar (setas, retângulos, elipses, linhas, traço livre,
texto, marcador, desfoque, tarja e numeração passo a passo); e copiar ou salvar o resultado. Sucesso é o print sair
do atalho até o destino (chat, issue, documento) sem atrito, explicando o que precisa explicar.

## Positioning

Diferenciais que o ArcanShot defende frente a ShareX, Lightshot, Greenshot e Flameshot (confirmados):

1. **100% local e privado**: sem conta, sem nuvem, sem upload; nada sai do computador.
2. **Rápido e simples**: atalho → seleciona → anota → copia, sem a complexidade de ferramentas como o ShareX.
3. **Prints bonitos para compartilhar**: o recurso "embelezar" (fundo, margem, sombra, cantos) deixa a captura pronta
   para redes, docs e apresentações.

Também é verdade, mas não é o argumento principal: gratuito, código aberto (MIT) e feito em pt-BR.

## Operating Context

- Uso disparado por atalho global (`PrintScreen`, `Ctrl+PrintScreen`, `Shift+PrintScreen`) ou pelo menu da bandeja;
  o app fica residente e pode iniciar com o Windows.
- A captura abre um overlay em tela cheia sobre o que o usuário estava fazendo; a edição acontece ali mesmo.
- Saídas: área de transferência e/ou arquivo (PNG/JPG) numa pasta configurável, com padrão de nome por data.
- Sequências de prints vão para uma galeria, de onde se reabre, reedita, arrasta para outros apps ou exporta em PDF.
- Ambientes com 1 ou vários monitores e escalas diferentes (100%, 150%…).
- Distribuição: instalador NSIS nas GitHub Releases, link fixo no site; o app verifica atualizações sozinho (v0.3+).

## Capabilities and Constraints

- **Ferramentas do editor**: seleção, retângulo, elipse, seta, linha, traço livre, marcador, desfoque, tarja sólida,
  texto, numeração passo a passo, conta-gotas; espessuras; cores; desfazer/refazer; lupa de precisão na seleção.
- **Embelezar**: presets de fundo, margem proporcional, cantos arredondados, sombra. Nasce **desligado** para não
  mudar o comportamento de quem já usa.
- **Configurações**: pasta e padrão de nome, formato e qualidade, atalhos, iniciar com o Windows, copiar ao salvar,
  notificações, tempo da sequência, atualizações (verificar ao iniciar; instalar automaticamente).
- **Idioma**: interface e site em **pt-BR**; inglês é um próximo passo planejado, ainda não feito.
- **Restrições técnicas**: só Windows; instalador ainda **sem assinatura digital** (o SmartScreen avisa "editor
  desconhecido"; assinatura via SignPath planejada); configurações retrocompatíveis por merge de defaults.
- **Em aberto**: versão em inglês; assinatura do instalador; atualização do Electron (versão atual sem suporte).

## Brand Commitments

- Nome **ArcanShot**. Ícone existente: quadrado arredondado roxo com uma "lente" branca (anel + ponto) e marcas de
  canto de seleção (`resources/icon.png`, gerado por `scripts/gen-icon.mjs`).
- Voz: português do Brasil, direto, tratando por "você"; slogan em uso no site e no vídeo: "Capture. Anote. Compartilhe."
- Honestidade com o usuário: o aviso do SmartScreen é explicado, não escondido.
- Doações apenas via Pix com chave aleatória (sem expor dados pessoais).

## Evidence on Hand

- Vídeo de apresentação com narração e legendas e loop mudo para o hero: `site/promo/dist/`.
- Site no ar: https://arcanshot.vfconsultoria.dev (Astro, `site/web`).
- Releases públicas v0.1.0 a v0.3.0 em https://github.com/imfarias/arcanshot/releases.
- Ícone e QR Pix: `resources/icon.png`, `site/web/public/pix-qr.svg`.
- Especificações e histórico de cada funcionalidade: `specs/`.
- **Não existem** (não inventar): depoimentos, número de usuários ou downloads, clientes, imprensa, comparativos de
  desempenho, selos ou certificações.

## Product Principles

1. **Do atalho ao destino em segundos.** Cada passo a mais entre apertar a tecla e colar o print é custo; nada
   obrigatório para configurar antes do primeiro uso.
2. **Privado por construção.** Nenhum recurso pode depender de conta, nuvem ou envio de dados; isso é promessa, não opção.
3. **Clareza antes de enfeite.** Anotações existem para explicar; o acabamento bonito é um passo opcional no fim.
4. **Não surpreender quem já usa.** Recursos novos chegam desligados ou retrocompatíveis; o fluxo conhecido não muda
   sem o usuário escolher.
5. **Aberto e honesto.** Código público, limitações declaradas, nenhuma alegação que não possa ser comprovada.

## Accessibility & Inclusion

- Telas do app (configurações, galeria, overlay) e o site são verificadas com testes automatizados de acessibilidade
  (`jest-axe`) e devem seguir WCAG 2.1 AA: rótulos, estados de foco visíveis, navegação por teclado.
- Atalhos de teclado para as ações principais do editor (copiar, salvar, desfazer, cancelar).
- Movimento respeita `prefers-reduced-motion` no site (o vídeo de fundo vira imagem estática).

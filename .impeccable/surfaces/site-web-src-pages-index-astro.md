---
version: 1
slug: "site-web-src-pages-index-astro"
primary_target: "site/web/src/pages/index.astro"
related_targets: []
---

# Surface brief — site/web (landing)

Mode: Persuade. Visitor: usuário de Windows (devs/QA, suporte, documentação, uso comum) decidindo baixar um app gratuito.
Action: baixar o instalador (botão principal); secundárias: assistir à apresentação, ver no GitHub.
Proof: o próprio produto em ação (capturas renderizadas pelo motor do vídeo de apresentação, dados fictícios); release real do GitHub.
Constraints: pt-BR; sem alegações inventadas (PRODUCT.md › Evidence); CSP script-src 'self' (nada inline); build code-led (sem geração de imagem).
Untouched: conteúdo do FAQ, Contribua e Apoie (Pix) — reestilizados, não reescritos. Novidades removida da página por decisão do usuário (2026-10-09); o link "Todas as versões" fica na instalação e no rodapé.
Order (layout, 2026-10-09): topo → prova (antes/depois) → 3 diferenciais (local, rápido, bonito) → atalhos → instalação + FAQ → chamada final → Contribua + Apoie; id em toda seção.

## Direction contract

THESIS: o site é uma captura em andamento — tela escurecida, área selecionada iluminada, anotações do app. Recusa o template SaaS escuro (texto em degradê, grade de cards com ícone, brilhos).

OWN-WORLD: véu #0f0f13 sobre a "tela"; regiões capturadas claras (#f8fafc/#fff, texto #0f172a); chrome do app (#18181b, borda #3f3f46, texto #e4e4e7); seleção tracejada branca com alças brancas de borda azul #2563eb; anotação vermelha #ef4444, marcador amarelo, círculos de passo azuis; etiqueta de medida em mono; display Bricolage Grotesque, corpo Segoe UI Variable; roxo só no logo.

STORY: o visitante vê o app funcionando no próprio site, entende "atalho → anota → esconde → embeleza → cola", confia (local, honesto) e baixa.

FIRST VIEWPORT: tela do app inteira sob véu; recorte de seleção nítido (~55% da largura, à direita) com etiqueta "W × H" real e alças; título à esquerda no véu, "Anote." circulado por retângulo vermelho; barra de ferramentas do app sob a seleção com Baixar (azul) + Assistir + GitHub. Interação assinatura: a seleção é arrastada na entrada e a etiqueta conta os pixels reais (acompanha o redimensionamento). Movimento: só esse desenho de seleção e o traçado das anotações, ease-out exponencial, desligado em reduced-motion.

FORM: direção fixada pelo usuário ("o site como uma captura"), sem sorteio; posição n/a; seed key: none (pinned).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

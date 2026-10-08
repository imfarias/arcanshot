# Roadmap — Site do ArcanShot

**Objetivo:** uma landing page que explique o ArcanShot em 10 segundos e leve o visitante
ao download do instalador mais recente, sem custo de hospedagem.

**Decisões de base**
- **Hospedagem:** GitHub Pages, no mesmo repositório (pasta `site/`). Grátis, HTTPS, deploy por Actions.
- **Stack:** Astro (estático, zero JS por padrão, ótimo SEO) + CSS próprio. Sem backend.
- **Download:** link estável `https://github.com/imfarias/arcanshot/releases/latest/download/ArcanShot-Setup.exe`
  (o workflow de release já publica esse asset com nome fixo a cada merge na master).
- **Idiomas:** pt-BR primeiro, en na fase 3 (open source atrai público global).

---

## Fase 0 — Fundação (½ dia)
- [ ] Repositório público com CI, release automática e proteção da master (feito junto com este roadmap)
- [ ] `LICENSE` (MIT, já declarado no `package.json`), `CONTRIBUTING.md`, templates de issue/PR
- [ ] Decidir domínio: `imfarias.github.io/arcanshot` (grátis) ou domínio próprio (`arcanshot.app`, ~R$ 60–100/ano)

## Fase 1 — MVP da landing (2–3 dias)
- [ ] Scaffold Astro em `site/` com workflow `pages.yml` (deploy em push na master que altere `site/**`)
- [ ] Identidade visual: reaproveitar o roxo do ícone (`scripts/gen-icon.mjs`), logo em SVG, favicon
- [ ] Seções da página:
  - Hero: título + subtítulo + botão **Baixar para Windows** + versão atual, sobre o **vídeo de fundo** (abaixo)
  - Recursos: área/tela/todos os monitores, ferramentas de anotação, desfoque, numeração, galeria, embelezar
  - Tabela de atalhos (mesma do README)
  - Rodapé: GitHub, licença, "feito por"
- [x] **Vídeo de apresentação** (motion + narração + música via Web Audio API) — ver
      [`site/promo/`](../site/promo/README.md): vídeo completo + loop mudo p/ o hero + pôster
- [ ] Gravação real do app (complementar ao motion) — **vídeo de fundo do hero** mostrando o app em uso:
  - Roteiro (~15–20 s, em loop): `PrintScreen` → seleção de área → seta + retângulo + texto →
    desfoque de um dado sensível → numeração passo a passo → embelezar → `Ctrl+C` → colar num chat
  - Gravação: OBS Studio a 60 fps numa tela limpa (wallpaper neutro, dados fictícios, escala 100%)
  - Gravação reproduzível (opcional): script Playwright + Electron que executa o roteiro sozinho,
    reaproveitando a infra de E2E — permite regravar o vídeo a cada versão com UI nova
  - Edição: cortar pausas, acelerar trechos mortos, sem áudio; versão com zoom nos detalhes
  - Export: WebM (VP9/AV1) + MP4 (H.264) fallback, 1080p, alvo ≤ 2–3 MB; poster `.webp` do 1º frame
  - Embed: `<video autoplay muted loop playsinline preload="metadata" poster="...">` + overlay
    escuro para legibilidade do texto; respeitar `prefers-reduced-motion` (mostra só o poster)
  - Reaproveitar o mesmo vídeo no README (GIF curto) e nas redes na divulgação (Fase 3)
- [ ] Versão atual no botão buscada em build-time pela API de Releases do GitHub
- [ ] Aviso do SmartScreen explicado (enquanto não houver code signing)
- [ ] Lighthouse ≥ 95 em Performance/Acessibilidade/SEO

## Fase 2 — Conteúdo e confiança (2–3 dias)
- [ ] Página **Changelog** gerada das GitHub Releases (build-time)
- [ ] Página **FAQ**: SmartScreen, onde ficam as configurações, como desinstalar, privacidade (nada sai da máquina)
- [ ] Comparativo honesto com Lightshot / ShareX / Greenshot / Flameshot
- [ ] Open Graph + Twitter Card com imagem de preview, `sitemap.xml`, `robots.txt`
- [ ] Badges no README: release, CI, licença, downloads
- [ ] Rebuild do site disparado pelo workflow de release (para versão/changelog atualizarem sozinhos)

## Fase 2.5 — Instalador assinado (fim do aviso "editor desconhecido")
Caminho escolhido: **SignPath Foundation** — certificado gratuito para projetos open source,
integrado ao GitHub Actions. (Azure Artifact Signing só aceita pessoa física nos EUA/Canadá;
certificados OV/EV comprados exigem token de hardware/HSM e custam US$ 200–500/ano.)
- [ ] Pré-requisitos da SignPath: repo público com licença OSI (MIT ✓), já ter releases
      publicadas (o workflow cuida disso), descrição do app na página de download
- [ ] Publicar a página **Code Signing Policy** no site (exigência da SignPath: quem aprova
      releases, que builds são assinados, link para o repositório)
- [ ] Solicitar o cadastro em signpath.org e aguardar aprovação
- [ ] No GitHub (Settings → Secrets and variables → Actions):
      secret `SIGNPATH_API_TOKEN`; variáveis `SIGNPATH_ORGANIZATION_ID`,
      `SIGNPATH_PROJECT_SLUG`, `SIGNPATH_POLICY_SLUG` (ex.: `release-signing`)
- [ ] Pronto: o workflow de release já tem o passo de assinatura e ele liga sozinho quando as variáveis existirem
- [ ] Observação: mesmo assinado, o SmartScreen pode avisar nas primeiras versões até o
      certificado ganhar reputação por número de downloads — remover a seção de aviso do site só depois disso

## Fase 3 — Alcance (contínuo)
- [ ] Versão em inglês (`/en`) com detecção de idioma
- [ ] Analytics sem cookies (Plausible, Umami self-hosted ou GoatCounter) — sem banner de consentimento
- [ ] Publicar no winget e Scoop (instalação via `winget install ArcanShot`) e documentar no site
- [ ] Divulgação: Show HN, r/windows, r/opensource, TabNews, Product Hunt
- [ ] Página "Contribua": como rodar local, pipeline de specs (`specs/`), good first issues

## Fase 4 — Produto (quando houver tração)
- [ ] Auto-update no app (`electron-updater` lendo o `latest.yml` das Releases)
- [ ] Botão de doação (GitHub Sponsors / Ko-fi / Pix)
- [ ] Docs do usuário (guia de cada ferramenta) — Starlight, que é Astro

---

## Fluxo de entrega (já configurado)
1. Trabalho em branch → PR para `master` com título no padrão Conventional Commits
2. CI roda lint + typecheck + testes no PR (check obrigatório)
3. Só o dono do repositório faz merge (squash)
4. Merge na `master` → workflow **Release** calcula a versão, gera o `.exe` e publica a GitHub Release

| Título do PR | Release gerada |
|---|---|
| `fix: ...`, `chore: ...`, `docs: ...` | patch (0.1.0 → 0.1.1) |
| `feat: ...` | minor (0.1.0 → 0.2.0) |
| `feat!: ...` ou corpo com `BREAKING CHANGE:` | major (0.1.0 → 1.0.0) |
| mensagem contendo `[skip release]` | nenhuma |

Para forçar uma versão específica, edite `version` no `package.json` no PR — se for maior que a calculada, ela vence.

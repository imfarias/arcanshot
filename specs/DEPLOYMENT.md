# Manual de Publicação — ArcanShot

**Versão deste manual:** v1.0
**Última atualização:** 2026-06-12
**Mantido por:** arc-arquiteto

> Adaptação declarada: ArcanShot é um app desktop. "Deploy" aqui significa **empacotar
> e distribuir um instalador Windows**, não publicar serviços em servidor. Seções do
> template que pressupõem infraestrutura de servidor estão marcadas N/A com motivo.

## 1. Visão Geral da Topologia
Tudo roda na máquina do usuário final. Distribuição: instalador NSIS (`ArcanShot-Setup-x.y.z.exe`) publicado em GitHub Releases. Sem servidores, sem CDN, sem banco.

## 2. Infraestrutura
- Provedor de cloud / orquestração / banco / cache / fila / WAF: **N/A** (desktop).
- Storage de release: GitHub Releases.
- Assinatura de código: opcional na v1 (sem certificado, o SmartScreen exibirá aviso "editor desconhecido" — documentado na seção 13).

## 3. Pré-requisitos para Primeiro Release
- [ ] Node 22+ e npm instalados na máquina de build
- [ ] `npm ci` executado com sucesso
- [ ] Suite de testes verde (`npm test`)
- [ ] Repositório GitHub criado (para Releases) — opcional para build local
- [ ] (Opcional) Certificado de code signing EV/OV para eliminar aviso do SmartScreen

## 4. Variáveis de Ambiente
| Variável | Obrigatória | Onde | Observações |
|---|---|---|---|
| `ARCANSHOT_USER_DATA` | Não | dev/teste | Redireciona pasta de settings (usada nos testes E2E) |
| `ARCANSHOT_OPEN_SETTINGS` | Não | teste | Abre a janela de configurações no boot (hook de E2E) |
| `CSC_LINK` / `CSC_KEY_PASSWORD` | Não | CI | Certificado de assinatura, se existir |

## 5. Pipeline de CI/CD (sugerido — GitHub Actions)
### Gatilhos
- Push/PR → lint + testes
- Tag `v*.*.*` → build do instalador + upload para GitHub Releases

### Etapas
1. Checkout → 2. `npm ci` → 3. Lint → 4. `npm test` → 5. `npm run dist` → 6. Upload do `.exe` para a Release

### Versionamento
- SemVer no `package.json`; tag `vX.Y.Z` dispara o release.

## 6. Procedimento de Release
### Local (caminho padrão da v1)
1. `npm version patch|minor|major`
2. `npm run dist`
3. Instalador gerado em `release/ArcanShot-Setup-X.Y.Z.exe`
4. Testar instalação numa máquina limpa (ou nova conta de usuário)
5. Publicar o `.exe` na GitHub Release com changelog

### Emergência
N/A — não há serviço no ar; basta retirar o asset da Release.

## 7. Migrations
N/A (sem banco). Mudanças no formato do `settings.json` devem manter retrocompatibilidade via merge de defaults (`shared/settings.ts`) — campos desconhecidos são ignorados, ausentes recebem default.

## 8. Rollback
Reinstalar a versão anterior a partir da Release antiga. Settings são compatíveis para trás por construção (seção 7).

## 9. Observabilidade
N/A em produção (nenhuma telemetria — decisão de privacidade). Diagnóstico local: `%APPDATA%/arcanshot/settings.json` e log do processo (`ArcanShot.exe --enable-logging`).

## 10. Healthchecks
N/A. Equivalente local: ícone presente na bandeja + atalho global respondendo.

## 11. Backups e DR
Único estado do usuário: `settings.json` e as capturas salvas (pasta escolhida pelo usuário). Nada a fazer pelo app.

## 12. Escalabilidade
N/A.

## 13. Segurança em Produção
- Instalador NSIS por usuário (perMachine: false) — não exige admin.
- Sem assinatura de código, o Windows SmartScreen mostra aviso; usuário clica "Mais informações → Executar assim mesmo". Eliminar exige certificado OV/EV (custo anual) — decisão adiada.
- Atualizações: manuais na v1 (baixar nova Release). `electron-updater` fica para v2.

## 14. Conformidade
Nenhum dado pessoal coletado ou transmitido. Capturas ficam exclusivamente na máquina do usuário.

## 15. Runbook — Incidentes Comuns
### Sintoma: atalho global não funciona após instalar
**Diagnóstico:** outro app capturou a tecla (OneDrive/Xbox Game Bar usam PrintScreen).
**Mitigação:** trocar o atalho na tela de Configurações; o app avisa quando o registro falha.

### Sintoma: captura sai borrada/cortada em monitor com escala ≠ 100%
**Diagnóstico:** conversão DIP↔pixel físico (scaleFactor).
**Mitigação:** bug — abrir issue; conversões centralizadas em `shared/geometry.ts`.

### Sintoma: app não salva na pasta configurada
**Diagnóstico:** pasta removida/sem permissão.
**Mitigação:** o app recria a pasta default; verificar mensagem de erro na notificação.

## 16. Contatos
| Papel | Pessoa | Canal |
|---|---|---|
| Mantenedor | Vinicius Farias | farias.brz@gmail.com |

## 17. Checklist de Go-Live (primeiro release público)
- [ ] Suite de testes verde
- [ ] Instalador testado em máquina limpa (instala, captura, copia, salva, desinstala)
- [ ] Multi-monitor testado (escalas 100% e 150%)
- [ ] Atalhos globais conferidos com OneDrive/Game Bar ativos
- [ ] Changelog escrito na Release
- [ ] README com instruções de instalação e aviso do SmartScreen

## 18. Site `arcanshot.vfconsultoria.dev` — **publicado em 2026-10-08**
Landing page em Astro (`site/web`) com o download da última release, a lista de novidades (GitHub Releases,
lida no build), o vídeo de apresentação e o player interativo em Web Audio (`/apresentacao/`).

**Onde está:** VPS `srv916232` (31.97.248.137), k3s de 1 nó com Istio, mesmo cluster do GSTarget, Redmine Tracker e ArcanClips.

| Recurso | Onde | Detalhe |
|---|---|---|
| Deployment + Service `arcanshot-site` | namespace `arcanshot` | nginx-unprivileged :8080, sonda em `/healthz`, imagem `ghcr.io/imfarias/arcanshot-site` |
| `VirtualService arcanshot-site` | namespace `arcanshot` | gateway `istio-system/vf-shared-gateway` |
| `Certificate arcanshot-tls` | `istio-system` | ClusterIssuer `letsencrypt-prod`, HTTP-01 |
| `VirtualService http-redirect-arcanshot` | `istio-system` | 301 → https em `vf-http-gateway` (sem prefixo `/`, p/ não capturar o ACME) |
| Servidor `https-arcanshot` | `vf-shared-gateway` | backup antes da mudança: `/root/vf-shared-gateway.backup-20261008222420.yaml` |
| Secret `ghcr-pull` | namespace `arcanshot` | cópia do usado pelo GSTarget |
| ServiceAccount `arcanshot-deployer` | namespace `arcanshot` | RBAC mínimo (`site/deploy/deployer-rbac.yaml`) — sem delete, sem secrets, sem outros namespaces |
| DNS | Hostinger | CNAME `arcanshot` → `vfconsultoria.dev` |

**Deploy automático** (`.github/workflows/site.yml`): push na master que altere `site/**`, depois de cada
workflow **Release** concluído (atualiza "Novidades") ou manual (`workflow_dispatch`). Build da imagem no
GHCR (`:sha` e `:latest`) → `kubectl apply` com o usuário `arcanshot-deployer` → rollout → smoke test.
Em PR o workflow só faz o build (sem push/deploy).
- Secret `KUBE_CONFIG`: `base64 -w0` do arquivo gerado por `site/deploy/make-kubeconfig.sh` na VPS.
- Variável `SITE_DEPLOY_ENABLED=true` (desligar = só build).
- Revogar: `kubectl -n arcanshot delete secret arcanshot-deployer-token` e reaplicar `deployer-rbac.yaml`.

**Deploy manual de emergência** (da raiz do repo; chave `~/.ssh/vardle_vps`): enviar `site/`, `resources/icon.png`
e `.dockerignore` para a VPS, `docker build -f site/web/Dockerfile -t ghcr.io/imfarias/arcanshot-site:manual .`,
`docker save … | k3s ctr images import -` e `kubectl -n arcanshot set image deploy/arcanshot-site site=ghcr.io/imfarias/arcanshot-site:manual`.
O primeiro deploy (2026-10-08) foi feito assim, com a tag `:bootstrap`.

**Mídias:** os vídeos vêm de `site/promo/dist` (gerados por `npm run promo:render`); o build do site copia
para `/media/`. Atualizar o vídeo = renderizar de novo, commitar e dar merge.

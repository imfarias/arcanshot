# Arquitetura — ArcanShot

## 1. Visão Geral
ArcanShot é um aplicativo desktop Windows de captura de tela no estilo Flameshot/Lightshot: o usuário aciona a captura por atalho global ou ícone na bandeja, seleciona uma área (ou tela inteira / todos os monitores), anota sobre a imagem (retângulo, elipse, seta, linha, texto, marcador, desfoque, numeração passo-a-passo), e copia para o clipboard ou salva em pasta configurável. Uso pessoal/single-user, distribuído como instalador `.exe`.

## 2. Stack Tecnológica
| Camada | Tecnologia | Versão | Justificativa |
|---|---|---|---|
| Runtime desktop | Electron | ^38 | APIs nativas maduras: desktopCapturer, clipboard, globalShortcut, Tray, screen |
| Main process ("backend") | TypeScript + Node | 5.8 / 22 | Lógica de captura, persistência, IPC |
| Renderer ("frontend") | React + TypeScript | ^19 | Overlay de edição (canvas) e tela de configurações |
| Build | electron-vite | ^3 | Bundling main/preload/renderer unificado, HMR |
| Persistência | JSON em userData | — | Single-user local; banco seria overkill |
| Empacotamento | electron-builder | ^26 | Instalador NSIS .exe com um comando |
| Testes (main/unit) | Vitest | ^3 | Rápido, nativo a Vite/TS |
| Testes (FE componente) | Vitest + Testing Library + jest-axe | ^3/^16/^9 | Componente + a11y automatizada |
| Testes (E2E) | Playwright (`_electron`) | ^1.5x | Único framework E2E com driver Electron oficial |

Cache, fila, observabilidade: **N/A** — app desktop local sem serviços remotos.

## 3. Estrutura de Pastas
```
arcanshot/
├── electron.vite.config.ts      # build main/preload/renderer (2 páginas HTML)
├── electron-builder.yml         # empacotamento NSIS
├── resources/                   # ícones (gerados por scripts/gen-icon.mjs)
├── scripts/gen-icon.mjs         # gera PNG do ícone sem dependência externa
├── src/
│   ├── shared/                  # módulos PUROS (sem Electron) — testáveis isoladamente
│   │   ├── types.ts             # AppSettings, Annotation, IPC payloads
│   │   ├── settings.ts          # defaults, validação, merge
│   │   ├── filenamePattern.ts   # tokens %Y%m%d etc., sanitização
│   │   └── geometry.ts          # normalização de retângulos, conversão DIP↔px
│   ├── main/                    # processo principal ("backend")
│   │   ├── index.ts             # lifecycle, tray, atalhos globais, single-instance
│   │   ├── settingsStore.ts     # persistência JSON (recebe baseDir — testável)
│   │   ├── capture.ts           # desktopCapturer multi-display
│   │   ├── overlay.ts           # janelas overlay por display / editor
│   │   ├── saveImage.ts         # nome por padrão + colisão + escrita (testável)
│   │   └── ipc.ts               # ipcMain.handle de todos os canais
│   ├── preload/index.ts         # contextBridge → window.arcanshot
│   └── renderer/
│       ├── overlay/             # captura: seleção + editor canvas
│       │   ├── index.html / main.tsx / Overlay.tsx
│       │   ├── components/      # Toolbar, ColorPicker, TextInputLayer
│       │   └── lib/editor.ts    # estado de anotações, render, undo/redo, export
│       └── settings/            # tela de configurações
│           ├── index.html / main.tsx / SettingsForm.tsx
├── tests/
│   ├── main/                    # integração main process (fs real em tmp)
│   ├── unit/                    # shared/ puros
│   ├── renderer/                # componente + a11y
│   ├── factories/               # massa de dados (faker)
│   └── e2e/                     # Playwright _electron
└── specs/                       # artefatos do pipeline
```

## 4. Estilo Arquitetural
Monolito desktop em camadas: **shared (puro) → main (orquestração nativa) → preload (ponte segura) → renderer (UI)**. Toda regra de negócio que não depende de API Electron fica em `shared/` para ser testável e reutilizável pelos dois lados.

## 5. Comunicação
- Renderer ↔ Main: IPC via `ipcRenderer.invoke` / `ipcMain.handle` (request/response assíncrono).
- Canais nomeados `dominio:acao`: `settings:get|save|pick-dir`, `capture:start`, `overlay:init|begin-edit|cancel`, `editor:copy|save|save-as`, `app:open-settings`.
- Payload: JSON camelCase, tipado em `shared/types.ts`.
- Respostas de mutação: `{ ok: true, ...dados } | { ok: false, error: string, fieldErrors? }`.

## 6. Serviços Embutidos
- Autenticação/Autorização: N/A (app local single-user).
- Logging: console (dev); erros fatais via `dialog.showErrorBox`.
- Cache/Filas: N/A.
- Storage: filesystem local (pasta configurável, default `Imagens/ArcanShot`).
- Clipboard: `clipboard.writeImage(nativeImage)`.
- Tray + atalhos globais: `Tray`, `globalShortcut`.
- Autostart: `app.setLoginItemSettings`.

## 7. Integrações Externas
| Sistema | Propósito | Protocolo | Autenticação | Observações |
|---|---|---|---|---|
| — | Nenhuma na v1 | — | — | Upload p/ nuvem fica para versão futura |

## 8. Banco de Dados
N/A. Persistência: `settings.json` em `app.getPath('userData')`, escrito atomicamente (write em `.tmp` + rename), com merge de defaults na leitura e tolerância a JSON corrompido (volta aos defaults).

## 9. Segurança
- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` em todas as janelas.
- Preload expõe apenas API mínima tipada via `contextBridge` — nunca `ipcRenderer` cru.
- Validação de entrada: toda mutação IPC valida payload no main (`shared/settings.ts`).
- Caminhos de arquivo: salvamento restrito à pasta configurada ou escolhida via `dialog` nativo; nomes sanitizados (sem `..`, sem caracteres ilegais do Windows).
- LGPD: nenhum dado sai da máquina; capturas só são gravadas onde o usuário mandar.

## 10. Padrões de Código
- Nomenclatura: arquivos `camelCase.ts`, componentes `PascalCase.tsx`, canais IPC `dominio:acao`, constantes `UPPER_SNAKE`.
- Tratamento de erro: handlers IPC nunca propagam exceção ao renderer; retornam `{ ok: false, error }`.
- DTOs: tipos compartilhados em `shared/types.ts` — fonte única de verdade.
- Injeção de dependência: módulos do main recebem dependências por parâmetro (ex.: `SettingsStore(baseDir)`) para testabilidade.

## 11. Estratégia de Testes (referência mestre — vinculante)
- **Main Integração** (equivale a "backend integração"): módulos do main testados com **filesystem real em diretório temporário**, SEM mock de módulos internos do projeto. Mock apenas da fronteira Electron (`app`, `desktopCapturer`) quando inevitável. Verifica estado do disco pós-operação.
- **Unitário:** apenas módulos puros de `shared/` (pattern de nome, geometria, validação).
- **Frontend Componente:** SettingsForm e Toolbar — renderização, estados (sucesso/erro/loading), interações, validações, a11y básica. Erros cobertos com o mesmo rigor do sucesso.
- **Frontend Integração:** formulário completo com `window.arcanshot` mockado na fronteira do preload (equivalente ao "nível HTTP").
- **E2E:** Playwright `_electron` — app inicia, settings abre, alteração persiste em disco.
- **Massa de dados:** factories com `@faker-js/faker` (`settingsFactory`, `annotationFactory`) + seeder de `settings.json`.
- **Seletores:** `data-testid="{feature}-{elemento}"`, nunca texto visível.
- Estrutura: `tests/{unit,main,renderer,factories,e2e}`.
- Cobertura mínima: 80% em `src/shared` e `src/main` (excluindo `index.ts` de bootstrap e `overlay.ts` de janelas).

## 12. Acessibilidade (a11y)
- Nível alvo: WCAG 2.1 AA nas janelas com UI convencional (Configurações, Toolbar).
- `aria-label` em todo botão-ícone; `aria-describedby` ligando erro ao campo; `id` estável + `label[for]`; `role="toolbar"` na barra de ferramentas com navegação por setas; foco visível; contraste AA (4.5:1).
- Editor canvas: ações críticas também por teclado (Ctrl+C copia, Ctrl+S salva, Ctrl+Z desfaz, Esc cancela, Enter confirma seleção).
- jest-axe zerado de violações críticas/sérias nos componentes React.

## 13. Deploy e Ambientes
- Ambientes: dev (`npm run dev`, HMR) e produção (instalador NSIS).
- Build: `npm run build` (electron-vite) → `npm run dist` (electron-builder → `release/ArcanShot-Setup-x.y.z.exe`).
- CI/CD sugerido: GitHub Actions em tag `v*` rodando lint + testes + dist (ver DEPLOYMENT.md).
- Variáveis de ambiente: apenas de desenvolvimento/teste (`ARCANSHOT_USER_DATA`, `ARCANSHOT_OPEN_SETTINGS` para E2E).

## 14. Decisões e Trade-offs
| # | Decisão | Alternativas consideradas | Trade-off aceito | Data |
|---|---|---|---|---|
| 1 | Electron | Tauri (Rust) | Instalador ~80 MB vs ~10 MB; em troca, APIs de captura/clipboard/tray nativas e maturidade | 2026-06-12 |
| 2 | Captura congelada por display + overlay | Overlay transparente sobre tela viva | Imagem estática (não captura vídeo em movimento); em troca, seleção precisa e UI fora do print | 2026-06-12 |
| 3 | JSON em userData | electron-store, SQLite | Sem migrations automáticas; em troca, zero dependência e trivial de testar | 2026-06-12 |
| 4 | Seleção de área limitada a 1 display por vez | Seleção cruzando monitores | Modo "todas as telas" cobre o caso multi-monitor inteiro; seleção cross-display fica p/ v2 | 2026-06-12 |
| 5 | Anotações vetoriais re-renderizadas (não rasterizadas no ato) | Desenho direto no canvas | Mais código de render; em troca, undo/redo e edição não-destrutiva | 2026-06-12 |

## 15. Não-funcionais alvo
- Performance: overlay visível em < 600 ms após o atalho em monitor 4K; edição fluida (render < 16 ms por frame para até 200 anotações).
- Disponibilidade: app residente em tray; single-instance lock (segunda execução foca a existente).
- Escalabilidade: N/A (local). Suporte a 1–4 monitores com DPI distintos.
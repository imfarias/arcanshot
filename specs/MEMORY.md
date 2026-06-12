# Memória do Projeto — ArcanShot

## Stack atual
- Electron ^38 (main process Node 22, renderer Chromium)
- React ^19 + TypeScript ^5.8 + Vite (via electron-vite ^3)
- Persistência: JSON em `app.getPath('userData')` (sem banco de dados)
- Empacotamento: electron-builder (NSIS `.exe`)
- Testes: Vitest (unit + componente, jsdom), Testing Library, jest-axe, Playwright (E2E Electron)

## Decisões Arquiteturais
- [2026-06-12] [Arquiteto] App desktop puro (Electron), sem backend HTTP, sem Docker — Motivo: captura de tela, clipboard e tray exigem processo nativo local; docker-compose não se aplica a app desktop Windows. Os papéis "backend" do pipeline mapeiam para o **main process** do Electron.
- [2026-06-12] [Arquiteto] Electron escolhido sobre Tauri — Motivo: `desktopCapturer`, `clipboard`, `globalShortcut` e `Tray` são APIs maduras e nativas do Electron; usuário confirmou a escolha aceitando instalador maior (~80 MB).
- [2026-06-12] [Arquiteto] Captura por congelamento: ao acionar, captura-se imagem de TODOS os displays e abre-se janela overlay frameless por display exibindo a imagem congelada — Motivo: padrão Flameshot; evita a própria UI aparecer no print.
- [2026-06-12] [Arquiteto] Lógica de negócio (padrão de nome de arquivo, validação de settings, geometria) vive em módulos puros em `src/shared/` — Motivo: testável sem Electron, reutilizável entre main e renderer.
- [2026-06-12] [Arquiteto] Persistência de settings em JSON simples com merge de defaults e tolerância a arquivo corrompido — Motivo: um único usuário local; banco seria overkill.

## Padrões Estabelecidos
- [2026-06-12] [Arquiteto] IPC sempre via `ipcRenderer.invoke`/`ipcMain.handle` com canal nomeado `dominio:acao` (ex.: `settings:save`, `editor:copy`). Preload expõe API tipada `window.arcanshot` via contextBridge; `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`.
- [2026-06-12] [Arquiteto] Testes "backend integração" = módulos do main process testados com **fs real em diretório temporário**, sem mock de services internos.
- [2026-06-12] [Líder] Editor do overlay trabalha 100% em pixel físico da imagem; conversão para CSS por um único fator `cssPerImage`. Toda geometria nova deve seguir esse sistema.
- [2026-06-12] [Líder] Validação de formulário roda no renderer (UX) e no main (autoridade) usando o MESMO módulo `shared/settings` — nunca duplicar regras.

## Problemas Recorrentes & Soluções
- [2026-06-12] [Dev] `npm install` no Windows pode corromper `node_modules` (TAR_ENTRY_ERROR/ENOTEMPTY, provável interferência de antivírus) → apagar `node_modules` + `package-lock.json` e reinstalar.
- [2026-06-12] [Tester] Testing Library não faz auto-cleanup entre testes quando `globals: false` no Vitest (elementos duplicados em `getByTestId`) → manter `globals: true` em `vitest.config.ts`.
- [2026-06-12] [Tester] Para provocar erro de `mkdirSync` no Windows em teste, criar um arquivo comum e usar `arquivo/sub` como destino (caracteres ilegais variam por versão).

## Pontos de Atenção
- [2026-06-12] [Arquiteto] Multi-monitor com `scaleFactor` distinto (DPI): sempre converter entre coordenadas DIP (Electron `display.bounds`) e pixels físicos (imagem capturada) usando `scaleFactor` do display.
- [2026-06-12] [Arquiteto] `globalShortcut.register` pode falhar se outro app já usa a tecla (ex.: PrintScreen com OneDrive) — sempre tratar retorno `false` e informar o usuário.

## Glossário do Domínio
- Overlay: janela frameless em tela cheia que exibe a captura congelada para seleção/edição.
- Anotação: objeto desenhado sobre a captura (retângulo, elipse, seta, linha, texto, marcador, desfoque, numeração).
- Padrão de nome: template com tokens (`%Y`, `%m`, `%d`, `%H`, `%M`, `%S`) que gera o nome do arquivo salvo.

## Convenções de Código
- Nomenclatura: arquivos `camelCase.ts`, componentes React `PascalCase.tsx`, canais IPC `dominio:acao`.
- Tratamento de erro: handlers IPC retornam `{ ok: true, ... } | { ok: false, error }` — nunca lançam para o renderer.
- Logging: `console` no dev; erros fatais do main via `dialog.showErrorBox`.
- Atributos de teste em UI: `data-testid="{feature}-{elemento}"`.
- Atributos de acessibilidade obrigatórios: `aria-label` em botões-ícone, `aria-describedby` para erros de formulário, `id` estável + `label[for]` em inputs, foco visível.
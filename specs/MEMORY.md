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

## Decisões Arquiteturais
- [2026-06-13] [Líder] Cache de displays em `display-cache.json` separado de `settings.json` — Motivo: settings é config do usuário; cache é estado auto-gerenciado; misturar exigiria refatorar `mergeSettings` para preservar chaves extras.
- [2026-06-13] [Dev] Injeção de `DisplayCacheStore` em `overlay.ts` via `setDisplayCacheStore()` (módulo-level) — Motivo: preserva assinatura pública de `startCapture(mode, settings)` usada em dois call-sites sem alterar `IpcContext`.
- [2026-08-26] [Arquiteto] Modo `area` usa **uma janela overlay na união de todos os displays** (decisão #8 do ARCHITECTURE.md, supera a #4) — Motivo: um gesto de mouse pertence a uma única `BrowserWindow`; N janelas travam a seleção na borda do monitor. Alternativa descartada: sincronizar a seleção entre janelas por IPC (colocaria IPC em cada frame de `pointermove`).
- [2026-08-26] [Arquiteto] Embelezamento aplicado **na exportação**, nunca no canvas de trabalho (decisão #9) — Motivo: preserva o 1:1 entre overlay e desktop que a decisão #8 tornou essencial, e desligar o acabamento devolve exatamente o comportamento anterior.
- [2026-08-26] [Dev] Novos campos de `AppSettings` devem ser **planos**, não objetos aninhados — Motivo: `mergeSettings` compara `typeof value === typeof base[key]` e `FieldErrors` é `Partial<Record<keyof AppSettings, string>>`; aninhar exigiria merge profundo e erros aninhados. Campo novo ausente em `settings.json` antigo é preenchido pelo default automaticamente — sem migração.
- [2026-08-26] [Dev] Lógica de geometria de janelas extraída para `src/main/overlayLayout.ts`, **puro, sem `import 'electron'`** — Motivo: `overlay.ts`, `capture.ts`, `ipc.ts` e `index.ts` são excluídos da cobertura por dependerem de Electron; extrair a regra deu 100% de cobertura sem mockar `BrowserWindow`. Vale como padrão para qualquer regra nova que hoje moraria nesses arquivos.

## Padrões Estabelecidos
- [2026-06-12] [Arquiteto] IPC sempre via `ipcRenderer.invoke`/`ipcMain.handle` com canal nomeado `dominio:acao` (ex.: `settings:save`, `editor:copy`). Preload expõe API tipada `window.arcanshot` via contextBridge; `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`.
- [2026-06-12] [Arquiteto] Testes "backend integração" = módulos do main process testados com **fs real em diretório temporário**, sem mock de services internos.
- [2026-06-12] [Líder] Editor do overlay trabalha 100% em pixel físico da imagem; conversão para CSS por um único fator `cssPerImage`. Toda geometria nova deve seguir esse sistema.
- [2026-06-12] [Líder] Validação de formulário roda no renderer (UX) e no main (autoridade) usando o MESMO módulo `shared/settings` — nunca duplicar regras.

- [2026-10-09] [Líder] Preferência que vale para uma ação imediata (ex.: `pdfUniformSize` no Gerar PDF) viaja **junto** com o pedido da ação (argumento do IPC, validado por tipo no main, com fallback para o valor salvo) — não depender da persistência ter terminado; persistir em paralelo, melhor-esforço.
## Problemas Recorrentes & Soluções
- [2026-06-12] [Dev] `npm install` no Windows pode corromper `node_modules` (TAR_ENTRY_ERROR/ENOTEMPTY, provável interferência de antivírus) → apagar `node_modules` + `package-lock.json` e reinstalar.
- [2026-06-12] [Tester] Testing Library não faz auto-cleanup entre testes quando `globals: false` no Vitest (elementos duplicados em `getByTestId`) → manter `globals: true` em `vitest.config.ts`.
- [2026-06-12] [Tester] Para provocar erro de `mkdirSync` no Windows em teste, criar um arquivo comum e usar `arquivo/sub` como destino (caracteres ilegais variam por versão).

- [2026-10-09] [Tester] `tests/main/pdfBuilder.test.ts` testava uma **cópia** de `buildPdf` (a original morava em `ipc.ts`, que importa Electron) → extrair a lógica para módulo puro (`src/main/pdfBuilder.ts`) e importar o real. Para PDFs com tamanhos variados, usar `tests/factories/imageFactory.ts` (PNG real de qualquer tamanho via zlib; JPEG real fixo 16×8).
## Pontos de Atenção
- [2026-06-12] [Arquiteto] Multi-monitor com `scaleFactor` distinto (DPI): sempre converter entre coordenadas DIP (Electron `display.bounds`) e pixels físicos (imagem capturada) usando `scaleFactor` do display.
- [2026-08-26] [Líder] Numa janela que **cruza monitores de DPI diferentes**, `CSS px == DIP` é FALSO: a janela adota o `devicePixelRatio` de um monitor só. Derive sempre o fator do valor medido (`window.innerWidth / larguraDaUniao`), nunca de `devicePixelRatio`.
- [2026-08-26] [Líder] Ler pixels de canvas grande é caro: `getImageData` num canvas do tamanho da união de monitores força readback de GPU. Para conta-gotas/lupa, ler do **canvas pequeno já ampliado** — mesmo pixel, custo constante. Nunca usar `willReadFrequently` no canvas principal: força rasterização por software em todo frame.
- [2026-08-26] [Dev] Efeito colateral **nunca** dentro da função atualizadora de `useState`: o React pode executá-la mais de uma vez (StrictMode), duplicando a escrita. Calcular o próximo valor fora, chamar `setState(next)` e só então agendar o efeito.
- [2026-08-26] [Dev] Callback de `setTimeout` roda fora do ciclo do React — exceção ali vira erro não tratado, sem error boundary. Envolver em `try/catch` + `Promise.resolve(...)` quando a chamada puder não devolver Promise.
- [2026-08-26] [Tester] jsdom não implementa `toDataURL`: sem stub, a exportação devolve vazio e as ações de copiar/salvar silenciosamente não disparam. Stub que codifica as dimensões no dataUrl (`data:image/png;w=240;h=240`) deixa o tamanho final verificável no teste.
- [2026-08-26] [Tester] Atribuir `.value` num input controlado do React não dispara `onChange` (o React rastreia o valor internamente) — usar `fireEvent.change(el, { target: { value } })`.
- [2026-08-26] [Tester] jsdom não implementa canvas 2D, decodificação de `Image` nem `PointerEvent`. Para testar componentes de canvas: stubar `HTMLCanvasElement.prototype.getContext` **registrando as chamadas** (permite asserção sobre o que foi desenhado), substituir `Image` por uma classe que dispara `onload` em `queueMicrotask`, e aliasar `window.PointerEvent = window.MouseEvent` (senão `fireEvent.pointerDown` perde `clientX`/`clientY`). Ver `tests/renderer/Overlay.test.tsx`.
- [2026-06-12] [Arquiteto] `globalShortcut.register` pode falhar se outro app já usa a tecla (ex.: PrintScreen com OneDrive) — sempre tratar retorno `false` e informar o usuário.

- [2026-10-09] [Líder] PDF da sequência usa 1 px = 1 pt (desde a 0005): prints grandes viram páginas fisicamente enormes. Tamanho físico (A4/Carta) ficou fora de escopo da 0009.
## Glossário do Domínio
- Overlay: janela frameless em tela cheia que exibe a captura congelada para seleção/edição.
- Anotação: objeto desenhado sobre a captura (retângulo, elipse, seta, linha, texto, marcador, desfoque, numeração).
- Padrão de nome: template com tokens (`%Y`, `%m`, `%d`, `%H`, `%M`, `%S`) que gera o nome do arquivo salvo.

- Página padronizada (0009): página do PDF da sequência com o tamanho da captura de maior área; prints menores centralizados sem ampliar, maiores reduzidos sem distorcer.
## Convenções de Código
- Nomenclatura: arquivos `camelCase.ts`, componentes React `PascalCase.tsx`, canais IPC `dominio:acao`.
- Tratamento de erro: handlers IPC retornam `{ ok: true, ... } | { ok: false, error }` — nunca lançam para o renderer.
- Logging: `console` no dev; erros fatais do main via `dialog.showErrorBox`.
- Atributos de teste em UI: `data-testid="{feature}-{elemento}"`.
- Atributos de acessibilidade obrigatórios: `aria-label` em botões-ícone, `aria-describedby` para erros de formulário, `id` estável + `label[for]` em inputs, foco visível.
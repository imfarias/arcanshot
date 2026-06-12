# 0001 — Revisão Final

**Data:** 2026-06-12 · **Autor:** arc-lider (Momento B, via arc-specfull)

## Veredito: ⚠️ Aprovado com ressalvas

Implementação aderente à spec, ao design e à arquitetura; suite 73/73 verde; instalador
NSIS gerado. As ressalvas são itens 🟡 documentados, nenhum bloqueante — destaque: o
roteiro manual do overlay (DoD item 4) precisa ser executado pelo usuário antes do
primeiro release público.

## 1. Aderência à Especificação
- CA1–CA10 implementados; RN1–RN10 rastreáveis no código (RN2 `uniquePath`, RN5 `nextStepNumber`, RN6 `pixelateRegion` bloco ≥ 8, RN7 `mergeSettings`+try/catch, RN9 `MIN_SELECTION_DIP`, RN10 fundo preto no stitch).
- Fluxos alternativos 5a–5h presentes (5f notificação de hotkey, 5g overlay aberto em falha de save, 5h single-instance).

## 2. Aderência ao Desenho Técnico
Camadas, canais IPC, tipos e nomes de arquivo batem 1:1 com o design (seções 4–6, 11, 13). Sem desvios não documentados.

## 3. Aderência à Arquitetura
`contextIsolation/sandbox/nodeIntegration` corretos nas 2 janelas; lógica pura em `shared/`; IPC `dominio:acao` com respostas `{ok,...}`; DI por parâmetro nos módulos do main.

## 4. Reutilização
Primeira feature — sem componentes prévios para reaproveitar. Novos reutilizáveis devidamente registrados em `COMPONENTS.md` (Toolbar, editor, SettingsStore, filenamePattern, geometry).

## 5. Qualidade dos Testes
- ✅ Main integração sem mock de módulo interno; estado do **disco** verificado pós-operação (CT-MI-02/05/06/09).
- ✅ FE cobre erro com mesmo rigor: validação local, fieldErrors do servidor-main e rejeição de IPC.
- ✅ Cada cenário do 03 tem teste homônimo; E2E verifica persistência real em `settings.json`.
- ✅ `data-testid` e ARIA presentes e usados como seletores; jest-axe sem violações.
- ✅ Factories com faker e states nomeados; seeder consumido por teste real.

## 6. Achados
- 🟡 **Fluxos interativos do overlay sem automação** (arrasto, handles, texto, numeração no canvas): cobertos por lógica pura testada + roteiro manual. Executar o roteiro antes do release; avaliar harness dedicado na v2.
- 🟡 **Sem code signing**: SmartScreen exibirá aviso no instalador (decisão registrada no DEPLOYMENT.md §13).
- 🔵 Em modo edição, arrasto minúsculo com ferramenta seleção deixa seleção menor que 4 DIP em vez de restaurar a anterior.
- 🔵 `settings:pick-dir` cria janela oculta de fallback se o sender não for resolvido (caso teórico) — simplificar.
- 🔵 Mover/editar anotação existente (além de undo) ficaria bem na v1.1.

## 7. Próximos Passos
1. Usuário executa o roteiro manual (capturar área/tela/todos, 8 ferramentas, copiar, salvar, colisão, Esc, atalho ocupado em 2 monitores).
2. Instalar `release/ArcanShot-Setup-0.1.0.exe` numa sessão limpa e validar tray + atalhos.
3. Itens 🔵 em PR futura.

## 8. Lições para a MEMORY
Registradas: `globals: true` no Vitest para auto-cleanup do Testing Library; npm no Windows pode corromper `node_modules` (TAR_ENTRY_ERROR) — limpar e reinstalar.

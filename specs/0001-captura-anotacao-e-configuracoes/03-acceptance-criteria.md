# 0001 — Critérios de Aceite e Cenários de Teste

**Data:** 2026-06-12 · **Autor:** arc-lider (Momento A, via arc-specfull)

## 1. Critérios de Aceite Funcionais
- CA1: Atalho/menu de área congela a tela e permite selecionar região com feedback de dimensões; seleção < 4×4 DIP é ignorada (RN9).
- CA2: Modos tela atual e todos os monitores abrem direto em edição com tudo selecionado.
- CA3: Todas as 8 ferramentas de anotação funcionam com cor e espessura configuráveis; undo/redo ilimitado na sessão.
- CA4: Copiar põe o resultado final (recorte + anotações) no clipboard; Salvar grava na pasta padrão com nome do padrão configurado; Salvar como abre diálogo nativo.
- CA5: Colisão de nome gera sufixo ` (N)` — nunca sobrescreve (RN2).
- CA6: Numeração passo-a-passo é sequencial e retrocede no undo (RN5).
- CA7: Desfoque pixeliza com bloco ≥ 8 px (RN6).
- CA8: Configurações validam, persistem entre execuções e degradam para defaults com arquivo corrompido (RN7).
- CA9: Pasta padrão criada automaticamente ao salvar (RN8); falha de escrita mantém overlay aberto com notificação de erro (5g).
- CA10: Esc cancela sem efeito; segunda instância não duplica o app (5h).

## 2. Cenários de Main — Integração (fs real, sem mock interno)
| ID | Cenário | Verificação pós-operação |
|---|---|---|
| CT-MI-01 | `SettingsStore.load()` sem arquivo | retorna defaults; não cria arquivo |
| CT-MI-02 | `save(partial)` e `load()` em nova instância | disco contém JSON com merge correto |
| CT-MI-03 | `load()` com JSON corrompido | retorna defaults sem lançar |
| CT-MI-04 | `load()` com chave desconhecida/ausente | ignora desconhecida, aplica default na ausente |
| CT-MI-05 | `saveCapture` em pasta inexistente | cria pasta e grava arquivo com bytes corretos |
| CT-MI-06 | `saveCapture` 3× com mesmo nome | gera `x.png`, `x (1).png`, `x (2).png` |
| CT-MI-07 | `saveCapture` formato jpg | extensão `.jpg`, conteúdo igual ao buffer de entrada |
| CT-MI-08 | `saveCapture` com pasta sem permissão/inválida | retorna erro estruturado; nada gravado |
| CT-MI-09 | escrita atômica: `save` não deixa `.tmp` órfão | só `settings.json` existe ao final |

## 3. Cenários de Main — Unitário (módulos puros)
| ID | Cenário |
|---|---|
| CT-UN-01 | `formatFilename` expande todos os tokens com zero-padding |
| CT-UN-02 | `formatFilename` sanitiza caracteres ilegais do Windows |
| CT-UN-03 | `validatePattern` rejeita vazio, só-ilegais e > 120 chars; aceita default |
| CT-UN-04 | `normalizeRect` com arrasto em qualquer direção dá width/height ≥ 0 |
| CT-UN-05 | `clampRectToBounds` e conversão DIP↔físico com scale 1, 1.5, 2 |
| CT-UN-06 | `validateSettings` rejeita jpgQuality fora de 1–100, formato inválido, atalhos duplicados |
| CT-UN-07 | `mergeSettings` preserva defaults p/ ausentes e ignora chaves estranhas |
| CT-UN-08 | editor: add/undo/redo restaura estados exatos |
| CT-UN-09 | editor: numeração 1,2,3 → undo → próximo step recebe 3 (RN5) |
| CT-UN-10 | editor: `nextStepNumber` e exportação incluem apenas anotações ativas |

## 4. Cenários de Frontend — Componente (mín. 7)
| ID | Cenário |
|---|---|
| CT-FC-01 | SettingsForm renderiza com valores vindos de `getSettings` (loading → pronto) |
| CT-FC-02 | Sucesso: salvar exibe `settings-success` e envia payload correto |
| CT-FC-03 | Erro local: padrão de nome inválido mostra `settings-error-filename-pattern` e NÃO chama IPC |
| CT-FC-04 | Erro do main: `{ok:false, fieldErrors}` exibe erro por campo e foca o primeiro inválido |
| CT-FC-05 | Falha de IPC (reject): mensagem de erro genérica visível, formulário reutilizável |
| CT-FC-06 | jpgQuality desabilitado quando formato=png, habilita ao trocar p/ jpg |
| CT-FC-07 | Escolher pasta atualiza campo via `pickDirectory` (e cancelamento não altera) |
| CT-FC-08 | Preview do nome atualiza ao digitar padrão |
| CT-FC-09 | Toolbar: clicar ferramenta dispara callback e marca `aria-pressed` |
| CT-FC-10 | Toolbar: undo/redo desabilitados conforme histórico |
| CT-FC-11 | Toolbar: navegação por setas move foco (roving tabindex) |
| CT-FC-12 | a11y: jest-axe sem violações em SettingsForm e Toolbar |

## 5. Cenários de Frontend — Integração
| ID | Cenário |
|---|---|
| CT-FI-01 | Fluxo completo do formulário: carregar → editar 3 campos → salvar → sucesso, com `window.arcanshot` mockado na fronteira |
| CT-FI-02 | Fluxo de erro: main devolve fieldErrors → corrigir → salvar de novo → sucesso |

## 6. Cenários E2E (Playwright `_electron`)
| ID | Cenário |
|---|---|
| CT-E2E-01 | App inicia (userData em tmp), janela de configurações abre (hook), título correto |
| CT-E2E-02 | Alterar padrão de nome e salvar → `settings.json` no disco contém o novo valor |
| CT-E2E-03 | Valor inválido (padrão vazio) → erro visível, arquivo não alterado |

> Captura interativa de tela (arrastar seleção) não é automatizável de forma confiável
> em CI — coberta por teste manual roteirizado (seção 9) + testes de unidade do editor.

## 7. Massa de Dados — Factories & Seeders
- `tests/factories/settingsFactory.ts`: `settingsFactory(overrides?)` — dados realistas (faker: pastas, padrões válidos); states: `.invalidQuality()`, `.jpg()`.
- `tests/factories/annotationFactory.ts`: `annotationFactory.shape|text|step|blur(overrides?)`.
- `tests/factories/seedSettings.ts`: `seedSettingsFile(dir, overrides?)` grava `settings.json` válido (usado em CT-MI e E2E).

## 8. Cobertura Mínima Esperada
80% linhas em `src/shared` e nos módulos testáveis de `src/main` (`settingsStore`, `saveImage`); SettingsForm e Toolbar 100% dos estados descritos.

## 9. Definition of Done
- [ ] Todos os CA atendidos; cenários CT-* implementados e verdes
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e` verdes
- [ ] `npm run dist` gera instalador NSIS funcional
- [ ] Roteiro manual executado: capturar área/tela/todos, anotar com as 8 ferramentas, copiar, salvar, colisão de nome, cancelar com Esc, atalho ocupado
- [ ] `data-testid` e ARIA conforme design seção 11
- [ ] COMPONENTS.md atualizado (Toolbar, editor)

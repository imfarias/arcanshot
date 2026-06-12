# 0001 — Captura de Tela com Anotações e Configurações

**Status:** Especificado
**Data:** 2026-06-12
**Autor:** arc-requisito (via arc-specfull)

## 1. Contexto e Objetivo
O usuário precisa capturar imagens da tela rapidamente (área selecionada, tela atual ou
todos os monitores), anotar sobre a captura (destacar, esconder, explicar e numerar
passos) e então copiar para o clipboard ou salvar em arquivo — sem abrir um editor de
imagens. O app deve ficar residente na bandeja do sistema, ser acionável por atalho de
teclado de qualquer lugar e ter configurações persistentes (pasta padrão, nome padrão
do arquivo, formato, atalhos, inicialização com o Windows).

## 2. Atores
- **Usuário local**: única pessoa que opera o app na própria máquina.

## 3. Pré-condições
- App instalado e em execução (ícone visível na bandeja).
- Para salvar: pasta de destino acessível para escrita (o app cria a default se não existir).

## 4. Fluxo Principal (capturar área → anotar → copiar/salvar)
1. Usuário pressiona o atalho global de captura de área (default `PrintScreen`) ou usa o menu da bandeja.
2. A tela "congela": cada monitor exibe a imagem capturada com leve escurecimento e cursor em mira.
3. Usuário clica e arrasta para selecionar a área; durante o arrasto vê a região clara e um selo com as dimensões (ex.: `812 × 430`).
4. Ao soltar o mouse, a seleção fica ativa: aparecem alças de redimensionamento e a barra de ferramentas de anotação próxima à seleção.
5. Usuário anota livremente: retângulo, elipse, seta, linha, marcador, desfoque, texto e numeração passo-a-passo; pode trocar cor e espessura; desfazer/refazer ilimitado na sessão.
6. Usuário finaliza com uma das ações:
   - **Copiar** (`Ctrl+C` ou botão): imagem final (recorte + anotações) vai para o clipboard.
   - **Salvar** (`Ctrl+S` ou botão): salva na pasta padrão com nome gerado pelo padrão configurado.
   - **Salvar como** (`Ctrl+Shift+S` ou botão): abre diálogo nativo do Windows.
7. O overlay fecha e uma notificação confirma a ação ("Copiado para o clipboard" / "Salvo em C:\...\arquivo.png").

## 5. Fluxos Alternativos
- **5a. Capturar tela atual** (`Ctrl+PrintScreen` ou menu): captura o monitor onde está o cursor; abre direto em modo edição com a tela inteira selecionada (passos 5–7 do principal).
- **5b. Capturar todos os monitores** (`Shift+PrintScreen` ou menu): captura todos os displays compostos lado a lado conforme a disposição real; abre em modo edição com tudo selecionado, ajustado (zoom-fit) à janela.
- **5c. Cancelar**: `Esc` (ou botão ✕ da toolbar) fecha o overlay sem nenhum efeito.
- **5d. Refazer seleção**: com a ferramenta de seleção ativa, arrastar as alças redimensiona; arrastar o interior move a seleção.
- **5e. Abrir configurações**: menu da bandeja → "Configurações"; janela com formulário (seção 6.2).
- **5f. Atalho indisponível**: se o registro do atalho global falhar (tecla em uso por outro app), notificação alerta e orienta a trocar o atalho nas configurações; demais atalhos seguem funcionando.
- **5g. Pasta de destino inacessível ao salvar**: notificação de erro clara; overlay permanece aberto para o usuário tentar "Salvar como".
- **5h. Segunda instância**: abrir o app de novo não duplica; a instância existente é reutilizada.

## 6. Telas

### 6.1 Overlay de captura/edição
- Janela sem moldura cobrindo o monitor, exibindo a captura congelada.
- Fora da seleção: máscara escura (~50%); dentro: imagem limpa.
- Selo de dimensões junto à seleção; alças nas 8 posições.
- Toolbar flutuante (abaixo da seleção; acima se faltar espaço) com:

| Grupo | Itens |
|---|---|
| Ferramentas | Seleção, Retângulo, Elipse, Seta, Linha, Marcador, Desfoque, Texto, Numeração |
| Estilo | 6 cores predefinidas + seletor livre; espessura P/M/G |
| Histórico | Desfazer, Refazer |
| Ações | Copiar, Salvar, Salvar como, Cancelar |

- Texto: clique posiciona caixa de digitação; `Enter` confirma, `Esc` cancela; fonte proporcional à espessura escolhida.
- Numeração: cada clique insere um círculo numerado sequencial (1, 2, 3…).
- Desfoque: arrastar define região que fica pixelizada (irrecuperável no resultado).
- Marcador: traço translúcido amarelo (ou cor escolhida) que não cobre o conteúdo.

**Estados:** congelado-sem-seleção → selecionando → editando → (copiado | salvo | cancelado).
**Mensagens:** notificações do sistema em sucesso ("Copiado para o clipboard", "Salvo em {caminho}") e erro ("Não foi possível salvar em {pasta}: {motivo}").

### 6.2 Tela de Configurações
Janela comum (~720×640), formulário único com salvar explícito.

| # | Campo | Label | Tipo | Tamanho/Máscara | Obrigatório | Default | Validação | Acessibilidade | Observações |
|---|---|---|---|---|---|---|---|---|---|
| 1 | saveDir | Pasta padrão para salvar | texto somente leitura + botão "Escolher…" | caminho | Sim | `{Imagens}\ArcanShot` | não vazio | `id` estável, `label[for]`, botão com `aria-label` | Diálogo nativo de pasta |
| 2 | filenamePattern | Nome padrão do arquivo | texto | ≤ 120 chars | Sim | `Captura_%Y-%m-%d_%H-%M-%S` | não vazio; sem `\ / : * ? " < > |` fora dos tokens; ao menos 1 caractere após expansão | `aria-describedby` p/ ajuda e erro | Tokens: `%Y` ano, `%m` mês, `%d` dia, `%H` hora, `%M` min, `%S` seg; pré-visualização ao vivo |
| 3 | imageFormat | Formato da imagem | select | png \| jpg | Sim | png | um dos valores | label associada | — |
| 4 | jpgQuality | Qualidade JPG | número | 1–100 | Quando jpg | 90 | inteiro 1–100 | `aria-describedby` p/ erro; desabilitado quando png | — |
| 5 | hotkeyArea | Atalho: capturar área | texto | formato acelerador | Sim | `PrintScreen` | não vazio | label associada | Ex.: `Ctrl+Shift+A` |
| 6 | hotkeyFull | Atalho: tela atual | texto | idem | Sim | `Ctrl+PrintScreen` | não vazio; sem duplicar outro atalho | label associada | — |
| 7 | hotkeyAll | Atalho: todos os monitores | texto | idem | Sim | `Shift+PrintScreen` | não vazio; sem duplicar | label associada | — |
| 8 | launchOnStartup | Iniciar com o Windows | checkbox | — | — | desmarcado | — | label clicável | Registra/remove na inicialização |
| 9 | copyOnSave | Copiar para o clipboard ao salvar | checkbox | — | — | marcado | — | label clicável | — |
| 10 | showNotifications | Exibir notificações | checkbox | — | — | marcado | — | label clicável | — |

**Componentes de ação:** "Salvar" (primário), "Cancelar/Fechar". Ao salvar com sucesso: mensagem "Configurações salvas" (region `role="status"`); com erro de validação: mensagens por campo, foco no primeiro inválido.
**Estados:** carregando → pronto → salvando → salvo | erro.

## 7. Regras de Negócio
- RN1: O nome do arquivo é gerado expandindo os tokens do padrão com data/hora locais do momento do salvamento.
- RN2: Colisão de nome: acrescentar sufixo ` (1)`, ` (2)`… antes da extensão — nunca sobrescrever.
- RN3: O resultado exportado = recorte da seleção + anotações rasterizadas, no formato configurado (png sem perda; jpg com a qualidade configurada).
- RN4: Anotações são editáveis até a exportação (undo/redo); nada é gravado na imagem antes de copiar/salvar.
- RN5: A numeração passo-a-passo é sequencial por sessão de captura e reinicia a cada nova captura; ao desfazer um número, o contador retrocede.
- RN6: O desfoque deve impossibilitar leitura do conteúdo original (pixelização com bloco proporcional ao tamanho da região, mínimo 8 px).
- RN7: Configurações persistem entre execuções; arquivo corrompido ⇒ retornam aos defaults sem travar o app.
- RN8: A pasta padrão é criada automaticamente no primeiro salvamento, se não existir.
- RN9: Seleção mínima de 4×4 px (DIP); abaixo disso o arrasto é ignorado (evita cliques acidentais).
- RN10: Em "todos os monitores", áreas não cobertas por nenhum display (disposições em L) ficam pretas.

## 8. Permissões
Sem perfis — usuário local tem acesso total. Sem rede.

## 9. Dados (entrada e saída)
- **Entrada:** imagem dos displays (pixels), gestos do mouse/teclado, valores do formulário de configurações.
- **Saída:** imagem PNG/JPG (clipboard e/ou arquivo), `settings.json` em `%APPDATA%/arcanshot`.

## 10. Requisitos Não-Funcionais
- Overlay visível em < 600 ms após o atalho (monitor 4K).
- Edição fluida com até 200 anotações.
- Sem coleta/envio de dados (privacidade total).
- Multi-monitor com fatores de escala distintos (100%–200%) sem distorção.

## 11. Dependências
Nenhuma externa. Interna: APIs do Electron (captura, clipboard, tray, atalhos, notificações).

## 12. Fora de Escopo (v1)
- Upload para nuvem/serviços de compartilhamento.
- Gravação de vídeo/GIF.
- Seleção de área cruzando dois monitores (coberto pelo modo "todos os monitores").
- Captura por janela específica (lista de janelas).
- Auto-update do aplicativo.
- Editor reabrível depois de fechado (histórico de capturas).

## 13. Glossário Específico
- **Token de nome**: marcador `%X` substituído por data/hora ao gerar o nome do arquivo.
- **Pixelização**: substituição de blocos de pixels pela cor média, tornando o conteúdo ilegível.

## 14. Dúvidas em Aberto
Nenhuma crítica. Decisões já confirmadas pelo usuário no briefing: Electron; tray + atalho global + opção de iniciar com Windows; conjunto completo de ferramentas de anotação (incl. seta, linha, marcador, desfoque, elipse).

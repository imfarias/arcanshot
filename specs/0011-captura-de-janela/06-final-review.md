# 0011 — Revisão Final

**Data:** 2026-10-13 · **Autor:** arc-lider (Momento B, via arc-specfull)

## Veredito: ⚠️ Aprovado com ressalvas

## 1. Aderência à Especificação
RN-01..RN-08 atendidas; FA-1..FA-6 cobertos. Decisões do usuário respeitadas: visível na tela, koffi, Ctrl destaca e Ctrl+clique captura.

## 2. Aderência ao Desenho Técnico
Como desenhado. Único ajuste: `excludeHandles` ficou vazio porque a lista é feita antes de criar os overlays.

## 3. Aderência à Arquitetura
Lógica pura em `shared/`, nativo isolado em `main/`, falha degradando para "recurso desligado"; sem canal IPC novo.

## 4. Reutilização
Geometria da 0007 e fluxo de seleção/edição do arrasto. Novos reutilizáveis registrados em `COMPONENTS.md`.

## 5. Qualidade dos Testes
Regras puras 100%; ponte nativa testada com a API real; componente cobre sucesso e fallbacks; conferência no app empacotado. Lacuna aceita: sem E2E permanente (ver 05, seção 8).

## 6. Achados
- 🔴 nenhum
- 🟡 **Janela invisível em tela cheia no topo** (alguns overlays de jogos/gravadores) poderia engolir o Ctrl+clique. Mitigado pelos filtros (sem título, sem ativação, click-through, cloaked); se aparecer em campo, o arrasto normal segue disponível. Vale acompanhar.
- 🔵 A etiqueta usa o título da janela, que às vezes é longo (ex.: aba do navegador); está truncada com reticências.
- 🔵 Captura só do **visível** (RN-04): janela parcialmente coberta leva a cobertura junto. A alternativa (capturar a janela por si) ficou fora de escopo por decisão do usuário.
- 🔵 Instalador cresce ~1 MB (binário do koffi).

## 7. Próximos Passos
- [ ] PR e merge (publica a v0.6.0 do app; o site mostra o atalho novo).
- [ ] Testar com janelas reais no seu uso diário e relatar casos estranhos.

## 8. Lições para a MEMORY
Para chamar a API do Windows no Electron sem compilar nada, koffi + carga preguiçosa + `try/catch` total mantém o recurso opcional; e a lista deve ser tirada no mesmo instante da captura para casar empilhamento e imagem.

# 0005 — Sequência de Capturas com Galeria

**Data:** 2026-06-13 · **Autor:** arc-requisito (via arc-specfull)  
**Status:** Em andamento

---

## 1. Contexto e Motivação

Atualmente cada captura é tratada de forma independente: o usuário tira um print, anota e salva/copia. Não há como agrupar múltiplas capturas realizadas em sequência para depois exportá-las juntas. O pedido é que prints tirados em série (ex: passos de um tutorial, registro de um bug com múltiplas telas) sejam automaticamente agrupados e apresentados numa galeria que permite arrastar para outros apps (WhatsApp, Slack), exportar como PDF ou salvar toda a pasta.

---

## 2. Objetivo

Quando o usuário completa 2 ou mais capturas sem pausa superior a `sequenceTimeoutSec` segundos entre elas, o ArcanShot detecta a sequência automaticamente e abre uma janela **Galeria** com todas as imagens capturadas. A galeria oferece:
- Visualização em grade de thumbnails (arrastáveis)
- Salvar todas as imagens em uma pasta
- Exportar todas as imagens como um único PDF
- Fechar / descartar a sessão

---

## 3. Atores

| Ator | Papel |
|---|---|
| Usuário | Tira prints em sequência, usa a galeria para exportar |
| Main process | Gerencia a sessão, timer, janela de galeria, geração de PDF |
| Renderer (gallery) | Exibe thumbnails, dispara ações via IPC |

---

## 4. Fluxo Principal — Sequência detectada (≥ 2 prints)

1. Usuário aciona captura (atalho ou tray) → overlay abre → anota → salva ou copia
2. Ao fechar o editor, o main process adiciona o dataUrl ao buffer de sessão e inicia um timer de `sequenceTimeoutSec` segundos
3. Antes do timer expirar, usuário aciona outra captura → completa → timer reinicia com o novo dataUrl adicionado
4. Timer expira sem nova captura:
   - Se buffer tem **≥ 2 itens** → **abre janela Galeria** com todos os itens → buffer limpo
   - Se buffer tem **1 item** → descarta silenciosamente (comportamento atual preservado)
5. Galeria exibe thumbnails em grade numerados e ordendos por ordem de captura
6. Usuário pode:
   - **Arrastar** um thumbnail individualmente para outro app (WhatsApp, Slack etc.)
   - Clicar **"Salvar todas em pasta"** → abre seletor de pasta → salva todos os arquivos
   - Clicar **"Gerar PDF"** → abre seletor de arquivo → gera e salva PDF (uma imagem por página)
   - Fechar a janela (ESC ou botão Fechar) → descarta a sessão

---

## 5. Fluxo Alternativo — Somente 1 print concluído

- Timer expira com apenas 1 item no buffer → nada acontece, item descartado
- O print já foi salvo/copiado normalmente no passo 1 → comportamento inalterado

---

## 6. Fluxo Alternativo — Captura cancelada (ESC no overlay)

- Cancel NÃO adiciona ao buffer de sessão
- O timer NÃO é iniciado/resetado por um cancel

---

## 7. Regras de Negócio

| # | Regra |
|---|---|
| RN-01 | Timer inicia quando a edição de um print é **concluída** (save, copy ou save-as confirmado) — não quando iniciada |
| RN-02 | Cancel (ESC) não conta para a sessão |
| RN-03 | Galeria só abre se o buffer tiver ≥ 2 itens ao expirar o timer |
| RN-04 | Cada thumbnail é uma imagem independente e arrastável para outros apps via drag nativo |
| RN-05 | O PDF tem uma imagem por página; a página é dimensionada para a resolução física do screenshot |
| RN-06 | Arquivos salvos individualmente usam o padrão de nome configurado + sufixo `_NNN` (001, 002…) |
| RN-07 | `sequenceTimeoutSec` é configurável em Configurações (2–60 s, padrão 5 s) |
| RN-08 | Somente uma janela de galeria pode estar aberta por vez; nova sequência aguarda a galeria anterior fechar (ou a substitui) |
| RN-09 | Os arquivos temporários de drag-and-drop são escritos no diretório de temp do OS quando a galeria abre e removidos quando ela fecha |

---

## 8. Dados Persistidos / Transitórios

| Dado | Tipo | Onde |
|---|---|---|
| `sequenceTimeoutSec` | Persistido em `settings.json` | `AppSettings` |
| Buffer de sessão (dataUrls[]) | Transitório em memória | `CaptureSession` no main |
| Arquivos temp de DnD | Transitório em disco (OS temp) | Criados na abertura da galeria |

---

## 9. Não-funcionais

| Atributo | Requisito |
|---|---|
| UX | Galeria abre em ≤ 1 s após timer expirar |
| Acessibilidade | Thumbnails com `alt`, botões com `aria-label`, foco gerenciado na abertura |
| Drag | Drag nativo (WebContents.startDrag) compatível com WhatsApp Desktop e Explorer do Windows |
| PDF | Usa `pdf-lib` (pure JS, sem binário nativo); uma imagem por página, página no tamanho da imagem |
| Segurança | DataUrls não são expostos a APIs externas; arquivos temp ficam em diretório privado do OS |

---

## 10. Configurações afetadas

| Campo | Tipo | Padrão | Validação |
|---|---|---|---|
| `sequenceTimeoutSec` | `number` | `5` | Inteiro entre 2 e 60 |

---

## 11. Fora do Escopo (MVP)

- Reordenar imagens na galeria
- Remover imagem individual da galeria
- Anotar imagem dentro da galeria
- Mesclar todas as capturas em uma única imagem
- Upload automático para nuvem

---

## 12. Dependências

- Feature 0001–0004 (base do app) — todas entregues
- Nova dependência de runtime: `pdf-lib` (pure JS, sem binário nativo)

---

## 13. Riscos

| Risco | Mitigação |
|---|---|
| DataUrls grandes (10+ prints de 4K) aumentam uso de memória do buffer | Limitar buffer a 20 itens; acima disso galeria abre automaticamente |
| `startDrag` em Electron pode não funcionar em certas janelas no Windows | Testar com WhatsApp Desktop; fallback: botão "Copiar arquivo" |
| Usuário fecha galeria antes de arrastar todos os itens | Arquivos temp permanecem até a galeria fechar; sem problema |

---

## 14. Dúvidas em Aberto

Nenhuma — todas as decisões críticas foram resolvidas no checkpoint inicial.

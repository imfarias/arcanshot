# 0012 — OCR do Print: Copiar o Texto da Imagem

**Data:** 2026-10-13 · **Autor:** arc-requisito (via arc-specfull)
**Status:** Aprovado
**Relacionada a:** 0001 (editor de captura)

## 1. Contexto e Objetivo

Quem captura uma tela muitas vezes quer o **texto** que está nela (um erro, um número, um trecho de documento) e não a imagem. Hoje é preciso digitar à mão. A feature lê o texto da área selecionada e o coloca no clipboard, pronto para o `Ctrl+V`.

## 2. Atores
Usuário; editor de captura (dispara); main process (lê o texto e copia).

## 3. Pré-condições
Windows 10/11 com ao menos um idioma de reconhecimento de texto instalado (o Windows já traz o do idioma de exibição); editor de captura aberto com uma área selecionada.

## 4. Fluxo Principal
1. O usuário seleciona uma área e, no editor, clica em **Copiar texto da imagem (OCR)** (ou aperta `Ctrl+Shift+C`).
2. Um aviso "Lendo o texto da imagem…" aparece e o botão fica desabilitado.
3. O texto reconhecido é copiado como **texto** para o clipboard, preservando as linhas.
4. O aviso muda para "Texto copiado · N caracteres" e some depois de alguns segundos.
5. O editor **continua aberto**: dá para copiar a imagem também, anotar, salvar ou cancelar.

## 5. Fluxos Alternativos
- **FA-1 — Nenhum texto na área:** aviso "Nenhum texto encontrado nessa área"; o clipboard não é alterado.
- **FA-2 — OCR indisponível** (sem idioma de OCR no Windows, PowerShell bloqueado por política): aviso "OCR indisponível: instale um idioma de reconhecimento de texto no Windows".
- **FA-3 — Falha na leitura** (erro ou demora acima de 30 s): aviso "Não foi possível ler o texto da imagem"; o editor segue utilizável.
- **FA-4 — Outro pedido durante a leitura:** ignorado (um OCR por vez).
- **FA-5 — Re-edição na galeria:** o botão funciona igual.

## 6. Tela(s)

Elementos dentro do editor, sem tela nova:

| # | Campo | Label | Tipo | Obrigatório | Default | Validação | Acessibilidade | Observações |
|---|---|---|---|---|---|---|---|---|
| 1 | Botão de OCR | "Copiar o texto da imagem (OCR)" (tooltip com o atalho) | botão-ícone na barra de ações, antes de "Copiar" | — | habilitado | desabilitado enquanto lê | `aria-label`, `title`, `data-testid="editor-ocr"` | Ícone de moldura de leitura com linhas de texto |
| 2 | Aviso de status | texto conforme o estado | região de status | — | oculto | some em 4 s (exceto "Lendo") | `role="status"`, `data-testid="editor-ocr-status"` | Topo e centro do monitor |

### Estados
Ocioso → Lendo (botão desabilitado) → Copiado / Nenhum texto / Indisponível / Erro (aviso por 4 s) → Ocioso.

### Mensagens
- "Lendo o texto da imagem…"
- "Texto copiado · {N} caractere(s)"
- "Nenhum texto encontrado nessa área"
- "OCR indisponível: instale um idioma de reconhecimento de texto no Windows"
- "Não foi possível ler o texto da imagem"

## 7. Regras de Negócio
- **RN-01:** a imagem lida é a **seleção com as anotações** (o que o "copiar" exportaria), **sem o acabamento** do embelezar.
- **RN-02:** desfoque e tarja sólida continuam escondendo o que cobrem: o OCR não lê o que a pessoa ocultou.
- **RN-03:** o texto vai para o clipboard como texto; o clipboard só muda em caso de sucesso.
- **RN-04:** o idioma é o do perfil do usuário no Windows; se não houver, o primeiro idioma de OCR disponível.
- **RN-05:** a linha da imagem vira uma linha do texto copiado; sem espaços sobrando nas pontas.
- **RN-06:** tudo é local: nenhuma imagem ou texto sai do computador, e o texto não é registrado em log.
- **RN-07:** imagens maiores que 8.000 px são reduzidas só para leitura; nunca ampliadas.
- **RN-08:** o OCR não fecha o editor nem copia/salva a imagem.

## 8. Permissões
Usuário local único.

## 9. Dados
Entrada: imagem PNG da seleção. Saída: texto no clipboard; no renderer só a contagem de caracteres e o idioma. Arquivo temporário apagado ao final.

## 10. Requisitos Não-Funcionais
- Resposta típica abaixo de 1,5 s para uma tela cheia.
- Sem aumento do instalador nem dependência nova.
- Falha nunca derruba o editor.

## 11. Dependências
`Windows.Media.Ocr` (parte do Windows), chamado por `powershell.exe` do sistema.

## 12. Fora de Escopo
Escolher o idioma; mostrar/editar o texto antes de copiar; OCR em lote na galeria; atalho global de OCR sem abrir o editor; outros sistemas operacionais; reconhecer manuscrito.

## 13. Glossário
**OCR:** reconhecimento óptico de caracteres — transformar o texto de uma imagem em texto de verdade.

## 14. Dúvidas em Aberto
Nenhuma. Decisões do usuário em 2026-10-13: motor = OCR do Windows; depois de copiar, o editor continua aberto.

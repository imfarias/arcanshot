# 0010 — Fundo da Página do PDF por Imagem

**Data:** 2026-10-09 · **Autor:** arc-requisito (via arc-specfull)
**Status:** Aprovado
**Relacionada a:** 0008 (Embelezar), 0009 (Páginas do mesmo tamanho)

## 1. Contexto e Objetivo

Com "Páginas do mesmo tamanho" ligado (0009), um print embelezado (moldura roxa, por exemplo) fica centralizado numa página **branca**: a moldura termina no meio da página e o branco em volta destoa dela.

**Objetivo:** a sobra da página assume o fundo do embelezar **da própria imagem**. Print com fundo roxo → página toda roxa; cada imagem usa o seu fundo.

## 2. Atores
Usuário (embeleza, tira a sequência, gera o PDF); main process (monta o PDF).

## 3. Pré-condições
Sequência de 2+ capturas na galeria; "Páginas do mesmo tamanho" ligado.

## 4. Fluxo Principal
1. Ao copiar/salvar uma captura com o embelezar ligado, o editor informa qual fundo ficou na imagem.
2. A captura entra na sequência guardando esse fundo.
3. Em *Gerar PDF* com a opção ligada, cada página é pintada com o fundo da sua imagem e o print é centralizado sobre ela.

## 5. Fluxos Alternativos
- **FA-1 — Sem embelezar, ou fundo "Nenhum (transparente)":** a página fica branca (como na 0009).
- **FA-2 — Opção "Páginas do mesmo tamanho" desligada:** nada muda; a página é a própria imagem, sem sobra a pintar.
- **FA-3 — Re-edição na galeria:** o item mantém o fundo que já tinha (o acabamento não é reaplicado).
- **FA-4 — Sequência com fundos diferentes:** cada página usa o seu (um roxo, outro grafite, outro branco).

## 6. Telas
Nenhuma tela nova nem campo novo: o comportamento acompanha a opção da 0009 e as escolhas do Embelezar.

## 7. Regras de Negócio
- **RN-09:** com páginas padronizadas, a página inteira é pintada com o fundo do embelezar da imagem.
- **RN-10:** fundo sólido → cor chapada; degradê → o mesmo degradê, do canto superior esquerdo ao inferior direito (mesmo eixo da imagem embelezada, para a página continuar a moldura).
- **RN-11:** sem fundo (ou transparente) → branco.
- **RN-12:** só o fundo que realmente ficou na imagem conta: embelezar desligado ou re-edição não informam fundo.
- **RN-13:** o fundo vale só no PDF; *Salvar todas*, clipboard e arquivos não mudam.

## 8. Permissões
Usuário local único.

## 9. Dados
Cada item da sequência ganha `background?` (id do preset de `shared/beautify`). Nada é persistido em disco.

## 10. Requisitos Não-Funcionais
Degradê nativo do PDF (vetorial, sem imagem extra, sem aumentar o arquivo); entrada do renderer tratada como não confiável (id desconhecido ou de tipo errado vira branco).

## 11. Dependências
0008 (presets), 0009 (páginas padronizadas).

## 12. Fora de Escopo
Escolher a cor do fundo do PDF à parte do embelezar; fundo para imagens que não foram embelezadas pelo app; ler a cor dos pixels da imagem.

## 13. Glossário
**Fundo da imagem:** id do preset de fundo do embelezar aplicado à imagem exportada.

## 14. Dúvidas em Aberto
Nenhuma. Pedido do usuário em 2026-10-09 ("se for roxo, deixar a página toda roxa… por imagem").

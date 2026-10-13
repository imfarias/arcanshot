# 0012 — Revisão Final

**Data:** 2026-10-13 · **Autor:** arc-lider (Momento B, via arc-specfull)

## Veredito: ✅ Aprovado

## 1. Aderência à Especificação
RN-01..RN-08 e FA-1..FA-5 atendidos; mensagens como especificadas. Decisões do usuário respeitadas (motor do Windows; editor continua aberto).

## 2. Aderência ao Desenho Técnico
Como desenhado, sem desvios.

## 3. Aderência à Arquitetura
Regra pura isolada e testada; nativo opcional que degrada; texto do usuário só no main e no clipboard; sem dependência nova.

## 4. Reutilização
`exportSelection`, `dataUrlToBuffer`, posição do aviso da 0011, `imageFactory`. Novo módulo `ocr` registrado em `COMPONENTS.md`.

## 5. Qualidade dos Testes
Integração com o Windows real e imagem real; erro coberto com o mesmo rigor do sucesso (vazio, indisponível, erro, exceção, ocupado); `data-testid` e ARIA verificados com axe.

## 6. Achados
- 🔴 nenhum · 🟡 nenhum
- 🔵 O idioma é o do Windows do usuário: texto em outro alfabeto (árabe, japonês) só é lido se o pacote do idioma estiver instalado. Aviso claro quando não há nenhum.
- 🔵 Em PCs com PowerShell em "Constrained Language", o OCR aparece como indisponível; sem solução sem componente nativo próprio.
- 🔵 Futuro: OCR em lote na galeria e escolha de idioma.

## 7. Próximos Passos
- [ ] PR e merge (publica a v0.7.0).
- [ ] Testar com prints reais do dia a dia (tabelas, código, texto em duas colunas).

## 8. Lições para a MEMORY
Para recursos do Windows com WinRT, o PowerShell 5.1 do sistema é uma ponte curta e estável; passar dados por variável de ambiente (não por argumento) e escrever o script sem acentos graves.

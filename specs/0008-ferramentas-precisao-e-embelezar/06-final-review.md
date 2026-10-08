# 0008 — Revisão Final

**Data:** 2026-08-26 · **Autor:** arc-lider (Momento B, via arc-specfull)
**Veredito:** ⚠️ **Aprovado com ressalvas**

---

## 1. Aderência à especificação

### Lupa e conta-gotas
| Regra | Verificação |
|---|---|
| RN-01 lupa na seleção e com conta-gotas | CT-FC-40/41/42 |
| RN-02 pixels sem suavização, coordenadas, hexadecimal | CT-MG-01/02/03 |
| RN-03 nunca sai da tela nem cobre o cursor | CT-UN-45→49, CT-MG-06 |
| RN-04 define a cor **e** copia o hexadecimal | CT-FC-43/45, CT-MG-04 |
| RN-05 não cria anotação | CT-FC-44 |
| RN-06 lê a imagem, não a máscara | Lê do canvas base (a máscara é pintada no canvas visível) |

### Traço livre
| Regra | Verificação |
|---|---|
| RN-07 cor e espessura ativas | CT-RN-04, CT-FC-46 |
| RN-08 suavização | CT-RN-03 (curvas quadráticas) |
| RN-09 menos de 2 pontos descartado | CT-FC-47 |
| RN-10 desfazer/refazer | CT-UN-50, CT-FC-50 |

### Tarja sólida
| Regra | Verificação |
|---|---|
| RN-11 opacidade total | CT-RN-01/02 + teste de contraste com o desfoque |
| RN-12 usa a cor ativa | CT-RN-01 |
| RN-13 mínimo | CT-FC-49 |
| RN-14 desfazível | CT-UN-51 |

### Embelezar
| Regra | Verificação |
|---|---|
| RN-15 só na exportação | CT-RN-07, CT-FC-54 |
| RN-16 preview fiel | CT-BP-07 |
| RN-17 proporcional | CT-BE-04/05/07/11 |
| RN-18 transparente força PNG | CT-BE-12, CT-RN-08 |
| RN-19 preferências persistidas | CT-FC-52 |
| RN-20 falha silenciosa | CT-FC-53 |
| RN-21 ausente na re-edição | CT-FC-55 + teste de exportação sem `clip` |
| RN-22 desligado = comportamento anterior | CT-RN-05/06, CT-BE-14, CT-UN-40 |

**As 22 regras atendidas e cobertas por teste.**

---

## 2. Aderência à arquitetura

| Critério | Avaliação |
|---|---|
| Lógica pura em `shared/` | ✅ `beautify.ts` é 100% puro e 100% coberto |
| Separação puro/canvas | ✅ Matemática em `shared/beautify.ts`, desenho em `lib/beautify.ts` |
| Campos planos em `AppSettings` | ✅ `mergeSettings` e `FieldErrors` funcionam sem refatoração |
| Compatibilidade de `settings.json` | ✅ CT-UN-42 prova que arquivo antigo recebe os defaults |
| Contrato IPC | ✅ +1 canal, nenhum existente alterado; validação no main além do renderer (§9) |
| Testes sem mock interno | ✅ Stubs restritos à fronteira do browser |
| a11y | ✅ `jest-axe` limpo em Toolbar, BeautifyPanel e Overlay; lupa marcada como decorativa |
| Decisão registrada | ✅ #9 no `ARCHITECTURE.md` |

---

## 3. Qualidade do código

**Pontos fortes**

- **A decisão de performance está certa e provada.** Ler a cor do canvas de 132 px em vez do canvas base não é só mais rápido — CT-MG-05 *verifica* que nenhum `getImageData` toca o canvas grande. É raro ver um requisito não-funcional virar asserção executável.
- **RN-22 é garantida por construção, não por disciplina.** O parâmetro de acabamento é opcional e CT-RN-05/06 comparam os dois caminhos. Quem mexer nisso no futuro quebra o teste.
- **A tarja tem um teste de contraste com o desfoque** — documenta no código a diferença de garantia que a spec descreve em prosa.
- **Dívida da feature anterior quitada:** a toolbar medida por `ResizeObserver` fecha a ressalva 🟡 R1 da 0007, e resolve a classe do problema (a constante voltaria a mentir na próxima ferramenta).
- **Dois bugs próprios encontrados e corrigidos antes da entrega** — um pelos testes (exceção não capturada no debounce, §5 do 04), outro na auto-revisão (efeito colateral dentro de função atualizadora do React, que produziria escrita dupla em StrictMode).

**Sem 🔴.** Nenhum bloqueador.

---

## 4. Ressalvas

### 🟡 R1 — `Overlay.tsx` chegou a ~710 linhas
O componente acumulou seleção, edição, 12 ferramentas, lupa, painel e medição de toolbar. Ainda é legível e coeso, mas está no limite. A próxima feature que mexer no editor deveria começar extraindo — os candidatos naturais são um `useSelection` (arrasto/redimensionamento) e um `useBeautifySettings` (estado + persistência com debounce).

Não foi feito aqui porque refatorar 700 linhas junto com 4 capacidades novas misturaria mudança estrutural e funcional no mesmo diff — exatamente o que dificulta revisar e reverter.

### 🟡 R2 — Preview do painel não reflete a resolução final
A miniatura reduz a captura para ~260 px antes de aplicar o acabamento. Geometricamente é fiel (RN-16 verificada), mas artefatos que só aparecem em resolução alta — como a nitidez do raio dos cantos num print 4K — não são visíveis na prévia. É o custo aceito da decisão de manter o preview barato (RNF-03).

### 🔵 R3 — Portão de lint vermelho por causa pré-existente (2ª feature seguida)
`TextInputLayer.tsx:40` referencia `jsx-a11y/no-autofocus` sem o plugin instalado. Vem da feature 0006, não commitada, e já foi reportado na revisão da 0007. **Duas features seguidas entregues com o portão vermelho** — vale corrigir antes da próxima, senão o lint deixa de ser sinal.

### 🔵 R4 — Verificações que só o uso real fecha
Fluidez da lupa (RNF-01), fidelidade visual do preview e a conferência da tarja com brilho/contraste no máximo. Roteiros A, C e D do `03-acceptance-criteria.md`.

---

## 5. Portões

| Portão | Resultado |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run build` | ✅ |
| `npm run test` | ✅ **273/273** (baseline 163) |
| `npm run lint` | ⚠️ 1 erro pré-existente (R3) |
| Cobertura dos módulos novos | ✅ 100% em `shared/beautify`, `lib/beautify`, `Magnifier` |
| Cobertura agregada | 67,5% → **77,1%** |

---

## 6. Veredito

⚠️ **Aprovado com ressalvas.** As quatro capacidades estão completas, cobertas e sem bloqueador. R1 e R2 são dívidas conscientes; R3 é de outra feature; R4 só o hardware e o olho fecham.

**Recomendação de ordem:** rodar os roteiros A–E → corrigir o lint da 0006 → fechar a feature 0006 → só então abrir a próxima. A próxima que tocar o editor deve começar pela extração descrita em R1.

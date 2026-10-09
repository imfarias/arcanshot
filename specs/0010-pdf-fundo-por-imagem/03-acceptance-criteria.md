# 0010 — Critérios de Aceite

**Data:** 2026-10-09 · **Autor:** arc-lider (Momento A, via arc-specfull)

## 1. Critérios Funcionais
- **CA-01:** com páginas padronizadas, a sobra da página tem o fundo do embelezar da imagem (RN-09).
- **CA-02:** degradê pinta a página inteira em degradê; sólido em cor chapada (RN-10).
- **CA-03:** sem embelezar, transparente ou id inválido → branco (RN-11).
- **CA-04:** cada imagem usa o próprio fundo (FA-4).
- **CA-05:** opção desligada → nenhum fundo desenhado (FA-2).
- **CA-06:** o editor só informa fundo se o acabamento foi aplicado (RN-12).
- **CA-07:** *Salvar todas*, clipboard e arquivos inalterados (RN-13).

## 2. Integração (main, pdf-lib real)
CT-PF-10 degradê (cores C0/C1 e operador `sh`) · CT-PF-11 sólido (retângulo da cor, sem sombreamento) · CT-PF-12 sem fundo/`none`/desconhecido → branco · CT-PF-13 fundos diferentes por imagem · CT-PF-14 desligado → nada desenhado · CT-PF-15 strings simples continuam aceitas.

## 3. Unitário
CT-PB-01..03 (`pageBackground`: presets, entradas inválidas, formato das cores) · CT-CS-10 (`CaptureSession` guarda o fundo só quando existe).

## 4. Componente
CT-FC-56 (copiar/salvar/salvar como informam o fundo) · CT-FC-57 (sem acabamento ou transparente → `undefined`) · CT-FC-58 (re-edição → `undefined`).

## 5. Integração FE / 6. E2E
Sem mudança: nenhuma tela ou campo novo; fluxos existentes cobrem regressão.

## 7. Massa de Dados
`imageFactory.pngDataUrl` (0009) com `background` por item.

## 8. Cobertura
`pdfBuilder.ts` e `shared/beautify.ts`: 100%.

## 9. Definition of Done
- [x] CA-01..CA-07 · [x] testes verdes (339) · [x] lint/typecheck · [x] PDF aberto no Chrome e conferido · [x] COMPONENTS/MEMORY/INDEX atualizados

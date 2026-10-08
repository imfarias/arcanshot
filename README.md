# ArcanShot

Captura de tela para Windows no estilo Flameshot/Lightshot: selecione uma área, a tela
atual ou todos os monitores; anote com retângulos, elipses, setas, linhas, texto,
marcador, desfoque e numeração passo-a-passo; copie para o clipboard ou salve em pasta
configurável. Fica residente na bandeja do sistema com atalhos globais.

## Desenvolvimento

```bash
npm install
npm run dev          # roda com hot-reload
npm test             # unit + integração + componente
npm run test:e2e     # E2E (Playwright + Electron, builda antes)
npm run lint
npm run typecheck
```

## Gerar instalador (.exe)

```bash
npm run dist
# saída: release/ArcanShot-Setup-<versão>.exe
```

> Sem certificado de code signing o Windows SmartScreen exibe aviso de "editor
> desconhecido" — clique em "Mais informações → Executar assim mesmo".

## Atalhos padrão

| Ação | Atalho |
|---|---|
| Capturar área | `PrintScreen` |
| Capturar tela atual | `Ctrl+PrintScreen` |
| Capturar todos os monitores | `Shift+PrintScreen` |

No editor: `Ctrl+C` copia, `Ctrl+S` salva, `Ctrl+Shift+S` salvar como, `Ctrl+Z`/`Ctrl+Y`
desfaz/refaz, `Esc` cancela.

Documentação de arquitetura e do pipeline de features: pasta [`specs/`](specs/).

## Apoie o projeto

O ArcanShot é gratuito e sem anúncios. Se ele te ajuda, considere uma doação via Pix, de qualquer valor:

<img src="site/web/public/pix-qr.svg" alt="QR code Pix para doar ao ArcanShot" width="200" />

Pix copia e cola:

```
00020126580014br.gov.bcb.pix01369f412e4b-b639-431e-a97a-847dee4789aa5204000053039865802BR5915VINICIUS FARIAS6006BRASIL62070503***6304AD63
```

Chave aleatória: `9f412e4b-b639-431e-a97a-847dee4789aa`. Também em [arcanshot.vfconsultoria.dev](https://arcanshot.vfconsultoria.dev/#apoie)
e no menu da bandeja do app (**Apoiar o projeto**).

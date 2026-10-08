# Contribuindo com o ArcanShot

Obrigado pelo interesse! Toda ajuda conta: relatos de bug, ideias, documentação e código.

## Reportar um problema ou sugerir uma ideia

Abra uma [issue](https://github.com/imfarias/arcanshot/issues/new) contando:

- o que você fez, o que esperava e o que aconteceu;
- versão do ArcanShot (menu da bandeja → Configurações) e do Windows;
- quantos monitores e qual escala (100%, 150%…), se o problema for de captura.

## Rodando o projeto

Requisitos: Windows 10/11 e Node.js 22+.

```bash
npm install
npm run dev          # app com hot-reload
npm test             # testes unitários, de integração e de componentes
npm run lint
npm run typecheck
```

A arquitetura e o histórico de cada funcionalidade estão em [`specs/`](specs/).

## Enviando um pull request

1. Faça um fork e crie uma branch a partir da `master`.
2. Mantenha o estilo do código ao redor e inclua testes para o que mudou.
3. Garanta que `npm run lint`, `npm run typecheck` e `npm test` passam.
4. Use um título de PR no padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/):
   `fix: …`, `feat: …`, `docs: …`. O PR entra com squash, e o título vira a mensagem do commit.

Todo merge na `master` gera uma release automaticamente. `feat` sobe a versão minor, `fix`/`docs`/`chore`
sobem a patch, e `feat!` ou `BREAKING CHANGE` sobem a major. Só o mantenedor faz merge.

## Licença

Ao contribuir, você concorda que sua contribuição seja licenciada sob a [MIT](package.json), a mesma do projeto.

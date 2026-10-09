// @ts-expect-error script .mjs sem tipos
import { buildNotes, parseCommit } from '../../scripts/release-notes.mjs'

describe('release-notes', () => {
  it('tira o prefixo, o escopo e o número do PR e capitaliza', () => {
    expect(parseCommit('feat(editor): nova lupa de precisão (#12)')).toMatchObject({
      type: 'feat',
      scope: 'editor',
      text: 'Nova lupa de precisão'
    })
  })

  it('agrupa em Novidades e Correções e deixa de fora o que não é do app', () => {
    const notes = buildNotes(
      [
        'feat: atualização automática (#2)',
        'fix: desfoque cortava a borda (#7)',
        'feat(site): redesenho do site (#4)',
        'fix(ci): tag única (#3)',
        'chore: deps',
        'feat: algo interno\n\ncorpo do PR\n\n[skip release]'
      ],
      { previousTag: 'v0.3.0', version: '0.4.0' }
    )
    expect(notes).toContain('## Novidades\n\n- Atualização automática')
    expect(notes).toContain('## Correções\n\n- Desfoque cortava a borda')
    expect(notes).not.toMatch(/redesenho|Tag única|deps|algo interno|feat:|fix:/)
    expect(notes).toContain('compare/v0.3.0...v0.4.0')
  })

  it('sem mudança do app, diz isso com honestidade', () => {
    expect(buildNotes(['ci: ajuste', 'docs: readme'])).toBe('Ajustes internos, sem mudanças visíveis no aplicativo.\n')
  })
})

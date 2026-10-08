// @ts-expect-error script .mjs sem tipos
import { bumpType, bump, nextVersion } from '../../scripts/next-version.mjs'

describe('next-version', () => {
  it('fix/chore/docs geram patch', () => {
    expect(bumpType(['fix: corrige blur', 'chore: deps', 'docs: readme'])).toBe('patch')
  })

  it('feat gera minor, inclusive com escopo', () => {
    expect(bumpType(['fix: x', 'feat(gallery): arrastar'])).toBe('minor')
  })

  it('tipo! ou BREAKING CHANGE no corpo geram major', () => {
    expect(bumpType(['feat!: novo formato de settings'])).toBe('major')
    expect(bumpType(['refactor: ipc\n\nBREAKING CHANGE: canais renomeados'])).toBe('major')
  })

  it('bump zera os componentes inferiores', () => {
    expect(bump('v1.4.2', 'major')).toBe('2.0.0')
    expect(bump('1.4.2', 'minor')).toBe('1.5.0')
    expect(bump('1.4.2', 'patch')).toBe('1.4.3')
  })

  it('sem tag usa a versão do package.json', () => {
    expect(nextVersion({ lastTag: '', messages: ['feat: x'], pkgVersion: '0.1.0' })).toBe('0.1.0')
  })

  it('bump manual no package.json vence o calculado', () => {
    expect(nextVersion({ lastTag: 'v0.1.0', messages: ['fix: x'], pkgVersion: '1.0.0' })).toBe('1.0.0')
    expect(nextVersion({ lastTag: 'v0.1.0', messages: ['feat: x'], pkgVersion: '0.1.0' })).toBe('0.2.0')
  })
})

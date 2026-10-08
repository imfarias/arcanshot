// @ts-expect-error script .mjs sem tipos
import { patchLatestYml } from '../../scripts/update-latest-yml.mjs'

describe('update-latest-yml', () => {
  it('troca sha512 e size do arquivo e da raiz, preservando o resto', () => {
    const yml = [
      'version: 0.3.0',
      'files:',
      '  - url: ArcanShot-Setup-0.3.0.exe',
      '    sha512: AAA==',
      '    size: 100',
      'path: ArcanShot-Setup-0.3.0.exe',
      'sha512: AAA==',
      "releaseDate: '2026-10-08T22:30:00.000Z'"
    ].join('\n')
    const out = patchLatestYml(yml, 'NEW==', 250)
    expect(out).toContain('    sha512: NEW==')
    expect(out).toContain('\nsha512: NEW==')
    expect(out).toContain('    size: 250')
    expect(out).not.toContain('AAA==')
    expect(out).toContain('url: ArcanShot-Setup-0.3.0.exe')
    expect(out).toContain("releaseDate: '2026-10-08T22:30:00.000Z'")
  })
})

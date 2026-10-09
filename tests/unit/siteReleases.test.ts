import { DOWNLOAD_URL, resolveDownload } from '../../site/web/src/lib/releases'

describe('site: link de download', () => {
  const page = 'https://github.com/imfarias/arcanshot/releases/tag/v0.4.0'

  it('usa o link fixo quando a última release tem o ArcanShot-Setup.exe', () => {
    expect(resolveDownload([{ url: page, hasStableExe: true }])).toBe(DOWNLOAD_URL)
  })

  it('vai para a página da release quando ela saiu sem o .exe (em vez do 404)', () => {
    expect(resolveDownload([{ url: page, hasStableExe: false }])).toBe(page)
  })

  it('sem dados do GitHub no build, mantém o link fixo', () => {
    expect(resolveDownload([])).toBe(DOWNLOAD_URL)
  })
})

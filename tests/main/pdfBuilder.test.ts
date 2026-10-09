import { describe, expect, it } from 'vitest'
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, decodePDFRawStream } from 'pdf-lib'
import type { PDFRawStream } from 'pdf-lib'
import { buildPdf, planPdfPages } from '../../src/main/pdfBuilder'
import { JPG_16x8, jpgDataUrl, pngDataUrl } from '../factories/imageFactory'

async function pageSizes(buf: Buffer): Promise<[number, number][]> {
  const doc = await PDFDocument.load(buf)
  return doc.getPages().map((p) => [p.getWidth(), p.getHeight()])
}

/** Operadores desenhados na página, já decodificados (o pdf-lib comprime o conteúdo). */
async function pageContent(buf: Buffer, index: number): Promise<string> {
  const doc = await PDFDocument.load(buf)
  const contents = doc.getPage(index).node.Contents()
  const streams =
    contents instanceof PDFArray ? contents.asArray().map((r) => doc.context.lookup(r)) : [contents]
  return streams
    .map((st) => Buffer.from(decodePDFRawStream(st as PDFRawStream).decode()).toString('latin1'))
    .join('\n')
}

/** Cores [r,g,b] (0..1) das duas pontas do degradê da página, ou null se não há degradê. */
async function shadingColors(buf: Buffer, index: number): Promise<number[][] | null> {
  const doc = await PDFDocument.load(buf)
  const res = doc.getPage(index).node.normalizedEntries().Resources
  const shadings = res.lookupMaybe(PDFName.of('Shading'), PDFDict)
  if (!shadings) return null
  const fn = shadings.lookup(PDFName.of('Sh0'), PDFDict).lookup(PDFName.of('Function'), PDFDict)
  const nums = (key: string): number[] =>
    fn
      .lookup(PDFName.of(key), PDFArray)
      .asArray()
      .map((n) => (n as PDFNumber).asNumber())
  return [nums('C0'), nums('C1')]
}

const rgbOf = (hex: string): number[] => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255)
}
const fillOf = (content: string): number[] | null => {
  const m = content.match(/([\d.]+) ([\d.]+) ([\d.]+) rg/)
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}
const expectColor = (actual: number[] | null, hex: string): void => {
  expect(actual).not.toBeNull()
  rgbOf(hex).forEach((v, i) => expect(actual![i]).toBeCloseTo(v, 3))
}

// Integração: pdf-lib real, imagens reais, PDF lido de volta (0005 + 0009).
describe('buildPdf', () => {
  it('CT-PF-01: PDF com 1 item é buffer válido (começa com %PDF)', async () => {
    const buf = await buildPdf([pngDataUrl(4, 3)])
    expect(buf.toString('ascii', 0, 4)).toBe('%PDF')
  })

  it('CT-PF-02: PDF com N items tem N páginas', async () => {
    const buf = await buildPdf([pngDataUrl(2, 2), pngDataUrl(3, 3), pngDataUrl(4, 4)])
    expect(await pageSizes(buf)).toHaveLength(3)
  })

  it('CT-PF-03: desligado, cada página tem o tamanho da sua imagem (comportamento da 0005)', async () => {
    const buf = await buildPdf([pngDataUrl(300, 200), pngDataUrl(120, 400)])
    expect(await pageSizes(buf)).toEqual([
      [300, 200],
      [120, 400]
    ])
  })

  it('CT-PF-04: ligado, todas as páginas ficam do tamanho da captura de maior área', async () => {
    const buf = await buildPdf([pngDataUrl(300, 200), pngDataUrl(120, 400), pngDataUrl(800, 600)], {
      uniformSize: true
    })
    expect(await pageSizes(buf)).toEqual([
      [800, 600],
      [800, 600],
      [800, 600]
    ])
  })

  it('CT-PF-05: ligado, mistura de JPG e PNG gera páginas iguais', async () => {
    const buf = await buildPdf([jpgDataUrl(), pngDataUrl(40, 30)], { uniformSize: true })
    expect(await pageSizes(buf)).toEqual([
      [40, 30],
      [40, 30]
    ])
  })

  it('CT-PF-06: ligado com todas do mesmo tamanho dá o mesmo resultado que desligado', async () => {
    const items = [pngDataUrl(64, 48), pngDataUrl(64, 48)]
    expect(await pageSizes(await buildPdf(items, { uniformSize: true }))).toEqual(
      await pageSizes(await buildPdf(items))
    )
  })

  it('CT-PF-07: dataUrl inválido rejeita (o handler converte em { ok: false })', async () => {
    await expect(buildPdf(['não é imagem'])).rejects.toThrow()
    await expect(buildPdf(['data:image/png;base64,AAAA'], { uniformSize: true })).rejects.toThrow()
  })

  it('JPEG de referência tem as dimensões declaradas pela factory', async () => {
    expect(await pageSizes(await buildPdf([jpgDataUrl()]))).toEqual([[JPG_16x8.width, JPG_16x8.height]])
  })
})

describe('buildPdf — fundo da página por imagem (0010)', () => {
  const U = { uniformSize: true }
  const small = (): string => pngDataUrl(40, 30)
  const big = (): string => pngDataUrl(200, 150)

  it('CT-PF-10: degradê do embelezar pinta a página inteira (sombreamento axial do canto ao canto)', async () => {
    const buf = await buildPdf([{ dataUrl: big() }, { dataUrl: small(), background: 'violet' }], U)
    const colors = await shadingColors(buf, 1)
    expect(colors).not.toBeNull()
    expectColor(colors![0], '#654ea3')
    expectColor(colors![1], '#eaafc8')
    expect(await pageContent(buf, 1)).toMatch(/\/Sh0 sh/)
  })

  it('CT-PF-11: fundo sólido vira retângulo da cor do preset, sem sombreamento', async () => {
    const buf = await buildPdf([{ dataUrl: big() }, { dataUrl: small(), background: 'graphite' }], U)
    expect(await shadingColors(buf, 1)).toBeNull()
    expectColor(fillOf(await pageContent(buf, 1)), '#18181b')
  })

  it('CT-PF-12: sem fundo, fundo transparente ou id desconhecido deixam a página branca', async () => {
    const buf = await buildPdf(
      [
        { dataUrl: big() },
        { dataUrl: small() },
        { dataUrl: small(), background: 'none' },
        { dataUrl: small(), background: 'arco-iris' }
      ],
      U
    )
    for (let i = 1; i < 4; i++) {
      expect(await shadingColors(buf, i)).toBeNull()
      expect(fillOf(await pageContent(buf, i))).toEqual([1, 1, 1])
    }
  })

  it('CT-PF-13: cada imagem usa o seu próprio fundo (por imagem, não um só para o PDF)', async () => {
    const buf = await buildPdf(
      [
        { dataUrl: big(), background: 'ocean' },
        { dataUrl: small(), background: 'violet' },
        { dataUrl: small(), background: 'paper' },
        { dataUrl: small() }
      ],
      U
    )
    expectColor((await shadingColors(buf, 0))![0], '#2e3192')
    expectColor((await shadingColors(buf, 1))![0], '#654ea3')
    expect(await shadingColors(buf, 2)).toBeNull()
    expectColor(fillOf(await pageContent(buf, 2)), '#f4f4f5')
    expect(fillOf(await pageContent(buf, 3))).toEqual([1, 1, 1])
  })

  it('CT-PF-14: com a opção desligada nenhum fundo é desenhado (a página é a própria imagem)', async () => {
    const buf = await buildPdf([
      { dataUrl: big(), background: 'violet' },
      { dataUrl: small(), background: 'graphite' }
    ])
    for (let i = 0; i < 2; i++) {
      expect(await shadingColors(buf, i)).toBeNull()
      expect(fillOf(await pageContent(buf, i))).toBeNull()
    }
  })

  it('CT-PF-15: strings simples continuam aceitas (compatível com a 0005 e a 0009)', async () => {
    const buf = await buildPdf([big(), small()], U)
    expect(await pageSizes(buf)).toEqual([
      [200, 150],
      [200, 150]
    ])
  })
})

describe('planPdfPages', () => {
  it('CT-PL-01: desligado, página = imagem e desenho cheio em (0,0)', () => {
    expect(planPdfPages([{ width: 300, height: 200 }], false)).toEqual([
      { page: { width: 300, height: 200 }, draw: { x: 0, y: 0, width: 300, height: 200 } }
    ])
  })

  it('CT-PL-02: ligado, a referência é a maior área (não a maior largura nem a maior altura)', () => {
    const plans = planPdfPages(
      [
        { width: 1000, height: 100 }, // mais larga, área 100k
        { width: 100, height: 900 }, // mais alta, área 90k
        { width: 500, height: 400 } // maior área, 200k
      ],
      true
    )
    for (const p of plans) expect(p.page).toEqual({ width: 500, height: 400 })
  })

  it('CT-PL-03: empate de área fica com a primeira', () => {
    const plans = planPdfPages(
      [
        { width: 200, height: 100 },
        { width: 100, height: 200 }
      ],
      true
    )
    expect(plans[1].page).toEqual({ width: 200, height: 100 })
  })

  it('CT-PL-04: print menor que a página não é ampliado e fica centralizado', () => {
    const [, small] = planPdfPages(
      [
        { width: 800, height: 600 },
        { width: 200, height: 100 }
      ],
      true
    )
    expect(small.draw).toEqual({ x: 300, y: 250, width: 200, height: 100 })
  })

  it('CT-PL-05: print mais largo que a página é reduzido pela largura, mantendo a proporção', () => {
    const [, wide] = planPdfPages(
      [
        { width: 500, height: 400 },
        { width: 1000, height: 100 }
      ],
      true
    )
    expect(wide.draw).toEqual({ x: 0, y: 175, width: 500, height: 50 })
  })

  it('CT-PL-06: print mais alto que a página é reduzido pela altura', () => {
    const [, tall] = planPdfPages(
      [
        { width: 500, height: 400 },
        { width: 100, height: 800 }
      ],
      true
    )
    expect(tall.draw).toEqual({ x: 225, y: 0, width: 50, height: 400 })
  })

  it('CT-PL-07: lista vazia devolve lista vazia nos dois modos', () => {
    expect(planPdfPages([], true)).toEqual([])
    expect(planPdfPages([], false)).toEqual([])
  })

  it('a proporção de todo print é preservada e nada passa da página', () => {
    const sizes = [
      { width: 1920, height: 1080 },
      { width: 333, height: 777 },
      { width: 2560, height: 400 },
      { width: 50, height: 50 }
    ]
    for (const { page, draw } of planPdfPages(sizes, true)) {
      expect(draw.x).toBeGreaterThanOrEqual(0)
      expect(draw.y).toBeGreaterThanOrEqual(0)
      expect(draw.x * 2 + draw.width).toBeCloseTo(page.width)
      expect(draw.y * 2 + draw.height).toBeCloseTo(page.height)
    }
    planPdfPages(sizes, true).forEach(({ draw }, i) => {
      expect(draw.width / draw.height).toBeCloseTo(sizes[i].width / sizes[i].height)
      expect(draw.width).toBeLessThanOrEqual(sizes[i].width)
    })
  })
})

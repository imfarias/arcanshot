import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { buildPdf, planPdfPages } from '../../src/main/pdfBuilder'
import { JPG_16x8, jpgDataUrl, pngDataUrl } from '../factories/imageFactory'

async function pageSizes(buf: Buffer): Promise<[number, number][]> {
  const doc = await PDFDocument.load(buf)
  return doc.getPages().map((p) => [p.getWidth(), p.getHeight()])
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

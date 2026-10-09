import { PDFDocument, PDFName, PDFOperator, PDFOperatorNames, popGraphicsState, pushGraphicsState, rgb } from 'pdf-lib'
import type { PDFImage, PDFPage } from 'pdf-lib'
import { pageBackground } from '@shared/beautify'
import type { BackgroundPreset } from '@shared/beautify'
import { dataUrlToBuffer } from './saveImage'

// Montagem do PDF da sequência (0005, 0009, 0010). Sem `import 'electron'`: testável com pdf-lib real.

export interface Size {
  width: number
  height: number
}

export interface PdfPagePlan {
  page: Size
  draw: { x: number; y: number; width: number; height: number }
}

/** Uma captura do PDF; `background` é o id do fundo do embelezar que ficou na imagem. */
export interface PdfInput {
  dataUrl: string
  background?: string
}

/**
 * Tamanho de cada página e onde o print é desenhado nela.
 * - Desligado: página do tamanho do próprio print (comportamento da 0005).
 * - Ligado: toda página do tamanho da captura de maior área (empate: a primeira — RN-02);
 *   o print só é reduzido se não couber, nunca ampliado nem distorcido (RN-03), e fica
 *   centralizado (RN-04). Com centralização simétrica, `y` é o mesmo com origem em cima
 *   ou embaixo, então não há inversão para o sistema de coordenadas do PDF.
 */
export function planPdfPages(sizes: Size[], uniform: boolean): PdfPagePlan[] {
  if (!uniform || sizes.length === 0) {
    return sizes.map(({ width, height }) => ({
      page: { width, height },
      draw: { x: 0, y: 0, width, height }
    }))
  }
  const ref = sizes.reduce((best, s) => (s.width * s.height > best.width * best.height ? s : best))
  return sizes.map(({ width, height }) => {
    const scale = Math.min(1, ref.width / width, ref.height / height)
    const w = width * scale
    const h = height * scale
    return {
      page: { width: ref.width, height: ref.height },
      draw: { x: (ref.width - w) / 2, y: (ref.height - h) / 2, width: w, height: h }
    }
  })
}

/** '#rrggbb' → [0..1, 0..1, 0..1]. Os presets são todos nesse formato. */
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/**
 * Pinta a página inteira (0010, RN-09): sólido vira retângulo; degradê vira um degradê axial
 * nativo do PDF, do canto superior esquerdo ao inferior direito — o mesmo eixo do canvas do
 * embelezar (`createLinearGradient(0, 0, w, h)`), então a página continua a moldura da imagem.
 * Sem preset (sem embelezar, ou fundo transparente), a página é branca.
 */
function paintPageBackground(doc: PDFDocument, page: PDFPage, size: Size, preset: BackgroundPreset | null): void {
  if (preset?.type === 'gradient') {
    const [c0, c1] = preset.colors.map(hexToRgb)
    const fn = doc.context.obj({ FunctionType: 2, Domain: [0, 1], C0: c0, C1: c1, N: 1 })
    const shading = doc.context.obj({
      ShadingType: 2,
      ColorSpace: 'DeviceRGB',
      Coords: [0, size.height, size.width, 0], // origem do PDF é embaixo à esquerda
      Function: fn,
      Extend: [true, true]
    })
    const { Resources } = page.node.normalizedEntries()
    Resources.set(PDFName.of('Shading'), doc.context.obj({ Sh0: doc.context.register(shading) }))
    page.pushOperators(
      pushGraphicsState(),
      PDFOperator.of(PDFOperatorNames.ShadingFill, [PDFName.of('Sh0')]),
      popGraphicsState()
    )
    return
  }
  const color = preset?.type === 'solid' ? rgb(...hexToRgb(preset.colors[0])) : rgb(1, 1, 1)
  page.drawRectangle({ x: 0, y: 0, ...size, color })
}

/** Uma página por captura, na ordem recebida. Lança se algum dataUrl não for PNG/JPG válido. */
export async function buildPdf(
  inputs: (string | PdfInput)[],
  opts: { uniformSize?: boolean } = {}
): Promise<Buffer> {
  const uniform = opts.uniformSize === true
  const items: PdfInput[] = inputs.map((i) => (typeof i === 'string' ? { dataUrl: i } : i))
  const doc = await PDFDocument.create()
  const images: PDFImage[] = []
  for (const { dataUrl } of items) {
    const buf = dataUrlToBuffer(dataUrl)
    const isPng = dataUrl.startsWith('data:image/png')
    images.push(isPng ? await doc.embedPng(buf) : await doc.embedJpg(buf))
  }
  const plans = planPdfPages(
    images.map((img) => ({ width: img.width, height: img.height })),
    uniform
  )
  plans.forEach((plan, i) => {
    const page = doc.addPage([plan.page.width, plan.page.height])
    // Fundo explícito só no modo padronizado, onde sobra página: no modo original a página
    // tem o tamanho exato da imagem. A sobra continua a moldura do embelezar de CADA imagem.
    if (uniform) paintPageBackground(doc, page, plan.page, pageBackground(items[i].background))
    page.drawImage(images[i], plan.draw)
  })
  return Buffer.from(await doc.save())
}

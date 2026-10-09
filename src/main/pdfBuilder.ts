import { PDFDocument, rgb } from 'pdf-lib'
import type { PDFImage } from 'pdf-lib'
import { dataUrlToBuffer } from './saveImage'

// Montagem do PDF da sequência (0005, 0009). Sem `import 'electron'`: testável com pdf-lib real.

export interface Size {
  width: number
  height: number
}

export interface PdfPagePlan {
  page: Size
  draw: { x: number; y: number; width: number; height: number }
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

/** Uma página por captura, na ordem recebida. Lança se algum dataUrl não for PNG/JPG válido. */
export async function buildPdf(dataUrls: string[], opts: { uniformSize?: boolean } = {}): Promise<Buffer> {
  const uniform = opts.uniformSize === true
  const doc = await PDFDocument.create()
  const images: PDFImage[] = []
  for (const dataUrl of dataUrls) {
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
    // fundo branco explícito: um PNG com transparência não pode deixar a sobra indefinida
    if (uniform) {
      page.drawRectangle({ x: 0, y: 0, ...plan.page, color: rgb(1, 1, 1) })
    }
    page.drawImage(images[i], plan.draw)
  })
  return Buffer.from(await doc.save())
}

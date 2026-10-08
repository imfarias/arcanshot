import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'

// Helper mínimo que reusa a mesma lógica do ipc.ts sem importar Electron
async function buildPdf(dataUrls: string[]): Promise<Buffer> {
  const doc = await PDFDocument.create()
  for (const dataUrl of dataUrls) {
    const comma = dataUrl.indexOf(',')
    const buf = Buffer.from(dataUrl.slice(comma + 1), 'base64')
    const isPng = dataUrl.startsWith('data:image/png')
    const img = isPng ? await doc.embedPng(buf) : await doc.embedJpg(buf)
    const page = doc.addPage([img.width, img.height])
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
  }
  return Buffer.from(await doc.save())
}

// PNG 1×1 pixel mínimo válido (base64)
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

describe('buildPdf', () => {
  it('CT-PF-01: PDF com 1 item é buffer válido (começa com %PDF)', async () => {
    const buf = await buildPdf([TINY_PNG])
    expect(buf.toString('ascii', 0, 4)).toBe('%PDF')
  })

  it('CT-PF-02: PDF com N items tem N páginas', async () => {
    const buf = await buildPdf([TINY_PNG, TINY_PNG, TINY_PNG])
    const doc = await PDFDocument.load(buf)
    expect(doc.getPageCount()).toBe(3)
  })

  it('CT-PF-03: cada página tem dimensões da imagem de entrada', async () => {
    const buf = await buildPdf([TINY_PNG])
    const doc = await PDFDocument.load(buf)
    const page = doc.getPage(0)
    expect(page.getWidth()).toBe(1)
    expect(page.getHeight()).toBe(1)
  })
})

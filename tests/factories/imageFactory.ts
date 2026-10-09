import { crc32, deflateSync } from 'node:zlib'

/**
 * Imagens reais (decodificáveis pelo pdf-lib), para testar tamanhos de página do PDF.
 * PNG de qualquer tamanho é gerado na hora: assinatura + IHDR (RGB 8 bits) + IDAT + IEND.
 */
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

export function pngBuffer(width: number, height: number, rgb: [number, number, number] = [37, 99, 235]): Buffer {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bits por canal
  ihdr[9] = 2 // RGB
  const row = Buffer.alloc(1 + width * 3) // byte de filtro 0 + pixels
  for (let x = 0; x < width; x++) row.set(rgb, 1 + x * 3)
  const raw = Buffer.concat(Array.from({ length: height }, () => row))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ])
}

export function pngDataUrl(width: number, height: number, rgb?: [number, number, number]): string {
  return 'data:image/png;base64,' + pngBuffer(width, height, rgb).toString('base64')
}

/** JPEG real de 16×8 (azul de seleção), gerado uma vez com ffmpeg — não há encoder JPEG aqui. */
export const JPG_16x8 = { width: 16, height: 8 }
export function jpgDataUrl(): string {
  return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAAQABAAD//gAPTGF2YzYzLjEuMTAyAP/bAEMACBAQExATFhYWFhYWGhgaGxsbGhoaGhsbGx0dHSIiIh0dHRsbHR0gICIiJSYlIyMiIyYmKCgoMDAuLjg4OkVFU//EAEwAAQEAAAAAAAAAAAAAAAAAAAAGAQEBAAAAAAAAAAAAAAAAAAAGBxABAAAAAAAAAAAAAAAAAAAAABEBAAAAAAAAAAAAAAAAAAAAAP/AABEIAAgAEAMBIgACEQADEQD/2gAMAwEAAhEDEQA/AJ4BThR//9k='
}

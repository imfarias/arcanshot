import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { formatFilename } from '@shared/filenamePattern'

export function dataUrlToBuffer(dataUrl: string): Buffer {
  const comma = dataUrl.indexOf(',')
  if (comma < 0 || !dataUrl.startsWith('data:image/')) {
    throw new Error('dataURL de imagem inválida')
  }
  return Buffer.from(dataUrl.slice(comma + 1), 'base64')
}

/** Caminho livre de colisão: `nome.png`, `nome (1).png`, `nome (2).png`… (RN2) */
export function uniquePath(dir: string, baseName: string, ext: string): string {
  let candidate = join(dir, `${baseName}.${ext}`)
  let counter = 1
  while (existsSync(candidate)) {
    candidate = join(dir, `${baseName} (${counter}).${ext}`)
    counter++
  }
  return candidate
}

export interface SaveCaptureOptions {
  saveDir: string
  filenamePattern: string
  imageFormat: 'png' | 'jpg'
  now?: Date
}

export function saveCapture(
  imageBuffer: Buffer,
  options: SaveCaptureOptions
): { ok: true; filePath: string } | { ok: false; error: string } {
  try {
    mkdirSync(options.saveDir, { recursive: true })
    const baseName = formatFilename(options.filenamePattern, options.now ?? new Date())
    const filePath = uniquePath(options.saveDir, baseName, options.imageFormat)
    writeFileSync(filePath, imageBuffer)
    return { ok: true, filePath }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/** Grava num caminho explícito (Salvar como). */
export function saveToPath(
  imageBuffer: Buffer,
  filePath: string
): { ok: true; filePath: string } | { ok: false; error: string } {
  try {
    writeFileSync(filePath, imageBuffer)
    return { ok: true, filePath }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

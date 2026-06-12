import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { dataUrlToBuffer, saveCapture, saveToPath, uniquePath } from '../../src/main/saveImage'

// PNG 1x1 válido
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
const DATA_URL = `data:image/png;base64,${PNG_BASE64}`
const PNG_BUFFER = Buffer.from(PNG_BASE64, 'base64')

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'arcanshot-save-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('dataUrlToBuffer', () => {
  it('decodifica dataURL de imagem', () => {
    expect(dataUrlToBuffer(DATA_URL).equals(PNG_BUFFER)).toBe(true)
  })

  it('rejeita dataURL que não é imagem', () => {
    expect(() => dataUrlToBuffer('data:text/plain;base64,aGk=')).toThrow(/inválida/)
    expect(() => dataUrlToBuffer('lixo')).toThrow(/inválida/)
  })
})

describe('saveCapture (integração com fs real)', () => {
  const now = new Date(2026, 5, 12, 14, 30, 45)

  it('CT-MI-05: cria pasta inexistente e grava bytes corretos (RN8)', () => {
    const saveDir = join(dir, 'sub', 'capturas')
    const result = saveCapture(PNG_BUFFER, {
      saveDir,
      filenamePattern: 'Captura_%Y-%m-%d_%H-%M-%S',
      imageFormat: 'png',
      now
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.filePath).toBe(join(saveDir, 'Captura_2026-06-12_14-30-45.png'))
      expect(readFileSync(result.filePath).equals(PNG_BUFFER)).toBe(true)
    }
  })

  it('CT-MI-06: colisões geram sufixo (1), (2) — nunca sobrescreve (RN2)', () => {
    const options = { saveDir: dir, filenamePattern: 'shot', imageFormat: 'png' as const, now }
    saveCapture(PNG_BUFFER, options)
    saveCapture(Buffer.from('segunda'), options)
    saveCapture(Buffer.from('terceira'), options)

    const files = readdirSync(dir).sort()
    expect(files).toEqual(['shot (1).png', 'shot (2).png', 'shot.png'])
    expect(readFileSync(join(dir, 'shot.png')).equals(PNG_BUFFER)).toBe(true)
    expect(readFileSync(join(dir, 'shot (1).png')).toString()).toBe('segunda')
  })

  it('CT-MI-07: formato jpg gera extensão .jpg', () => {
    const result = saveCapture(PNG_BUFFER, {
      saveDir: dir,
      filenamePattern: 'foto_%d',
      imageFormat: 'jpg',
      now
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.filePath.endsWith('foto_12.jpg')).toBe(true)
  })

  it('CT-MI-08: pasta inválida retorna erro estruturado sem gravar nada', () => {
    // um arquivo no caminho impede o mkdir do diretório
    const blocker = join(dir, 'arquivo')
    writeFileSync(blocker, 'x')
    const result = saveCapture(PNG_BUFFER, {
      saveDir: join(blocker, 'sub'),
      filenamePattern: 'shot',
      imageFormat: 'png',
      now
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0)
    expect(existsSync(join(blocker, 'sub'))).toBe(false)
  })
})

describe('uniquePath / saveToPath', () => {
  it('uniquePath devolve o nome simples quando livre', () => {
    expect(uniquePath(dir, 'a', 'png')).toBe(join(dir, 'a.png'))
  })

  it('saveToPath grava no caminho exato e reporta falha estruturada', () => {
    const target = join(dir, 'exato.png')
    const ok = saveToPath(PNG_BUFFER, target)
    expect(ok.ok).toBe(true)
    expect(readFileSync(target).equals(PNG_BUFFER)).toBe(true)

    const fail = saveToPath(PNG_BUFFER, join(dir, 'nao-existe', 'x.png'))
    expect(fail.ok).toBe(false)
  })
})

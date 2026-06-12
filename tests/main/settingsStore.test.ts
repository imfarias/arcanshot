import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SettingsStore } from '../../src/main/settingsStore'
import { seedSettingsFile } from '../factories/seedSettings'

const PICTURES = 'C:\\Users\\teste\\Pictures'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'arcanshot-store-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('SettingsStore (integração com fs real)', () => {
  it('CT-MI-01: load sem arquivo retorna defaults e não cria arquivo', () => {
    const store = new SettingsStore(dir, PICTURES)
    const settings = store.load()
    expect(settings.saveDir).toBe(`${PICTURES}\\ArcanShot`)
    expect(existsSync(store.filePath)).toBe(false)
  })

  it('CT-MI-02: save persiste e nova instância lê o merge correto', () => {
    const store = new SettingsStore(dir, PICTURES)
    store.save({ imageFormat: 'jpg', jpgQuality: 75 })

    const reloaded = new SettingsStore(dir, PICTURES).load()
    expect(reloaded.imageFormat).toBe('jpg')
    expect(reloaded.jpgQuality).toBe(75)
    expect(reloaded.hotkeyArea).toBe('PrintScreen') // default preservado

    const onDisk = JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf-8'))
    expect(onDisk.imageFormat).toBe('jpg')
  })

  it('CT-MI-03: JSON corrompido degrada para defaults sem lançar (RN7)', () => {
    writeFileSync(join(dir, 'settings.json'), '{ corrompido!!!', 'utf-8')
    const store = new SettingsStore(dir, PICTURES)
    expect(store.load()).toEqual(store.defaults())
  })

  it('CT-MI-04: chave desconhecida é ignorada; ausente recebe default', () => {
    writeFileSync(
      join(dir, 'settings.json'),
      JSON.stringify({ imageFormat: 'jpg', chaveFutura: true }),
      'utf-8'
    )
    const settings = new SettingsStore(dir, PICTURES).load()
    expect(settings.imageFormat).toBe('jpg')
    expect('chaveFutura' in settings).toBe(false)
    expect(settings.filenamePattern).toBe('Captura_%Y-%m-%d_%H-%M-%S')
  })

  it('CT-MI-09: escrita atômica não deixa .tmp órfão', () => {
    const store = new SettingsStore(dir, PICTURES)
    store.save({ copyOnSave: false })
    store.save({ copyOnSave: true })
    expect(readdirSync(dir)).toEqual(['settings.json'])
  })

  it('lê settings semeadas pelo seeder', () => {
    const seeded = seedSettingsFile(dir, { filenamePattern: 'Seed_%Y' })
    const settings = new SettingsStore(dir, PICTURES).load()
    expect(settings.filenamePattern).toBe('Seed_%Y')
    expect(settings.saveDir).toBe(seeded.saveDir)
  })
})

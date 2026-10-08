import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DisplayCacheStore } from '../../src/main/displayCacheStore'
import { displayInfoFactory } from '../factories/displayInfoFactory'
import type { DisplayInfo } from '@shared/types'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'arcanshot-cache-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('DisplayCacheStore (integração com fs real)', () => {
  it('CT-DC-01: load retorna null quando arquivo não existe', () => {
    const store = new DisplayCacheStore(dir)
    expect(store.load()).toBeNull()
  })

  it('CT-DC-02: load retorna null quando arquivo contém JSON corrompido', () => {
    writeFileSync(join(dir, 'display-cache.json'), '{ corrompido!!!', 'utf-8')
    expect(new DisplayCacheStore(dir).load()).toBeNull()
  })

  it('CT-DC-03: load retorna null quando conteúdo não é array', () => {
    writeFileSync(join(dir, 'display-cache.json'), JSON.stringify({ id: 1 }), 'utf-8')
    expect(new DisplayCacheStore(dir).load()).toBeNull()
  })

  it('CT-DC-04: load retorna null quando elemento não tem id numérico', () => {
    const invalid = [{ id: 'abc', bounds: { x: 0, y: 0, width: 1920, height: 1080 }, scaleFactor: 1 }]
    writeFileSync(join(dir, 'display-cache.json'), JSON.stringify(invalid), 'utf-8')
    expect(new DisplayCacheStore(dir).load()).toBeNull()
  })

  it('CT-DC-05: load retorna null quando elemento não tem bounds.x numérico', () => {
    const invalid = [{ id: 1, bounds: { y: 0, width: 1920, height: 1080 }, scaleFactor: 1 }]
    writeFileSync(join(dir, 'display-cache.json'), JSON.stringify(invalid), 'utf-8')
    expect(new DisplayCacheStore(dir).load()).toBeNull()
  })

  it('CT-DC-06: load retorna array válido quando arquivo tem estrutura correta', () => {
    const displays = displayInfoFactory.dualMonitor()
    writeFileSync(join(dir, 'display-cache.json'), JSON.stringify(displays), 'utf-8')
    const result = new DisplayCacheStore(dir).load()
    expect(result).toHaveLength(2)
    expect(result![0].id).toBe(displays[0].id)
  })

  it('CT-DC-07: save cria display-cache.json com conteúdo correto', () => {
    const displays = [displayInfoFactory()]
    new DisplayCacheStore(dir).save(displays)
    expect(existsSync(join(dir, 'display-cache.json'))).toBe(true)
    const onDisk: DisplayInfo[] = JSON.parse(readFileSync(join(dir, 'display-cache.json'), 'utf-8'))
    expect(onDisk[0].id).toBe(displays[0].id)
    expect(onDisk[0].scaleFactor).toBe(displays[0].scaleFactor)
  })

  it('CT-DC-08: round-trip save/load retorna dados equivalentes', () => {
    const displays = displayInfoFactory.dualMonitor()
    const store = new DisplayCacheStore(dir)
    store.save(displays)
    const loaded = store.load()
    expect(loaded).toHaveLength(2)
    expect(loaded![0].id).toBe(displays[0].id)
    expect(loaded![0].bounds).toEqual(displays[0].bounds)
    expect(loaded![0].scaleFactor).toBe(displays[0].scaleFactor)
    expect(loaded![1].id).toBe(displays[1].id)
  })

  it('CT-DC-09: escrita atômica não deixa .tmp após save', () => {
    const store = new DisplayCacheStore(dir)
    store.save([displayInfoFactory()])
    store.save([displayInfoFactory()])
    const files = readdirSync(dir)
    expect(files).toEqual(['display-cache.json'])
  })

  it('CT-DC-10: save não lança quando baseDir tem caminho inválido', () => {
    // Usa um arquivo como "diretório" para forçar erro no mkdirSync
    const fakeDir = join(dir, 'arquivo-que-existe')
    writeFileSync(fakeDir, 'bloqueio', 'utf-8')
    const badStore = new DisplayCacheStore(join(fakeDir, 'sub'))
    expect(() => badStore.save([displayInfoFactory()])).not.toThrow()
  })

  it('CT-DC-11: load retorna null após arquivo ser corrompido manualmente', () => {
    const store = new DisplayCacheStore(dir)
    store.save([displayInfoFactory()])
    writeFileSync(join(dir, 'display-cache.json'), 'CORROMPIDO', 'utf-8')
    expect(store.load()).toBeNull()
  })

  it('save sobrescreve cache anterior com novos dados', () => {
    const store = new DisplayCacheStore(dir)
    const [primary] = displayInfoFactory.dualMonitor()
    store.save([primary])
    expect(store.load()).toHaveLength(1)

    const [d1, d2] = displayInfoFactory.dualMonitor()
    store.save([d1, d2])
    expect(store.load()).toHaveLength(2)
  })
})

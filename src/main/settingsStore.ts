import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import type { AppSettings } from '@shared/types'
import { defaultSettings, mergeSettings } from '@shared/settings'

/**
 * Persistência de settings em JSON com escrita atômica.
 * Recebe os diretórios por parâmetro para ser testável sem Electron.
 */
export class SettingsStore {
  constructor(
    private readonly baseDir: string,
    private readonly picturesDir: string
  ) {}

  get filePath(): string {
    return join(this.baseDir, 'settings.json')
  }

  defaults(): AppSettings {
    return defaultSettings(this.picturesDir)
  }

  load(): AppSettings {
    const defaults = this.defaults()
    if (!existsSync(this.filePath)) return defaults
    try {
      const raw = readFileSync(this.filePath, 'utf-8')
      return mergeSettings(defaults, JSON.parse(raw))
    } catch {
      return defaults
    }
  }

  save(partial: Partial<AppSettings>): AppSettings {
    const merged = mergeSettings(this.load(), partial)
    mkdirSync(this.baseDir, { recursive: true })
    const tmpPath = this.filePath + '.tmp'
    writeFileSync(tmpPath, JSON.stringify(merged, null, 2), 'utf-8')
    try {
      renameSync(tmpPath, this.filePath)
    } catch (err) {
      rmSync(tmpPath, { force: true })
      throw err
    }
    return merged
  }
}

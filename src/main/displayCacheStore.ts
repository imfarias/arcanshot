import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { DisplayInfo } from '@shared/types'

export class DisplayCacheStore {
  constructor(private readonly baseDir: string) {}

  private get filePath(): string {
    return join(this.baseDir, 'display-cache.json')
  }

  load(): DisplayInfo[] | null {
    if (!existsSync(this.filePath)) return null
    try {
      const raw = readFileSync(this.filePath, 'utf-8')
      const data: unknown = JSON.parse(raw)
      if (!Array.isArray(data)) return null
      const valid = (data as unknown[]).filter(
        (d): d is DisplayInfo =>
          typeof (d as DisplayInfo).id === 'number' &&
          typeof (d as DisplayInfo).scaleFactor === 'number' &&
          typeof (d as DisplayInfo).bounds?.x === 'number'
      )
      return valid.length > 0 ? valid : null
    } catch {
      return null
    }
  }

  save(displays: DisplayInfo[]): void {
    try {
      mkdirSync(this.baseDir, { recursive: true })
      const tmpPath = this.filePath + '.tmp'
      writeFileSync(tmpPath, JSON.stringify(displays, null, 2), 'utf-8')
      try {
        renameSync(tmpPath, this.filePath)
      } catch {
        rmSync(tmpPath, { force: true })
      }
    } catch {
      // best-effort: nunca impede a captura
    }
  }
}

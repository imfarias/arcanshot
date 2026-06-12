import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { AppSettings } from '@shared/types'
import { settingsFactory } from './settingsFactory'

/** Grava um settings.json válido no diretório informado (usado em CT-MI e E2E). */
export function seedSettingsFile(dir: string, overrides: Partial<AppSettings> = {}): AppSettings {
  const settings = settingsFactory(overrides)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'settings.json'), JSON.stringify(settings, null, 2), 'utf-8')
  return settings
}

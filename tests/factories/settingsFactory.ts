import { faker } from '@faker-js/faker'
import type { AppSettings } from '@shared/types'
import { BACKGROUND_PRESETS } from '@shared/beautify'

/** Settings válidas com dados realistas; estados nomeados para variações comuns. */
export function settingsFactory(overrides: Partial<AppSettings> = {}): AppSettings {
  const user = faker.internet.username().replace(/[^a-zA-Z0-9._-]/g, '')
  return {
    saveDir: `C:\\Users\\${user}\\Pictures\\ArcanShot`,
    filenamePattern: `${faker.word.noun()}_%Y-%m-%d_%H-%M-%S`,
    imageFormat: 'png',
    jpgQuality: faker.number.int({ min: 60, max: 100 }),
    hotkeyArea: 'PrintScreen',
    hotkeyFull: 'Ctrl+PrintScreen',
    hotkeyAll: 'Shift+PrintScreen',
    launchOnStartup: faker.datatype.boolean(),
    copyOnSave: faker.datatype.boolean(),
    showNotifications: faker.datatype.boolean(),
    sequenceTimeoutSec: faker.number.int({ min: 2, max: 60 }),
    beautifyEnabled: false,
    beautifyBackground: faker.helpers.arrayElement(BACKGROUND_PRESETS).id,
    beautifyPadding: faker.number.int({ min: 0, max: 20 }),
    beautifyRounded: faker.datatype.boolean(),
    beautifyShadow: faker.datatype.boolean(),
    ...overrides
  }
}

/** Embelezamento ligado com fundo sólido e todos os acabamentos. */
settingsFactory.beautified = (overrides: Partial<AppSettings> = {}): AppSettings =>
  settingsFactory({
    beautifyEnabled: true,
    beautifyBackground: 'graphite',
    beautifyPadding: 8,
    beautifyRounded: true,
    beautifyShadow: true,
    ...overrides
  })

/** Embelezamento com fundo transparente — exercita a regra de forçar PNG (RN-18). */
settingsFactory.transparentBeautify = (overrides: Partial<AppSettings> = {}): AppSettings =>
  settingsFactory.beautified({ beautifyBackground: 'none', imageFormat: 'jpg', ...overrides })

settingsFactory.jpg = (overrides: Partial<AppSettings> = {}): AppSettings =>
  settingsFactory({ imageFormat: 'jpg', jpgQuality: 85, ...overrides })

settingsFactory.invalidQuality = (overrides: Partial<AppSettings> = {}): AppSettings =>
  settingsFactory({ imageFormat: 'jpg', jpgQuality: 250, ...overrides })

import { faker } from '@faker-js/faker'
import type { AppSettings } from '@shared/types'

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
    ...overrides
  }
}

settingsFactory.jpg = (overrides: Partial<AppSettings> = {}): AppSettings =>
  settingsFactory({ imageFormat: 'jpg', jpgQuality: 85, ...overrides })

settingsFactory.invalidQuality = (overrides: Partial<AppSettings> = {}): AppSettings =>
  settingsFactory({ imageFormat: 'jpg', jpgQuality: 250, ...overrides })

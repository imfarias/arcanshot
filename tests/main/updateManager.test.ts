import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import {
  RECHECK_INTERVAL_MS,
  STARTUP_DELAY_MS,
  UpdateManager,
  type UpdateNotice,
  type UpdaterLike
} from '../../src/main/updateManager'
import { settingsFactory } from '../factories/settingsFactory'
import type { AppSettings } from '@shared/types'

class FakeUpdater extends EventEmitter implements UpdaterLike {
  autoDownload = true
  autoInstallOnAppQuit = true
  checkForUpdates = vi.fn().mockResolvedValue(undefined)
  downloadUpdate = vi.fn().mockResolvedValue(undefined)
  quitAndInstall = vi.fn()
}

function setup(overrides: Partial<AppSettings> = {}) {
  const updater = new FakeUpdater()
  const notices: UpdateNotice[] = []
  let settings = settingsFactory({ updateCheckOnStartup: true, updateAutoInstall: false, ...overrides })
  const timers: { fn: () => void; ms: number; repeat: boolean }[] = []
  const manager = new UpdateManager({
    updater,
    notify: (n) => notices.push(n),
    getSettings: () => settings,
    currentVersion: '0.2.0',
    schedule: (fn, ms) => timers.push({ fn, ms, repeat: false }),
    repeat: (fn, ms) => timers.push({ fn, ms, repeat: true })
  })
  const setSettings = (s: Partial<AppSettings>) => {
    settings = { ...settings, ...s }
  }
  return { updater, notices, manager, timers, setSettings }
}

describe('UpdateManager', () => {
  it('agenda a verificação ao iniciar (com atraso) e a cada 24 h', () => {
    const { manager, timers, updater } = setup()
    manager.start()
    expect(timers).toEqual([
      expect.objectContaining({ ms: STARTUP_DELAY_MS, repeat: false }),
      expect.objectContaining({ ms: RECHECK_INTERVAL_MS, repeat: true })
    ])
    timers[0].fn()
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(1)
  })

  it('não verifica sozinho quando a opção está desligada', () => {
    const { manager, timers, updater } = setup({ updateCheckOnStartup: false })
    manager.start()
    timers.forEach((t) => t.fn())
    expect(updater.checkForUpdates).not.toHaveBeenCalled()
  })

  it('sem instalação automática: avisa a versão nova e baixa ao clicar', async () => {
    const { manager, updater, notices } = setup()
    await manager.check(false)
    expect(updater.autoDownload).toBe(false)
    updater.emit('update-available', { version: '0.3.0' })

    expect(notices[0].title).toBe('ArcanShot 0.3.0 disponível')
    expect(notices[0].body).toContain('0.2.0')
    notices[0].onClick?.()
    expect(updater.downloadUpdate).toHaveBeenCalledTimes(1)

    updater.emit('update-downloaded', { version: '0.3.0' })
    const ready = notices.at(-1)!
    expect(ready.title).toBe('ArcanShot 0.3.0 pronto para instalar')
    expect(updater.autoInstallOnAppQuit).toBe(true)
    ready.onClick?.()
    expect(updater.quitAndInstall).toHaveBeenCalledWith(false, true)
  })

  it('com instalação automática: baixa sem perguntar e só avisa quando está pronto', async () => {
    const { manager, updater, notices } = setup({ updateAutoInstall: true })
    await manager.check(false)
    expect(updater.autoDownload).toBe(true)
    expect(updater.autoInstallOnAppQuit).toBe(true)
    updater.emit('update-available', { version: '0.3.0' })
    expect(notices).toHaveLength(0)
    updater.emit('update-downloaded', { version: '0.3.0' })
    expect(notices).toHaveLength(1)
    expect(notices[0].title).toContain('pronto para instalar')
  })

  it('verificação automática sem novidade ou com erro (ex.: offline) fica em silêncio', async () => {
    const { manager, updater, notices } = setup()
    await manager.check(false)
    updater.emit('update-not-available', { version: '0.2.0' })
    updater.checkForUpdates.mockRejectedValueOnce(new Error('net::ERR_INTERNET_DISCONNECTED'))
    await manager.check(false)
    expect(notices).toHaveLength(0)
  })

  it('verificação manual responde quando já está atualizado e quando falha', async () => {
    const { manager, updater, notices } = setup()
    await manager.check(true)
    updater.emit('update-not-available', { version: '0.2.0' })
    expect(notices.at(-1)!.body).toBe('Você já está na versão mais recente (0.2.0).')

    updater.checkForUpdates.mockRejectedValueOnce(new Error('timeout'))
    await manager.check(true)
    expect(notices.at(-1)!.body).toContain('Não foi possível verificar')
  })

  it('avisa quando o download pedido pelo usuário falha', async () => {
    const { manager, updater, notices } = setup()
    await manager.check(false)
    updater.emit('update-available', { version: '0.3.0' })
    notices[0].onClick?.()
    updater.emit('error', new Error('ECONNRESET'))
    expect(notices.at(-1)!.body).toContain('Não foi possível baixar')
  })

  it('com a versão já baixada, a verificação manual oferece reiniciar em vez de checar de novo', async () => {
    const { manager, updater, notices } = setup({ updateAutoInstall: true })
    await manager.check(false)
    updater.emit('update-downloaded', { version: '0.3.0' })
    await manager.check(true)
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(1)
    expect(notices.at(-1)!.title).toContain('pronto para instalar')
  })

  it('configure() reflete mudança de preferência sem perder instalação já baixada', async () => {
    const { manager, updater, setSettings } = setup({ updateAutoInstall: true })
    await manager.check(false)
    updater.emit('update-downloaded', { version: '0.3.0' })
    setSettings({ updateAutoInstall: false })
    manager.configure()
    expect(updater.autoDownload).toBe(false)
    expect(updater.autoInstallOnAppQuit).toBe(true)
  })
})

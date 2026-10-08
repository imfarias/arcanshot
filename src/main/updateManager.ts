import type { AppSettings } from '@shared/types'

/** Subconjunto do `autoUpdater` do electron-updater que usamos (permite fake nos testes). */
export interface UpdaterLike {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  on(event: 'update-available' | 'update-not-available' | 'update-downloaded', cb: (info: { version: string }) => void): unknown
  on(event: 'error', cb: (err: Error) => void): unknown
  checkForUpdates(): Promise<unknown>
  downloadUpdate(): Promise<unknown>
  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void
}

export interface UpdateNotice {
  title: string
  body: string
  onClick?: () => void
}

export interface UpdateManagerDeps {
  updater: UpdaterLike
  notify: (notice: UpdateNotice) => void
  getSettings: () => AppSettings
  currentVersion: string
  schedule?: (fn: () => void, ms: number) => unknown
  repeat?: (fn: () => void, ms: number) => unknown
  log?: (msg: string) => void
}

/** Primeira verificação após o boot: dá tempo do Windows terminar o login. */
export const STARTUP_DELAY_MS = 15_000
/** App fica dias na bandeja: confere de novo uma vez por dia. */
export const RECHECK_INTERVAL_MS = 24 * 60 * 60 * 1000

/**
 * Verifica atualizações nas Releases do GitHub e avisa o usuário.
 * - `updateCheckOnStartup`: confere ao iniciar (e a cada 24 h) e notifica versão nova.
 * - `updateAutoInstall`: baixa em segundo plano e instala ao sair do app.
 * Sem a opção de instalar automaticamente, clicar no aviso baixa e prepara a instalação.
 */
export class UpdateManager {
  private manualCheck = false
  private downloading = false
  private userDownload = false
  private readyVersion: string | null = null

  constructor(private readonly deps: UpdateManagerDeps) {
    const { updater } = deps
    this.configure()
    updater.on('update-available', (info) => this.onAvailable(info.version))
    updater.on('update-not-available', () => this.onNotAvailable())
    updater.on('update-downloaded', (info) => this.onDownloaded(info.version))
    updater.on('error', (err) => this.onError(err))
  }

  /** Reaplica as preferências (chamado também quando as configurações mudam). */
  configure(): void {
    const auto = this.deps.getSettings().updateAutoInstall
    this.deps.updater.autoDownload = auto
    // Se o usuário já pediu para baixar, instala ao sair mesmo com o automático desligado.
    this.deps.updater.autoInstallOnAppQuit = auto || this.readyVersion !== null
  }

  /** Agenda a verificação de inicialização e a periódica, se habilitadas. */
  start(): void {
    const schedule = this.deps.schedule ?? setTimeout
    const repeat = this.deps.repeat ?? setInterval
    const auto = () => {
      if (this.deps.getSettings().updateCheckOnStartup) void this.check(false)
    }
    schedule(auto, STARTUP_DELAY_MS)
    repeat(auto, RECHECK_INTERVAL_MS)
  }

  /** `manual` = pedido pelo menu da bandeja: responde também quando não há novidade ou dá erro. */
  async check(manual: boolean): Promise<void> {
    if (this.readyVersion) {
      if (manual) this.noticeReady(this.readyVersion)
      return
    }
    this.manualCheck = manual
    this.configure()
    try {
      await this.deps.updater.checkForUpdates()
    } catch (err) {
      this.onError(err instanceof Error ? err : new Error(String(err)))
    }
  }

  private onAvailable(version: string): void {
    if (this.deps.updater.autoDownload) {
      this.downloading = true
      if (this.manualCheck) {
        this.deps.notify({ title: 'ArcanShot — atualização encontrada', body: `Baixando a versão ${version}…` })
      }
      return
    }
    this.deps.notify({
      title: `ArcanShot ${version} disponível`,
      body: `Você está na ${this.deps.currentVersion}. Clique para baixar e instalar.`,
      onClick: () => this.download()
    })
  }

  private download(): void {
    if (this.downloading) return
    this.downloading = true
    this.userDownload = true
    this.deps.notify({ title: 'ArcanShot', body: 'Baixando a atualização…' })
    this.deps.updater.downloadUpdate().catch((err: unknown) => {
      this.onError(err instanceof Error ? err : new Error(String(err)))
    })
  }

  private onNotAvailable(): void {
    if (this.manualCheck) {
      this.deps.notify({ title: 'ArcanShot', body: `Você já está na versão mais recente (${this.deps.currentVersion}).` })
    }
    this.manualCheck = false
  }

  private onDownloaded(version: string): void {
    this.downloading = false
    this.userDownload = false
    this.readyVersion = version
    this.deps.updater.autoInstallOnAppQuit = true
    this.noticeReady(version)
  }

  private noticeReady(version: string): void {
    this.deps.notify({
      title: `ArcanShot ${version} pronto para instalar`,
      body: 'Clique para reiniciar agora, ou a atualização será instalada quando você sair do app.',
      onClick: () => this.deps.updater.quitAndInstall(false, true)
    })
  }

  private onError(err: Error): void {
    this.deps.log?.(`[update] ${err.message}`)
    // Falha silenciosa na verificação automática (ex.: sem internet); só avisa quando foi pedido
    if (this.userDownload) {
      this.deps.notify({ title: 'ArcanShot', body: 'Não foi possível baixar a atualização. Tente novamente mais tarde.' })
    } else if (this.manualCheck) {
      this.deps.notify({ title: 'ArcanShot', body: 'Não foi possível verificar atualizações. Tente novamente mais tarde.' })
    }
    this.downloading = false
    this.userDownload = false
    this.manualCheck = false
  }
}

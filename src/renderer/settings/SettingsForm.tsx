import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { AppSettings, FieldErrors } from '@shared/types'
import { validateSettings } from '@shared/settings'
import { formatFilename } from '@shared/filenamePattern'
import { HotkeyInput } from './HotkeyInput'

type Status = 'loading' | 'ready' | 'saving' | 'saved' | 'error'

const FIELD_ORDER: (keyof AppSettings)[] = [
  'saveDir',
  'filenamePattern',
  'imageFormat',
  'jpgQuality',
  'hotkeyArea',
  'hotkeyFull',
  'hotkeyAll'
]

function errorTestId(field: string): string {
  return `settings-error-${field.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`
}

export function SettingsForm(): ReactNode {
  const [status, setStatus] = useState<Status>('loading')
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    void window.arcanshot
      .getSettings()
      .then((s) => {
        setSettings(s)
        setStatus('ready')
      })
      .catch(() => {
        setGlobalError('Não foi possível carregar as configurações')
        setStatus('error')
      })
  }, [])

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    setSettings((s) => (s ? { ...s, [key]: value } : s))
    setErrors((e) => ({ ...e, [key]: undefined }))
    setStatus((st) => (st === 'saved' ? 'ready' : st))
  }

  function focusFirstInvalid(fieldErrors: FieldErrors): void {
    const first = FIELD_ORDER.find((f) => fieldErrors[f])
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`#${first}`)?.focus()
    }
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!settings) return
    setGlobalError(null)

    const localErrors = validateSettings(settings)
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors)
      focusFirstInvalid(localErrors)
      return
    }

    setStatus('saving')
    try {
      const result = await window.arcanshot.saveSettings(settings)
      if (result.ok) {
        setSettings(result.settings)
        setErrors({})
        setStatus('saved')
      } else {
        setErrors(result.fieldErrors)
        focusFirstInvalid(result.fieldErrors)
        setStatus('ready')
      }
    } catch {
      setGlobalError('Erro ao salvar as configurações. Tente novamente.')
      setStatus('ready')
    }
  }

  async function handlePickDir(): Promise<void> {
    const result = await window.arcanshot.pickDirectory()
    if (result.path) update('saveDir', result.path)
  }

  if (status === 'loading') {
    return (
      <p data-testid="settings-loading" role="status">
        Carregando configurações…
      </p>
    )
  }
  if (!settings) {
    return (
      <p data-testid="settings-global-error" role="alert">
        {globalError}
      </p>
    )
  }

  const preview = formatFilename(settings.filenamePattern, new Date())

  function fieldError(field: keyof AppSettings): ReactNode {
    const message = errors[field]
    if (!message) return null
    return (
      <p className="field-error" id={`${field}-error`} data-testid={errorTestId(field)}>
        {message}
      </p>
    )
  }

  return (
    <form
      ref={formRef}
      data-testid="settings-form"
      onSubmit={(e) => void handleSubmit(e)}
      noValidate
    >
      <h1>Configurações</h1>

      <fieldset>
        <legend>Salvamento</legend>

        <div className="field">
          <label htmlFor="saveDir">Pasta padrão para salvar</label>
          <div className="row">
            <input
              id="saveDir"
              data-testid="settings-save-dir"
              type="text"
              readOnly
              value={settings.saveDir}
              aria-describedby={errors.saveDir ? 'saveDir-error' : undefined}
              aria-invalid={!!errors.saveDir}
            />
            <button
              type="button"
              data-testid="settings-pick-dir"
              aria-label="Escolher pasta"
              onClick={() => void handlePickDir()}
            >
              Escolher…
            </button>
          </div>
          {fieldError('saveDir')}
        </div>

        <div className="field">
          <label htmlFor="filenamePattern">Nome padrão do arquivo</label>
          <input
            id="filenamePattern"
            data-testid="settings-filename-pattern"
            type="text"
            maxLength={120}
            value={settings.filenamePattern}
            onChange={(e) => update('filenamePattern', e.target.value)}
            aria-describedby={
              'filenamePattern-help' + (errors.filenamePattern ? ' filenamePattern-error' : '')
            }
            aria-invalid={!!errors.filenamePattern}
          />
          <p className="help" id="filenamePattern-help">
            Tokens: %Y ano · %m mês · %d dia · %H hora · %M minuto · %S segundo
          </p>
          <p className="preview" role="status" data-testid="settings-filename-preview">
            Exemplo: {preview}.{settings.imageFormat}
          </p>
          {fieldError('filenamePattern')}
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="imageFormat">Formato da imagem</label>
            <select
              id="imageFormat"
              data-testid="settings-image-format"
              value={settings.imageFormat}
              onChange={(e) => update('imageFormat', e.target.value as 'png' | 'jpg')}
            >
              <option value="png">PNG (sem perda)</option>
              <option value="jpg">JPG</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="jpgQuality">Qualidade JPG (1–100)</label>
            <input
              id="jpgQuality"
              data-testid="settings-jpg-quality"
              type="number"
              min={1}
              max={100}
              disabled={settings.imageFormat !== 'jpg'}
              value={settings.jpgQuality}
              onChange={(e) => update('jpgQuality', Number(e.target.value))}
              aria-describedby={errors.jpgQuality ? 'jpgQuality-error' : undefined}
              aria-invalid={!!errors.jpgQuality}
            />
            {fieldError('jpgQuality')}
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Atalhos globais</legend>

        <div className="field">
          <label htmlFor="hotkeyArea">Capturar área</label>
          <HotkeyInput
            id="hotkeyArea"
            data-testid="settings-hotkey-area"
            value={settings.hotkeyArea}
            onChange={(v) => update('hotkeyArea', v)}
            aria-describedby={errors.hotkeyArea ? 'hotkeyArea-error' : undefined}
            aria-invalid={!!errors.hotkeyArea}
          />
          {fieldError('hotkeyArea')}
        </div>

        <div className="field">
          <label htmlFor="hotkeyFull">Capturar tela atual</label>
          <HotkeyInput
            id="hotkeyFull"
            data-testid="settings-hotkey-full"
            value={settings.hotkeyFull}
            onChange={(v) => update('hotkeyFull', v)}
            aria-describedby={errors.hotkeyFull ? 'hotkeyFull-error' : undefined}
            aria-invalid={!!errors.hotkeyFull}
          />
          {fieldError('hotkeyFull')}
        </div>

        <div className="field">
          <label htmlFor="hotkeyAll">Capturar todos os monitores</label>
          <HotkeyInput
            id="hotkeyAll"
            data-testid="settings-hotkey-all"
            value={settings.hotkeyAll}
            onChange={(v) => update('hotkeyAll', v)}
            aria-describedby={errors.hotkeyAll ? 'hotkeyAll-error' : undefined}
            aria-invalid={!!errors.hotkeyAll}
          />
          {fieldError('hotkeyAll')}
        </div>
      </fieldset>

      <fieldset>
        <legend>Comportamento</legend>

        <div className="field checkbox">
          <input
            id="launchOnStartup"
            data-testid="settings-launch-on-startup"
            type="checkbox"
            checked={settings.launchOnStartup}
            onChange={(e) => update('launchOnStartup', e.target.checked)}
          />
          <label htmlFor="launchOnStartup">Iniciar com o Windows</label>
        </div>

        <div className="field checkbox">
          <input
            id="updateCheckOnStartup"
            data-testid="settings-update-check"
            type="checkbox"
            checked={settings.updateCheckOnStartup}
            onChange={(e) => update('updateCheckOnStartup', e.target.checked)}
          />
          <label htmlFor="updateCheckOnStartup">Verificar atualizações ao iniciar e avisar quando houver versão nova</label>
        </div>

        <div className="field checkbox">
          <input
            id="updateAutoInstall"
            data-testid="settings-update-auto-install"
            type="checkbox"
            checked={settings.updateAutoInstall}
            disabled={!settings.updateCheckOnStartup}
            aria-describedby="updateAutoInstall-help"
            onChange={(e) => update('updateAutoInstall', e.target.checked)}
          />
          <label htmlFor="updateAutoInstall">Baixar e instalar atualizações automaticamente</label>
          <span id="updateAutoInstall-help" className="help">
            A versão nova é baixada em segundo plano e instalada quando você sair do ArcanShot.
          </span>
        </div>

        <div className="field checkbox">
          <input
            id="copyOnSave"
            data-testid="settings-copy-on-save"
            type="checkbox"
            checked={settings.copyOnSave}
            onChange={(e) => update('copyOnSave', e.target.checked)}
          />
          <label htmlFor="copyOnSave">Copiar para o clipboard ao salvar</label>
        </div>

        <div className="field checkbox">
          <input
            id="showNotifications"
            data-testid="settings-show-notifications"
            type="checkbox"
            checked={settings.showNotifications}
            onChange={(e) => update('showNotifications', e.target.checked)}
          />
          <label htmlFor="showNotifications">Exibir notificações</label>
        </div>

        <div className="field">
          <label htmlFor="sequenceTimeoutSec">Tempo entre prints na sequência (segundos)</label>
          <input
            id="sequenceTimeoutSec"
            data-testid="settings-sequenceTimeoutSec"
            type="number"
            min={2}
            max={60}
            value={settings.sequenceTimeoutSec}
            onChange={(e) => update('sequenceTimeoutSec', Number(e.target.value))}
            aria-describedby={
              'sequenceTimeoutSec-help' +
              (errors.sequenceTimeoutSec ? ' sequenceTimeoutSec-error' : '')
            }
            aria-invalid={!!errors.sequenceTimeoutSec}
          />
          <p className="help" id="sequenceTimeoutSec-help">
            Após tirar um print, aguarda esse tempo antes de abrir a galeria com todos os prints da sessão.
          </p>
          {fieldError('sequenceTimeoutSec')}
        </div>
      </fieldset>

      {globalError && (
        <p className="field-error" role="alert" data-testid="settings-global-error">
          {globalError}
        </p>
      )}
      {status === 'saved' && (
        <p className="success" role="status" data-testid="settings-success">
          Configurações salvas
        </p>
      )}

      <div className="actions">
        <button type="submit" data-testid="settings-save" disabled={status === 'saving'}>
          {status === 'saving' ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

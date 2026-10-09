import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'

let app: ElectronApplication
let page: Page
let userDataDir: string

test.beforeEach(async () => {
  userDataDir = mkdtempSync(join(tmpdir(), 'arcanshot-e2e-'))
  app = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      ARCANSHOT_USER_DATA: userDataDir,
      ARCANSHOT_OPEN_SETTINGS: '1'
    }
  })
  page = await app.firstWindow()
})

test.afterEach(async () => {
  await app.close()
  rmSync(userDataDir, { recursive: true, force: true })
})

test('CT-E2E-01: app inicia e abre a janela de configurações', async () => {
  await expect(page).toHaveTitle(/Configurações/)
  await expect(page.getByTestId('settings-form')).toBeVisible()
  await expect(page.getByTestId('settings-filename-pattern')).toHaveValue(
    'Captura_%Y-%m-%d_%H-%M-%S'
  )
})

test('CT-E2E-02: salvar configurações persiste em settings.json no disco', async () => {
  const pattern = page.getByTestId('settings-filename-pattern')
  await pattern.fill('Shot_%Y%m%d')
  await page.getByTestId('settings-save').click()
  await expect(page.getByTestId('settings-success')).toBeVisible()

  const settingsPath = join(userDataDir, 'settings.json')
  expect(existsSync(settingsPath)).toBe(true)
  const onDisk = JSON.parse(readFileSync(settingsPath, 'utf-8'))
  expect(onDisk.filenamePattern).toBe('Shot_%Y%m%d')
})

test('CT-E2E-03: padrão inválido mostra erro e não persiste', async () => {
  const pattern = page.getByTestId('settings-filename-pattern')
  await pattern.fill('')
  await page.getByTestId('settings-save').click()
  await expect(page.getByTestId('settings-error-filename-pattern')).toBeVisible()
  expect(existsSync(join(userDataDir, 'settings.json'))).toBe(false)
})

test('CT-E2E-04: opção de páginas do PDF com o mesmo tamanho persiste em settings.json (0009)', async () => {
  const option = page.getByTestId('settings-pdf-uniform-size')
  await expect(option).not.toBeChecked()
  await option.check()
  await page.getByTestId('settings-save').click()
  await expect(page.getByTestId('settings-success')).toBeVisible()

  const onDisk = JSON.parse(readFileSync(join(userDataDir, 'settings.json'), 'utf-8'))
  expect(onDisk.pdfUniformSize).toBe(true)
})

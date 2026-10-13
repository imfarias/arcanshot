import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { dataUrlToBuffer } from './saveImage'

// OCR do print (0012) com o reconhecedor do próprio Windows (Windows.Media.Ocr), chamado por
// um PowerShell temporário: offline, sem dependência nova e sem crescer o instalador.
// Sem Electron aqui, para testar com o Windows real.

export type OcrOutcome =
  | { ok: true; text: string; language: string }
  | { ok: false; reason: 'empty' | 'unavailable' | 'error'; error?: string }

/** O reconhecedor do Windows recusa imagens maiores que isso (OcrEngine.MaxImageDimension = 10000). */
export const OCR_MAX_DIMENSION = 8000
const TIMEOUT_MS = 30_000

/** Largura e altura de um PNG, lidas do cabeçalho IHDR. null se não for PNG. */
export function readPngSize(buf: Buffer): { width: number; height: number } | null {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (buf.length < 24 || !buf.subarray(0, 8).equals(signature)) return null
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

/** Fator para caber no limite do reconhecedor; 1 quando já cabe (nunca amplia). */
export function ocrScale(width: number, height: number): number {
  const longest = Math.max(width, height)
  return longest > OCR_MAX_DIMENSION ? OCR_MAX_DIMENSION / longest : 1
}

/**
 * Script do PowerShell 5.1. Recebe o caminho do PNG e o fator de escala por variável de ambiente
 * (nada de dado da pessoa vai para a linha de comando) e responde UM objeto JSON em UTF-8.
 */
const SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
function Out-Json($o) { [Console]::Out.Write(($o | ConvertTo-Json -Compress)) }
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
  $null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime]
  $null = [Windows.Graphics.Imaging.BitmapTransform, Windows.Foundation, ContentType = WindowsRuntime]
  $null = [Windows.Graphics.Imaging.BitmapPixelFormat, Windows.Foundation, ContentType = WindowsRuntime]
  $null = [Windows.Graphics.Imaging.BitmapAlphaMode, Windows.Foundation, ContentType = WindowsRuntime]
  $null = [Windows.Graphics.Imaging.ExifOrientationMode, Windows.Foundation, ContentType = WindowsRuntime]
  $null = [Windows.Graphics.Imaging.ColorManagementMode, Windows.Foundation, ContentType = WindowsRuntime]
  $null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
  $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -like 'IAsyncOperation*' })[0]
  function Await($op, $type) {
    $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op))
    $t.Wait(-1) | Out-Null
    $t.Result
  }

  $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
  if ($null -eq $engine) {
    foreach ($lang in [Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages) {
      $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)
      if ($null -ne $engine) { break }
    }
  }
  if ($null -eq $engine) { Out-Json @{ status = 'unavailable' }; exit 0 }

  $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($env:ARCANSHOT_OCR_PATH)) ([Windows.Storage.StorageFile])
  $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])

  $scale = [double]::Parse($env:ARCANSHOT_OCR_SCALE, [Globalization.CultureInfo]::InvariantCulture)
  $transform = New-Object Windows.Graphics.Imaging.BitmapTransform
  $transform.ScaledWidth = [uint32][Math]::Max(1, [Math]::Round($decoder.PixelWidth * $scale))
  $transform.ScaledHeight = [uint32][Math]::Max(1, [Math]::Round($decoder.PixelHeight * $scale))
  $bitmap = Await ($decoder.GetSoftwareBitmapAsync(
      [Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8,
      [Windows.Graphics.Imaging.BitmapAlphaMode]::Premultiplied,
      $transform,
      [Windows.Graphics.Imaging.ExifOrientationMode]::IgnoreExifOrientation,
      [Windows.Graphics.Imaging.ColorManagementMode]::DoNotColorManage)) ([Windows.Graphics.Imaging.SoftwareBitmap])

  $result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
  $lines = @($result.Lines | ForEach-Object { $_.Text })
  Out-Json @{ status = 'ok'; language = $engine.RecognizerLanguage.LanguageTag; text = ($lines -join [string][char]10) }
} catch {
  Out-Json @{ status = 'error'; message = $_.Exception.Message }
}
`

/** Interpreta a resposta JSON do script; qualquer coisa fora do combinado vira erro. */
export function parseOcrOutput(stdout: string): OcrOutcome {
  let data: unknown
  try {
    data = JSON.parse(stdout.trim())
  } catch {
    return { ok: false, reason: 'error', error: 'Resposta inválida do OCR do Windows' }
  }
  if (!data || typeof data !== 'object') {
    return { ok: false, reason: 'error', error: 'Resposta inválida do OCR do Windows' }
  }
  const r = data as Record<string, unknown>
  if (r.status === 'unavailable') return { ok: false, reason: 'unavailable' }
  if (r.status === 'error') {
    return { ok: false, reason: 'error', error: typeof r.message === 'string' ? r.message : undefined }
  }
  if (r.status === 'ok' && typeof r.text === 'string') {
    const text = r.text.replace(/\r\n/g, '\n').trim()
    if (text.length === 0) return { ok: false, reason: 'empty' }
    return { ok: true, text, language: typeof r.language === 'string' ? r.language : '' }
  }
  return { ok: false, reason: 'error', error: 'Resposta inesperada do OCR do Windows' }
}

function powershellPath(): string {
  const root = process.env.SystemRoot ?? 'C:\\Windows'
  return join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
}

/** Lê o texto de uma imagem PNG/JPG (dataUrl). Nunca lança: falhas voltam como `ok: false`. */
export async function recognizeDataUrl(dataUrl: string): Promise<OcrOutcome> {
  if (process.platform !== 'win32') return { ok: false, reason: 'unavailable' }

  let png: Buffer
  try {
    png = dataUrlToBuffer(dataUrl)
  } catch (err) {
    return { ok: false, reason: 'error', error: err instanceof Error ? err.message : String(err) }
  }
  const size = readPngSize(png)
  const scale = size ? ocrScale(size.width, size.height) : 1

  // Arquivo temporário (o WinRT lê por caminho); sempre removido, com o texto da pessoa dentro.
  const file = join(tmpdir(), `arcanshot-ocr-${randomUUID()}.png`)
  try {
    writeFileSync(file, png)
    const encoded = Buffer.from(SCRIPT, 'utf16le').toString('base64')
    return await new Promise<OcrOutcome>((resolve) => {
      const child = spawn(
        powershellPath(),
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
        {
          windowsHide: true,
          env: {
            ...process.env,
            ARCANSHOT_OCR_PATH: file,
            ARCANSHOT_OCR_SCALE: String(scale)
          }
        }
      )
      const out: Buffer[] = []
      const timer = setTimeout(() => {
        child.kill()
        resolve({ ok: false, reason: 'error', error: 'O OCR demorou demais' })
      }, TIMEOUT_MS)
      child.stdout.on('data', (d: Buffer) => out.push(d))
      child.on('error', (err) => {
        clearTimeout(timer)
        resolve({ ok: false, reason: 'unavailable', error: err.message })
      })
      child.on('close', () => {
        clearTimeout(timer)
        resolve(parseOcrOutput(Buffer.concat(out).toString('utf8')))
      })
    })
  } catch (err) {
    return { ok: false, reason: 'error', error: err instanceof Error ? err.message : String(err) }
  } finally {
    rmSync(file, { force: true })
  }
}

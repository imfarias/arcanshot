// Gera a narração do vídeo de apresentação (site/promo/narration/<id>.wav) com o Piper,
// um TTS neural open source que roda local. Requer `uv` (https://docs.astral.sh/uv/).
// Uso: node scripts/promo/narrate.mjs [--voice pt_BR-faber-medium] [--only intro,outro]
// Para trocar por uma gravação da sua voz, basta substituir os .wav (mesmo nome).
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const narrationDir = join(root, 'site/promo/narration')
const voicesDir = join(root, 'node_modules/.cache/piper-voices')
const script = JSON.parse(readFileSync(join(narrationDir, 'script.json'), 'utf8'))

const args = process.argv.slice(2)
const flag = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const voice = flag('--voice') ?? script.voice
const only = flag('--only')?.split(',')

const isWin = process.platform === 'win32'
// shell no Windows (uvx é .exe no PATH via shim); caminhos com espaço precisam de aspas
const q = (p) => (isWin ? `"${p}"` : p)

function uvx(cmdArgs, opts = {}) {
  const r = spawnSync('uvx', ['--from', 'piper-tts', ...cmdArgs], {
    encoding: 'utf8',
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: isWin,
    // stdin do Python no Windows usa o codepage local; força UTF-8 p/ acentos
    env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' },
    ...opts
  })
  if (r.status !== 0) throw new Error(`falhou: uvx ${cmdArgs.join(' ')}`)
}

mkdirSync(voicesDir, { recursive: true })
const model = join(voicesDir, `${voice}.onnx`)
if (!existsSync(model)) {
  console.log(`Baixando voz ${voice}...`)
  uvx(['python', '-m', 'piper.download_voices', voice], { cwd: voicesDir })
}

for (const line of script.lines) {
  if (only && !only.includes(line.id)) continue
  const out = join(narrationDir, `${line.id}.wav`)
  uvx(
    ['piper', '-m', q(model), '-f', q(out), '--length-scale', String(script.lengthScale ?? 1)],
    { input: line.speak }
  )
  console.log(`✓ ${line.id}.wav`)
}

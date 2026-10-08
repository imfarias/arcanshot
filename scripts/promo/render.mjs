// Renderiza o vídeo de apresentação (site/promo) para arquivos, quadro a quadro:
// imagem via <canvas> no Chromium headless (Playwright) e áudio via OfflineAudioContext.
// Saída em site/promo/dist/:
//   arcanshot-promo.mp4 / .webm  → vídeo completo (narração, música, legendas)
//   arcanshot-hero.mp4 / .webm   → loop mudo, sem legendas, p/ fundo do hero do site
//   arcanshot-hero-poster.webp   → quadro representativo (poster / prefers-reduced-motion)
// Uso: node scripts/promo/render.mjs [--fps 30] [--only promo|hero] [--stills 3,12.5,40]
// Requer ffmpeg no PATH.
import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { extname, join, resolve, normalize } from 'node:path'

const root = resolve(import.meta.dirname, '../../site/promo')
const dist = join(root, 'dist')
const args = process.argv.slice(2)
const flag = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const fps = Number(flag('--fps') ?? 30)
const only = flag('--only')
const stills = flag('--stills')

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.wav': 'audio/wav' }
const server = createServer((req, res) => {
  const path = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)))
  if (!path.startsWith(root) || !existsSync(path)) {
    res.writeHead(404).end()
    return
  }
  res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' })
  res.end(readFileSync(path))
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}/index.html`

function ffmpeg(ffArgs, stdinFeeder) {
  return new Promise((res, rej) => {
    const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...ffArgs], {
      stdio: [stdinFeeder ? 'pipe' : 'ignore', 'inherit', 'inherit']
    })
    p.on('error', rej)
    p.on('close', (code) => (code === 0 ? res() : rej(new Error(`ffmpeg saiu com ${code}`))))
    if (stdinFeeder) stdinFeeder(p.stdin).catch(rej)
  })
}

const write = (stream, buf) =>
  new Promise((r) => (stream.write(buf) ? r() : stream.once('drain', r)))

mkdirSync(dist, { recursive: true })
// Chromium do Playwright; se não estiver baixado, usa o Chrome/Edge instalado
async function launch() {
  for (const channel of [undefined, 'chrome', 'msedge']) {
    try {
      return await chromium.launch({ channel })
    } catch (e) {
      if (channel === 'msedge') throw e
    }
  }
}
const browser = await launch()

async function openPage(captions) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  page.on('pageerror', (e) => console.error('page error:', e.message))
  await page.goto(`${base}?render=1&captions=${captions ? 1 : 0}`)
  await page.waitForFunction(() => window.promoReady === true, null, { timeout: 60000 })
  return page
}

async function renderVideo({ name, captions, audio, from = 0, to, crf, posterAt = null }) {
  const page = await openPage(captions)
  const total = await page.evaluate(() => window.promo.duration)
  const end = to ?? total
  const frames = Math.round((end - from) * fps)
  const tmpMp4 = join(dist, `${name}.mp4`)
  let wavPath = null
  if (audio) {
    process.stdout.write(`[${name}] renderizando áudio (OfflineAudioContext)... `)
    const b64 = await page.evaluate(() => window.promo.audioBase64())
    wavPath = join(dist, `${name}.wav`)
    writeFileSync(wavPath, Buffer.from(b64, 'base64'))
    console.log('ok')
  }
  const inputs = ['-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-']
  if (wavPath) inputs.push('-i', wavPath)
  const out = [
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    ...(wavPath ? ['-c:a', 'aac', '-b:a', '192k', '-shortest'] : ['-an']),
    tmpMp4
  ]
  const batch = 15
  await ffmpeg([...inputs, ...out], async (stdin) => {
    for (let i = 0; i < frames; i += batch) {
      const ts = [...Array(Math.min(batch, frames - i))].map((_, j) => from + (i + j) / fps)
      const imgs = await page.evaluate((list) => list.map((t) => window.promo.frame(t)), ts)
      for (const img of imgs) await write(stdin, Buffer.from(img, 'base64'))
      process.stdout.write(`\r[${name}] quadros ${Math.min(i + batch, frames)}/${frames}`)
    }
    stdin.end()
  })
  console.log(`\n[${name}] mp4 ok → ${tmpMp4}`)
  await page.close()
  const webm = join(dist, `${name}.webm`)
  await ffmpeg([
    '-i', tmpMp4,
    '-c:v', 'libvpx-vp9', '-crf', String(crf + 14), '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2',
    ...(wavPath ? ['-c:a', 'libopus', '-b:a', '128k'] : ['-an']),
    webm
  ])
  console.log(`[${name}] webm ok → ${webm}`)
  if (posterAt !== null) {
    await ffmpeg(['-ss', String(posterAt), '-i', tmpMp4, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '82', join(dist, `${name}-poster.webp`)])
    console.log(`[${name}] poster ok`)
  }
}

try {
  if (stills) {
    const page = await openPage(true)
    for (const t of stills.split(',').map(Number)) {
      const png = await page.evaluate((x) => window.promo.frame(x, 'image/png'), t)
      const file = join(dist, `still-${String(t).replace('.', '_')}.png`)
      writeFileSync(file, Buffer.from(png, 'base64'))
      console.log(file)
    }
    const tl = await page.evaluate(() =>
      window.promo.timeline.scenes.map((s) => `${s.id}@${s.start.toFixed(1)}+${s.dur.toFixed(1)}`)
    )
    console.log(tl.join('  '))
  } else {
    if (!only || only === 'promo') await renderVideo({ name: 'arcanshot-promo', captions: true, audio: true, crf: 18 })
    if (!only || only === 'hero') {
      // loop do hero: só a demonstração do produto (seleção → compartilhar), sem texto
      const page = await openPage(false)
      // começa e termina só no fundo → emenda sem corte; pôster = quadro com tudo anotado
      const { from, to, poster } = await page.evaluate(() => {
        const s = window.promo.timeline.byId
        return { from: s.select.start, to: s.outro.start, poster: s.privacy.start + 4 }
      })
      await page.close()
      await renderVideo({ name: 'arcanshot-hero', captions: false, audio: false, from, to, crf: 24, posterAt: poster - from })
    }
  }
} finally {
  await browser.close()
  server.close()
}

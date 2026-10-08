// Player ao vivo (AudioContext) + API window.promo usada por scripts/promo/render.mjs
import { load, drawFrame, buildMix, renderAudio } from './promo.js'

const params = new URLSearchParams(location.search)
const cv = document.getElementById('cv')
const ctx = cv.getContext('2d')
const opts = { captions: params.get('captions') !== '0' }
const { tl, narration } = await load('.')
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

// API usada por scripts/promo/render.mjs (export offline para MP4/WebM)
window.promo = {
  duration: tl.total,
  timeline: tl,
  frame(t, mime = 'image/jpeg', q = 0.95) {
    drawFrame(ctx, t, tl, opts)
    return cv.toDataURL(mime, q).split(',')[1]
  },
  async audioBase64() {
    const bytes = new Uint8Array(await renderAudio(tl, narration))
    let bin = ''
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    return btoa(bin)
  }
}

if (params.has('render')) {
  document.body.classList.add('render')
} else {
  const poster = Number(params.get('t') ?? tl.byId.outro.start + 4.6)
  drawFrame(ctx, poster, tl, opts)
  let actx = null
  let raf = 0
  const play = document.getElementById('play')
  const cc = document.getElementById('cc')
  const time = document.getElementById('time')
  cc.onclick = () => {
    opts.captions = !opts.captions
    cc.setAttribute('aria-pressed', String(opts.captions))
    cc.textContent = `Legendas: ${opts.captions ? 'ligadas' : 'desligadas'}`
  }
  play.onclick = async () => {
    if (actx) {
      cancelAnimationFrame(raf)
      await actx.close()
      actx = null
      play.textContent = '▶ Assistir com som'
      return
    }
    actx = new AudioContext({ latencyHint: 'playback' })
    const t0 = actx.currentTime + 0.15
    buildMix(actx, tl, narration, t0)
    play.textContent = '■ Parar'
    const tick = () => {
      if (!actx) return
      const t = actx.currentTime - t0
      drawFrame(ctx, Math.max(0, t), tl, opts)
      time.textContent = `${fmt(Math.max(0, t))} / ${fmt(tl.total)}`
      if (t < tl.total) raf = requestAnimationFrame(tick)
      else play.onclick()
    }
    tick()
  }
}
window.promoReady = true

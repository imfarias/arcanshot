// Trilha, efeitos e mixagem do vídeo — 100% Web Audio API.
// O mesmo grafo roda ao vivo (AudioContext, player do site) e offline
// (OfflineAudioContext, export para arquivo), então som e imagem saem idênticos.

export const BPM = 100
export const BEAT = 60 / BPM
export const BAR = BEAT * 4

// Fmaj7 – G6 – Am7 – C (IV–V–vi–I em Dó): progressão "pra cima", sem drama
const CHORDS = [
  { root: 41, pad: [53, 57, 60, 64] },
  { root: 43, pad: [55, 59, 62, 64] },
  { root: 45, pad: [57, 60, 64, 67] },
  { root: 36, pad: [55, 60, 64, 67] }
]
const ARP = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 3, 2, 1, 2]
// 16 semicolcheias: bumbo, caixa, chimbal
const KICK = [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0]
const SNARE = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]
const HAT = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1]

const midiHz = (m) => 440 * 2 ** ((m - 69) / 12)

function mulberry32(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function noiseBuffer(ctx, seconds, seed) {
  const rand = mulberry32(seed)
  const buf = ctx.createBuffer(1, Math.ceil(seconds * ctx.sampleRate), ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1
  return buf
}

function impulseResponse(ctx, seconds, decay) {
  const rand = mulberry32(7)
  const len = Math.ceil(seconds * ctx.sampleRate)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * (1 - i / len) ** decay
  }
  return buf
}

/**
 * Monta o grafo completo e agenda todos os eventos.
 * @param {BaseAudioContext} ctx
 * @param {object} tl timeline de promo.js ({ total, scenes, cues })
 * @param {Record<string, AudioBuffer>} narration buffers por id de cena
 * @param {number} t0 instante do contexto que corresponde ao tempo 0 do vídeo
 */
export function buildMix(ctx, tl, narration, t0) {
  const at = (t) => t0 + t
  const noise = noiseBuffer(ctx, 2, 42)

  // ── barramentos ───────────────────────────────────────────────
  const master = ctx.createGain()
  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -6
  limiter.knee.value = 4
  limiter.ratio.value = 12
  limiter.attack.value = 0.003
  limiter.release.value = 0.2
  master.connect(limiter).connect(ctx.destination)
  master.gain.setValueAtTime(0, at(0))
  // ~ -15 LUFS integrado, pico ~ -4 dBFS (margem p/ AAC/Opus)
  master.gain.linearRampToValueAtTime(0.56, at(0.4))
  master.gain.setValueAtTime(0.56, at(tl.total - 2.2))
  master.gain.linearRampToValueAtTime(0, at(tl.total))

  const reverb = ctx.createConvolver()
  reverb.buffer = impulseResponse(ctx, 2.6, 2.4)
  const reverbOut = ctx.createGain()
  reverbOut.gain.value = 0.32
  reverb.connect(reverbOut).connect(master)

  const music = ctx.createGain() // alvo do "ducking" sob a narração
  music.gain.value = 1
  const musicLevel = ctx.createGain()
  musicLevel.gain.value = 0.5
  music.connect(musicLevel).connect(master)

  const sfx = ctx.createGain()
  sfx.gain.value = 0.55
  sfx.connect(master)
  const sfxVerb = ctx.createGain()
  sfxVerb.gain.value = 0.25
  sfx.connect(sfxVerb).connect(reverb)

  // ── narração: limpeza + presença + compressão ─────────────────
  const voice = ctx.createGain()
  voice.gain.value = 1.15
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 90
  const presence = ctx.createBiquadFilter()
  presence.type = 'peaking'
  presence.frequency.value = 3200
  presence.Q.value = 0.9
  presence.gain.value = 3
  const warmth = ctx.createBiquadFilter()
  warmth.type = 'lowshelf'
  warmth.frequency.value = 220
  warmth.gain.value = 2
  const vcomp = ctx.createDynamicsCompressor()
  vcomp.threshold.value = -22
  vcomp.ratio.value = 3.5
  vcomp.attack.value = 0.005
  vcomp.release.value = 0.15
  voice.connect(hp).connect(warmth).connect(presence).connect(vcomp).connect(master)
  const voiceVerb = ctx.createGain()
  voiceVerb.gain.value = 0.08
  vcomp.connect(voiceVerb).connect(reverb)

  for (const s of tl.scenes) {
    const buf = narration[s.id]
    if (!buf) continue
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(voice)
    const start = s.start + s.narrStart
    src.start(at(start))
    // ducking: música abaixa enquanto alguém fala
    music.gain.setTargetAtTime(0.32, at(start - 0.15), 0.06)
    music.gain.setTargetAtTime(1, at(start + buf.duration + 0.1), 0.35)
  }

  // ── seções da música ──────────────────────────────────────────
  const drop = tl.byId.select.start
  const outro = tl.byId.outro.start
  const bars = Math.ceil(tl.total / BAR) + 1

  // pad: filtro abre durante a intro e fecha um pouco no final
  const padFilter = ctx.createBiquadFilter()
  padFilter.type = 'lowpass'
  padFilter.Q.value = 0.7
  padFilter.frequency.setValueAtTime(260, at(0))
  padFilter.frequency.exponentialRampToValueAtTime(1800, at(drop))
  padFilter.frequency.setValueAtTime(1800, at(outro))
  padFilter.frequency.exponentialRampToValueAtTime(900, at(tl.total))
  const padBus = ctx.createGain()
  padBus.gain.value = 0.16
  padFilter.connect(padBus)
  padBus.connect(music)
  const padVerb = ctx.createGain()
  padVerb.gain.value = 0.5
  padBus.connect(padVerb).connect(reverb)

  // arpejo com delay pontuado
  const arpBus = ctx.createGain()
  arpBus.gain.value = 0.11
  const arpLp = ctx.createBiquadFilter()
  arpLp.type = 'lowpass'
  arpLp.frequency.value = 3400
  arpBus.connect(arpLp).connect(music)
  const delay = ctx.createDelay(2)
  delay.delayTime.value = BEAT * 0.75
  const fb = ctx.createGain()
  fb.gain.value = 0.34
  const fbLp = ctx.createBiquadFilter()
  fbLp.type = 'lowpass'
  fbLp.frequency.value = 2200
  arpLp.connect(delay).connect(fbLp).connect(fb).connect(delay)
  const delayOut = ctx.createGain()
  delayOut.gain.value = 0.45
  fbLp.connect(delayOut).connect(music)
  arpLp.connect(reverb)

  const bassBus = ctx.createGain()
  bassBus.gain.value = 0.34
  bassBus.connect(music)
  const drumBus = ctx.createGain()
  drumBus.gain.value = 0.55
  drumBus.connect(music)

  for (let b = 0; b < bars; b++) {
    const barT = b * BAR
    if (barT >= tl.total) break
    const chord = CHORDS[b % 4]
    const isLast = barT + BAR >= tl.total - 0.01
    const inMain = barT >= drop - 0.01 && barT < outro - 0.01
    const inOutro = barT >= outro - 0.01

    // pad (sempre)
    for (const n of chord.pad) {
      for (const det of [-7, 7]) {
        const o = ctx.createOscillator()
        o.type = 'sawtooth'
        o.frequency.value = midiHz(n)
        o.detune.value = det
        const g = ctx.createGain()
        const end = isLast ? tl.total + 0.5 : barT + BAR + 0.9
        g.gain.setValueAtTime(0, at(barT))
        g.gain.linearRampToValueAtTime(0.5, at(barT + 0.5))
        g.gain.setValueAtTime(0.5, at(barT + BAR - 0.1))
        g.gain.linearRampToValueAtTime(0, at(end))
        o.connect(g).connect(padFilter)
        o.start(at(barT))
        o.stop(at(end + 0.05))
      }
    }

    // arpejo: entra na metade da intro, segue até o fim
    if (barT >= drop - BAR * 1 - 0.01) {
      for (let i = 0; i < 16; i++) {
        const t = barT + i * (BEAT / 4)
        if (t >= tl.total - 1.5) break
        const n = chord.pad[ARP[i]] + 12
        const o = ctx.createOscillator()
        o.type = i % 4 === 0 ? 'square' : 'triangle'
        o.frequency.value = midiHz(n)
        const g = ctx.createGain()
        const peak = (i % 4 === 0 ? 0.55 : 0.4) * (barT < drop ? 0.6 : 1)
        g.gain.setValueAtTime(0, at(t))
        g.gain.linearRampToValueAtTime(peak, at(t + 0.006))
        g.gain.exponentialRampToValueAtTime(0.001, at(t + 0.2))
        o.connect(g).connect(arpBus)
        o.start(at(t))
        o.stop(at(t + 0.25))
      }
    }

    // baixo em colcheias (main)
    if (inMain) {
      for (let i = 0; i < 8; i++) {
        const t = barT + i * (BEAT / 2)
        const f = midiHz(chord.root + (i === 7 ? 12 : 0))
        for (const type of ['sine', 'sawtooth']) {
          const o = ctx.createOscillator()
          o.type = type
          o.frequency.value = f
          const lp = ctx.createBiquadFilter()
          lp.type = 'lowpass'
          lp.frequency.setValueAtTime(900, at(t))
          lp.frequency.exponentialRampToValueAtTime(180, at(t + 0.25))
          const g = ctx.createGain()
          const peak = type === 'sine' ? 0.9 : 0.35
          g.gain.setValueAtTime(0, at(t))
          g.gain.linearRampToValueAtTime(peak, at(t + 0.01))
          g.gain.exponentialRampToValueAtTime(0.001, at(t + BEAT / 2 - 0.02))
          o.connect(lp).connect(g).connect(bassBus)
          o.start(at(t))
          o.stop(at(t + BEAT / 2))
        }
      }
    }

    // bateria (main); no outro só o bumbo do 1º tempo por 1 compasso
    if (inMain || (inOutro && barT < outro + BAR - 0.01)) {
      for (let i = 0; i < 16; i++) {
        const t = barT + i * (BEAT / 4)
        if (inOutro && i > 0) break
        if (KICK[i]) kick(ctx, drumBus, at(t))
        if (SNARE[i]) snare(ctx, drumBus, noise, at(t))
        if (HAT[i]) hat(ctx, drumBus, noise, at(t), i % 4 === 2 ? 0.16 : 0.08)
      }
    }
  }

  // ── efeitos sincronizados com a imagem ────────────────────────
  riser(ctx, sfx, noise, at(drop - BAR * 2), BAR * 2)
  impact(ctx, sfx, noise, at(drop))
  for (const s of tl.scenes) if (s.start > 0 && s.id !== 'select') whoosh(ctx, sfx, noise, at(s.start))
  for (const c of tl.cues) {
    if (c.type === 'key') keyClick(ctx, sfx, noise, at(c.t))
    if (c.type === 'pop') pop(ctx, sfx, at(c.t), c.pitch ?? 0)
    if (c.type === 'shutter') shutter(ctx, sfx, noise, at(c.t))
    if (c.type === 'chime') chime(ctx, sfx, at(c.t))
    if (c.type === 'swipe') whoosh(ctx, sfx, noise, at(c.t), 0.5)
  }
  impact(ctx, sfx, noise, at(outro))
}

// ── instrumentos/efeitos ────────────────────────────────────────
function kick(ctx, out, t) {
  const o = ctx.createOscillator()
  o.frequency.setValueAtTime(150, t)
  o.frequency.exponentialRampToValueAtTime(42, t + 0.13)
  const g = ctx.createGain()
  g.gain.setValueAtTime(1, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.38)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + 0.4)
}

function noiseHit(ctx, out, noise, t, { type, freq, q = 1, peak, decay, offset = 0 }) {
  const s = ctx.createBufferSource()
  s.buffer = noise
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  const g = ctx.createGain()
  g.gain.setValueAtTime(peak, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + decay)
  s.connect(f).connect(g).connect(out)
  s.start(t, offset)
  s.stop(t + decay + 0.02)
}

function snare(ctx, out, noise, t) {
  noiseHit(ctx, out, noise, t, { type: 'bandpass', freq: 1900, q: 0.7, peak: 0.55, decay: 0.2 })
  const o = ctx.createOscillator()
  o.frequency.setValueAtTime(210, t)
  o.frequency.exponentialRampToValueAtTime(140, t + 0.08)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.35, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + 0.12)
}

function hat(ctx, out, noise, t, peak) {
  noiseHit(ctx, out, noise, t, { type: 'highpass', freq: 8200, peak, decay: 0.05, offset: 0.5 })
}

function whoosh(ctx, out, noise, t, level = 1) {
  const dur = 0.55
  const s = ctx.createBufferSource()
  s.buffer = noise
  const f = ctx.createBiquadFilter()
  f.type = 'bandpass'
  f.Q.value = 1.4
  f.frequency.setValueAtTime(350, t - dur)
  f.frequency.exponentialRampToValueAtTime(4200, t)
  f.frequency.exponentialRampToValueAtTime(1200, t + 0.25)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.001, t - dur)
  g.gain.exponentialRampToValueAtTime(0.5 * level, t - 0.03)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
  s.connect(f).connect(g).connect(out)
  s.start(Math.max(0, t - dur), 0.2)
  s.stop(t + 0.32)
}

function riser(ctx, out, noise, t, dur) {
  const s = ctx.createBufferSource()
  s.buffer = noise
  s.loop = true
  const f = ctx.createBiquadFilter()
  f.type = 'bandpass'
  f.Q.value = 2
  f.frequency.setValueAtTime(300, t)
  f.frequency.exponentialRampToValueAtTime(6000, t + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.001, t)
  g.gain.exponentialRampToValueAtTime(0.28, t + dur - 0.02)
  g.gain.linearRampToValueAtTime(0, t + dur)
  s.connect(f).connect(g).connect(out)
  s.start(t)
  s.stop(t + dur + 0.02)
}

function impact(ctx, out, noise, t) {
  const o = ctx.createOscillator()
  o.frequency.setValueAtTime(90, t)
  o.frequency.exponentialRampToValueAtTime(30, t + 0.8)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.9, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 1.2)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + 1.25)
  noiseHit(ctx, out, noise, t, { type: 'highpass', freq: 3000, peak: 0.35, decay: 1.4 })
}

function keyClick(ctx, out, noise, t) {
  noiseHit(ctx, out, noise, t, { type: 'bandpass', freq: 3500, q: 3, peak: 0.9, decay: 0.035, offset: 1 })
  noiseHit(ctx, out, noise, t + 0.07, { type: 'bandpass', freq: 2600, q: 3, peak: 0.5, decay: 0.03, offset: 1.2 })
}

function pop(ctx, out, t, pitch) {
  const o = ctx.createOscillator()
  o.type = 'sine'
  const base = 660 * 2 ** (pitch / 12)
  o.frequency.setValueAtTime(base * 0.6, t)
  o.frequency.exponentialRampToValueAtTime(base, t + 0.04)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.6, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + 0.2)
}

function shutter(ctx, out, noise, t) {
  noiseHit(ctx, out, noise, t, { type: 'bandpass', freq: 2400, q: 1.5, peak: 0.8, decay: 0.05, offset: 0.3 })
  noiseHit(ctx, out, noise, t + 0.09, { type: 'bandpass', freq: 1700, q: 1.5, peak: 0.6, decay: 0.07, offset: 0.7 })
}

function chime(ctx, out, t) {
  ;[76, 83, 88].forEach((n, i) => {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = midiHz(n)
    const g = ctx.createGain()
    const s = t + i * 0.07
    g.gain.setValueAtTime(0.0001, s)
    g.gain.exponentialRampToValueAtTime(0.35, s + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, s + 0.9)
    o.connect(g).connect(out)
    o.start(s)
    o.stop(s + 0.95)
  })
}

/** AudioBuffer → WAV PCM 16-bit (ArrayBuffer). */
export function encodeWav(buffer) {
  const ch = buffer.numberOfChannels
  const len = buffer.length
  const out = new DataView(new ArrayBuffer(44 + len * ch * 2))
  const str = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF')
  out.setUint32(4, 36 + len * ch * 2, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  out.setUint32(16, 16, true)
  out.setUint16(20, 1, true)
  out.setUint16(22, ch, true)
  out.setUint32(24, buffer.sampleRate, true)
  out.setUint32(28, buffer.sampleRate * ch * 2, true)
  out.setUint16(32, ch * 2, true)
  out.setUint16(34, 16, true)
  str(36, 'data')
  out.setUint32(40, len * ch * 2, true)
  const data = [...Array(ch)].map((_, c) => buffer.getChannelData(c))
  let o = 44
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++) {
      const v = Math.max(-1, Math.min(1, data[c][i]))
      out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true)
      o += 2
    }
  }
  return out.buffer
}
